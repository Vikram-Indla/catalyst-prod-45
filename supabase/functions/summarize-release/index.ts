/**
 * summarize-release — release-level summary edge function.
 *
 * Mirrors `summarize-comments` (Gemini NDJSON streaming) but the
 * domain is a release, not a comment thread. Reads:
 *   - ph_releases (target release)
 *   - ph_issues filtered to sprint_release containing the release name
 *
 * Computes progress counts (done / in_progress / to_do) server-side
 * and feeds the AI a structured payload covering the release name,
 * dates, description, target/projected dates, and a compact work-item
 * list with status, priority, type, assignee.
 *
 * Branches:
 *   - improve_type === "summarize_release_v2" + stream === true → NDJSON
 *   - improve_type === "summarize_release"                       → JSON (legacy)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

const AI_GATEWAY_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const DEFAULT_MODEL = "gemini-2.5-flash";

interface IssueRow {
  issue_key: string | null;
  summary: string | null;
  issue_type: string | null;
  status: string | null;
  status_category: string | null;
  priority: string | null;
  assignee_display_name: string | null;
  parent_key: string | null;
  jira_created_at: string | null;
  sprint_release: unknown;
}

interface ReleaseRow {
  id: string;
  name: string | null;
  title: string | null;
  description: string | null;
  status: string | null;
  start_date: string | null;
  release_date: string | null;
  target_date: string | null;
}

async function logGovernance(params: {
  action: string;
  payload: Record<string, unknown>;
  status: "ok" | "error";
  error_message?: string;
}) {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !service) return;
    const sb = createClient(url, service, { auth: { persistSession: false } });
    await sb.from("ai_usage_log").insert({
      action: params.action,
      payload: params.payload,
      status: params.status,
      error_message: params.error_message ?? null,
      source: "summarize-release",
    } as never);
  } catch (_e) {
    /* Audit never blocks inference. */
  }
}

/** Fetch the release/sprint row + linked work items via service role. */
async function fetchReleaseContext(
  releaseId: string,
  entityKind: "release" | "sprint" = "release",
): Promise<{
  release: ReleaseRow | null;
  items: IssueRow[];
}> {
  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) return { release: null, items: [] };
  const sb = createClient(url, service, { auth: { persistSession: false } });

  // 2026-06-26: Phase 3 — entity-aware table swap. Sprint surface reads
  // from ph_jira_sprints; release surface keeps ph_releases.
  // 2026-07-03: sprint membership reads ph_issues.sprint_id (FK) — the
  // sprint_release JSONB name-match was declared dead for sprints in
  // D-002/S0.2b and is release-only from here on (see D-020, the same
  // fix already applied to the health adapter in src/features/health/
  // adapters/entity.ts).
  const entityTable = entityKind === "sprint" ? "ph_jira_sprints" : "ph_releases";

  const { data: release } = await sb
    .from(entityTable)
    .select(
      "id, name, title, description, status, start_date, release_date, target_date",
    )
    .eq("id", releaseId)
    .maybeSingle();

  if (!release) return { release: null, items: [] };

  let rows: IssueRow[] = [];
  const ISSUE_SELECT =
    "issue_key, summary, issue_type, status, status_category, priority, assignee_display_name, parent_key, jira_created_at, sprint_release";

  if (entityKind === "sprint") {
    const fkResult = await sb
      .from("ph_issues")
      .select(ISSUE_SELECT)
      .eq("sprint_id", releaseId)
      .limit(2000);
    rows = (fkResult.data as IssueRow[]) ?? [];
  } else {
    const target = ((release as ReleaseRow).name || (release as ReleaseRow).title || "").trim();
    if (!target) return { release: release as ReleaseRow, items: [] };

    // Try server-side contains; fall back to client-side filter.
    const containsResult = await sb
      .from("ph_issues")
      .select(ISSUE_SELECT)
      .contains("sprint_release", JSON.stringify([{ name: target }]) as unknown as string)
      .limit(2000);
    if ((containsResult.data?.length ?? 0) > 0) {
      rows = containsResult.data as IssueRow[];
    } else {
      const fb = await sb
        .from("ph_issues")
        .select(ISSUE_SELECT)
        .not("sprint_release", "is", null)
        .limit(5000);
      if (fb.data) {
        rows = (fb.data as IssueRow[]).filter((row) => {
          const arr = row.sprint_release;
          return Array.isArray(arr) && arr.some((el) => el && (el as { name?: string }).name === target);
        });
      }
    }
  }

  // Drop ghost rows.
  rows = rows.filter((r) => (r.issue_key || "").trim() && (r.summary || "").trim());

  return { release: release as ReleaseRow, items: rows };
}

