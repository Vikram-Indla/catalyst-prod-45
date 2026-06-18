// chat-unfurl — fetches OG metadata for up to 4 URLs and caches them in
// chat_link_previews. Idempotent: on every call we re-check the cache and
// only re-fetch URLs older than CACHE_TTL_MS or missing entirely.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_URLS = 4;
const FETCH_TIMEOUT_MS = 7_000;
const MAX_BODY_BYTES = 1_500_000; // 1.5 MB head — enough to find <meta> tags
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const USER_AGENT =
  "Mozilla/5.0 (compatible; CatalystUnfurl/1.0; +https://catalyst.app/bot)";

interface PreviewRow {
  url: string;
  domain: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  fetched_at: string;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function absoluteUrl(maybeRelative: string | null, base: string): string | null {
  if (!maybeRelative) return null;
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function pickMeta(html: string, properties: string[]): string | null {
  for (const prop of properties) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)\\s*=\\s*["']${prop}["'][^>]*content\\s*=\\s*["']([^"']+)["'][^>]*>`,
      "i",
    );
    const altRe = new RegExp(
      `<meta[^>]+content\\s*=\\s*["']([^"']+)["'][^>]*(?:property|name)\\s*=\\s*["']${prop}["'][^>]*>`,
      "i",
    );
    const m = html.match(re) ?? html.match(altRe);
    if (m?.[1]) return decodeEntities(m[1]).trim();
  }
  return null;
}

function pickTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return null;
  return decodeEntities(m[1]).trim().slice(0, 240);
}

async function fetchPreview(url: string): Promise<PreviewRow | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return null;
    }
    const reader = res.body?.getReader();
    if (!reader) return null;
    let received = 0;
    const chunks: Uint8Array[] = [];
    while (received < MAX_BODY_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
    }
    try { await reader.cancel(); } catch (_e) { /* noop */ }
    const html = new TextDecoder("utf-8", { fatal: false }).decode(
      concat(chunks).slice(0, MAX_BODY_BYTES),
    );
    const title =
      pickMeta(html, ["og:title", "twitter:title"]) ?? pickTitle(html);
    const description = pickMeta(html, [
      "og:description",
      "twitter:description",
      "description",
    ]);
    const imageRaw = pickMeta(html, [
      "og:image:secure_url",
      "og:image",
      "twitter:image",
    ]);
    const image_url = absoluteUrl(imageRaw, url);
    return {
      url,
      domain: domainOf(url),
      title: title ?? null,
      description: description ? description.slice(0, 480) : null,
      image_url,
      fetched_at: new Date().toISOString(),
    };
  } catch (_e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const incoming = Array.isArray(body?.urls) ? (body.urls as unknown[]) : [];
    const urls = Array.from(
      new Set(
        incoming
          .filter((u): u is string => typeof u === "string" && u.length > 0)
          .filter((u) => /^https?:\/\//i.test(u))
          .slice(0, MAX_URLS),
      ),
    );
    if (urls.length === 0) {
      return new Response(JSON.stringify({ previews: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read cache; keep entries newer than TTL.
    const { data: cachedRows } = await supabase
      .from("chat_link_previews")
      .select("url, domain, title, description, image_url, fetched_at")
      .in("url", urls);
    const cache = new Map<string, PreviewRow>();
    const now = Date.now();
    for (const r of cachedRows ?? []) {
      const row = r as PreviewRow;
      const age = now - new Date(row.fetched_at).getTime();
      if (age < CACHE_TTL_MS) cache.set(row.url, row);
    }

    const toFetch = urls.filter((u) => !cache.has(u));
    const fetched = await Promise.all(toFetch.map(fetchPreview));
    const upsertRows: PreviewRow[] = [];
    for (let i = 0; i < toFetch.length; i++) {
      const row = fetched[i];
      if (!row) {
        // Persist a domain-only stub so we don't hammer broken URLs.
        const stub: PreviewRow = {
          url: toFetch[i],
          domain: domainOf(toFetch[i]),
          title: null,
          description: null,
          image_url: null,
          fetched_at: new Date().toISOString(),
        };
        upsertRows.push(stub);
        cache.set(stub.url, stub);
      } else {
        upsertRows.push(row);
        cache.set(row.url, row);
      }
    }
    if (upsertRows.length > 0) {
      const { error: upErr } = await supabase
        .from("chat_link_previews")
        .upsert(upsertRows.map((r) => ({ ...r, updated_at: new Date().toISOString() })), {
          onConflict: "url",
        });
      if (upErr) {
        console.error("chat-unfurl upsert failed", upErr);
      }
    }

    const previews = urls.map((u) => cache.get(u) ?? {
      url: u,
      domain: domainOf(u),
      title: null,
      description: null,
      image_url: null,
      fetched_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ previews }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat-unfurl error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
