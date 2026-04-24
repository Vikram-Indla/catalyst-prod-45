// jira-issue-type-resolver — tier-3 fallback for For You mention/comment
// enrichment in src/hooks/useForYouData.ts.
//
// Catalyst mirrors Jira issues into two tables (ph_issues, catalyst_issues).
// When neither mirror has a key (e.g. an old SIMP ticket that fell outside
// wh-jira-bulk-sync's lookback window), the hook has nothing to enrich from
// and the work-item icon silently defaults to 'task' (blue checkbox).
//
// This function is the safety-net: the hook POSTs the missing keys here, we
// ask Jira directly for `issuetype` and `summary`, and return a compact map
// the hook merges into its local `issueByKey`. No writes to mirror tables —
// this is pure read-through.
//
// Input  (POST body):   { "keys": ["SIMP-1699", "SIMP-1706", ...] }
// Output (200):         { "SIMP-1699": { "issue_type": "QA Bug", "summary": "..." }, ... }
//
// Failures are per-key: if 2/3 keys resolve and 1 404s, the 1 is simply
// absent from the output map. Caller already falls back to 'task'.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Cap per request so a runaway caller can't hammer Jira. The JQL endpoint is
// limited to 100 results per page anyway.
const MAX_KEYS_PER_CALL = 50;

// Only accept well-formed issue keys. Anything else is dropped silently — we
// never pass user-supplied strings into JQL.
const ISSUE_KEY_RE = /^[A-Z][A-Z0-9_]{1,15}-\d{1,8}$/;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Parse + validate input.
    let body: { keys?: unknown } = {};
    try {
      body = await req.json();
    } catch (_e) {
      return jsonResponse({ error: "invalid JSON body" }, 400);
    }
    const rawKeys = Array.isArray(body.keys) ? body.keys : [];
    const keys = Array.from(
      new Set(
        rawKeys
          .filter((k): k is string => typeof k === "string")
          .map((k) => k.trim())
          .filter((k) => ISSUE_KEY_RE.test(k)),
      ),
    ).slice(0, MAX_KEYS_PER_CALL);

    if (keys.length === 0) {
      return jsonResponse({}, 200);
    }

    // 2. Get Jira connection.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: conn, error: connErr } = await supabase
      .from("ph_jira_connection")
      .select("site_url, auth_email, auth_token_encrypted, status")
      .eq("status", "connected")
      .single();
    if (connErr || !conn) {
      return jsonResponse({ error: "no active Jira connection" }, 503);
    }

    const siteUrl = conn.site_url.replace(/\/$/, "");
    const auth = btoa(`${conn.auth_email}:${conn.auth_token_encrypted}`);
    const jiraHeaders = {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    // 3. Batch via JQL `key in (...)` — one round trip for N keys.
    //    Single-quote each key and comma-join. Keys are already regex-whitelisted
    //    above so injection is impossible.
    const jql = `key in (${keys.map((k) => `"${k}"`).join(",")})`;
    const searchUrl = `${siteUrl}/rest/api/3/search/jql`;
    const searchBody = {
      jql,
      fields: ["issuetype", "summary"],
      maxResults: MAX_KEYS_PER_CALL,
    };

    const res = await fetch(searchUrl, {
      method: "POST",
      headers: jiraHeaders,
      body: JSON.stringify(searchBody),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(
        `[jira-issue-type-resolver] Jira ${res.status}: ${errText.slice(0, 200)}`,
      );
      return jsonResponse(
        { error: `Jira API ${res.status}` },
        res.status === 401 || res.status === 403 ? 502 : 500,
      );
    }
    const payload = await res.json();
    const issues: Array<{
      key?: string;
      fields?: { issuetype?: { name?: string }; summary?: string };
    }> = payload?.issues ?? [];

    // 4. Shape the response as a flat map keyed by issue_key.
    const out: Record<string, { issue_type: string; summary: string }> = {};
    for (const it of issues) {
      const k = it.key;
      if (!k) continue;
      out[k] = {
        issue_type: it.fields?.issuetype?.name ?? "Task",
        summary: it.fields?.summary ?? "",
      };
    }

    return jsonResponse(out, 200);
  } catch (e) {
    console.error(`[jira-issue-type-resolver] fatal:`, e);
    return jsonResponse({ error: "internal error" }, 500);
  }
});

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