function countProgress(items: IssueRow[]): { done: number; inProgress: number; toDo: number; total: number } {
  let done = 0;
  let inProgress = 0;
  let toDo = 0;
  for (const i of items) {
    const c = String(i.status_category ?? "").toLowerCase();
    if (c === "done") done += 1;
    else if (c === "in progress" || c === "inprogress" || c === "in_progress") inProgress += 1;
    else toDo += 1;
  }
  return { done, inProgress, toDo, total: items.length };
}

function buildItemsBlock(items: IssueRow[]): string {
  if (items.length === 0) return "(no work items linked to this release)";
  // Cap at 80 items in the prompt — Gemini context budget guard. Order by
  // creation date so the AI sees the freshest signal at the bottom.
  const slice = items.slice(0, 80);
  return slice
    .map((it, i) => {
      const parts = [
        `[${i + 1}] ${it.issue_key ?? "??"}`,
        `type=${it.issue_type ?? "—"}`,
        `status=${it.status ?? it.status_category ?? "—"}`,
        `priority=${it.priority ?? "—"}`,
        `assignee=${it.assignee_display_name ?? "Unassigned"}`,
      ];
      if (it.parent_key) parts.push(`parent=${it.parent_key}`);
      return `${parts.join(" · ")}\n    ${(it.summary ?? "").slice(0, 280)}`;
    })
    .join("\n\n");
}

function buildPrompt(opts: {
  release: ReleaseRow;
  items: IssueRow[];
  counts: ReturnType<typeof countProgress>;
  entityKind: "release" | "sprint";
}): string {
  const { release, items, counts, entityKind } = opts;
  const noun = entityKind === "sprint" ? "sprint" : "release";
  const Noun = entityKind === "sprint" ? "Sprint" : "Release";
  const name = release.name || release.title || `(untitled ${noun})`;
  const startDate = release.start_date || "—";
  const releaseDate = release.release_date || release.target_date || "—";
  const status = release.status || "—";
  const desc = (release.description || "").trim();
  const pct = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;

  return `Summarize this ${noun} for a project lead. Output Markdown — short paragraphs and bullet points only. No headings, no code fences, no preamble.

${Noun} name: ${name}
Status: ${status}
Start date: ${startDate}
${Noun} date: ${releaseDate}
Progress: ${counts.done}/${counts.total} done (${pct}%) · ${counts.inProgress} in progress · ${counts.toDo} to do
${desc ? `Description: ${desc.slice(0, 1000)}` : ""}

Work items in this ${noun} (most recent first, max 80 shown):
${buildItemsBlock(items)}

Tone: ${entityKind === "sprint" ? "Sprint-delivery" : "Release-management"} voice. Lead with one short paragraph describing the ${noun} state (what it is, where it stands against the dates, headline progress number). Follow with bullet points covering:
- Major in-flight workstreams (group by parent/epic when meaningful)
- Open blockers, high-priority items, or items with no assignee
- What needs attention before ${noun} date

Be specific — name keys, owners, and items. Begin immediately with the situation paragraph. No preamble.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const improve_type: string | undefined = body.improve_type;
    const releaseId: string | undefined = body.release_id;
    const entityKindRaw: string | undefined = body.entity_kind;
    const entityKind: "release" | "sprint" =
      entityKindRaw === "sprint" ? "sprint" : "release";

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!releaseId) {
      return new Response(
        JSON.stringify({ error: "release_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { release, items } = await fetchReleaseContext(releaseId, entityKind);
    if (!release) {
      return new Response(
        JSON.stringify({ error: "release_not_found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const counts = countProgress(items);

    // ─────────────────────────────────────────────────────────────
    // Branch: summarize_release_v2 (STREAMING — NDJSON)
    // ─────────────────────────────────────────────────────────────
    if (improve_type === "summarize_release_v2" && body.stream === true) {
      const prompt = buildPrompt({ release, items, counts, entityKind });
      const upstreamAbort = new AbortController();

      const aiResp = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          reasoning_effort: "none",
          messages: [
            {
              role: "system",
              content:
                "You are an expert release manager. Output Markdown only. No code fences, no preamble.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 900,
          stream: true,
        }),
        signal: upstreamAbort.signal,
      });

      if (!aiResp.ok || !aiResp.body) {
        const status = aiResp.status;
        const errBody = aiResp.body ? await aiResp.text() : "";
        console.error("summarize_release_v2 (stream) gateway error:", status, errBody);
        await logGovernance({
          action: "summarize_release_v2_stream",
          payload: { release_id: releaseId, item_count: items.length },
          status: "error",
          error_message: `gateway_${status}`,
        });
        const code =
          status === 429
            ? "rate_limited"
            : status === 402
              ? "payment_required"
              : "gateway_error";
        return new Response(
          JSON.stringify({
            error: code,
            message:
              status === 429
                ? "Rate limits exceeded, please try again later."
                : status === 402
                  ? "Payment required, please add funds."
                  : "AI gateway error",
          }),
          { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const reader = aiResp.body.getReader();
      const stream = new ReadableStream({
        async start(controller) {
          const enc = new TextEncoder();
          const writeEvent = (obj: Record<string, unknown>) => {
            controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));
          };
          writeEvent({ type: "start" });

          const dec = new TextDecoder();
          let buffer = "";
          let fullText = "";
          let upstreamErrored = false;

          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              buffer += dec.decode(value, { stream: true });

              let sepIdx;
              while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
                const frame = buffer.slice(0, sepIdx).trim();
                buffer = buffer.slice(sepIdx + 2);
                if (!frame) continue;

                for (const line of frame.split("\n")) {
                  if (!line.startsWith("data:")) continue;
                  const payload = line.slice(5).trim();
                  if (payload === "[DONE]") continue;
                  try {
                    const parsed = JSON.parse(payload);
                    if (parsed?.error) {
                      const msg =
                        typeof parsed.error === "string"
                          ? parsed.error
                          : (parsed.error?.message ?? "Upstream AI error");
                      writeEvent({ type: "error", message: String(msg) });
                      upstreamErrored = true;
                      break;
                    }
                    const delta: string | undefined =
                      parsed?.choices?.[0]?.delta?.content;
                    if (typeof delta === "string" && delta.length > 0) {
                      fullText += delta;
                      writeEvent({ type: "text", delta });
                    }
                  } catch {
                    /* malformed chunk — skip */
                  }
                }
                if (upstreamErrored) break;
              }
              if (upstreamErrored) break;
            }
            if (!upstreamErrored) {
              writeEvent({ type: "done", full_text: fullText });
            }
          } catch (e) {
            if ((e as DOMException)?.name !== "AbortError") {
              writeEvent({
                type: "error",
                message: e instanceof Error ? e.message : "Stream error",
              });
            }
          } finally {
            try {
              controller.close();
            } catch {
              /* already closed */
            }
          }
        },
        cancel(reason) {
          try {
            upstreamAbort.abort(reason);
          } catch { /* swallow */ }
          try {
            reader.cancel(reason);
          } catch { /* swallow */ }
        },
      });

      logGovernance({
        action: "summarize_release_v2_stream",
        payload: { release_id: releaseId, item_count: items.length },
        status: "ok",
      }).catch(() => {});

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // Branch: summarize_release (LEGACY non-streaming)
    // ─────────────────────────────────────────────────────────────
    if (improve_type === "summarize_release") {
      const prompt = buildPrompt({ release, items, counts, entityKind });
      const aiResp = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages: [
            { role: "system", content: "You are an expert release manager. Output Markdown only." },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 900,
        }),
      });
      if (!aiResp.ok) {
        return new Response(JSON.stringify({ error: "AI gateway error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const aiData = await aiResp.json();
      const summary = aiData.choices?.[0]?.message?.content ?? "";
      await logGovernance({
        action: "summarize_release",
        payload: { release_id: releaseId, item_count: items.length },
        status: "ok",
      });
      return new Response(JSON.stringify({ summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "unsupported improve_type" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[summarize-release] unexpected error", err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
