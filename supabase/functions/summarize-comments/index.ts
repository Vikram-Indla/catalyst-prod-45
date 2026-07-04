/**
 * summarize-comments — dedicated edge function for the Caty
 * comment-thread summary on the work-item detail view.
 *
 * Extracted out of `ai-improve-story` 2026-06-14 so the description
 * improver and the comments summariser stop sharing a multi-purpose
 * handler. Description / translation / sub-task prediction stays in
 * `ai-improve-story`; this file only handles the two comment-summary
 * code paths:
 *
 *   - improve_type === "summarize_comments_v2" + stream === true
 *     (NDJSON streaming, used by useCommentsSummaryStream)
 *   - improve_type === "summarize_comments"
 *     (non-streaming JSON, legacy)
 *
 * Phase 7d additions are preserved:
 *   - body.standup_status_changes (pre-grouped by standup_id in-prompt)
 *   - prompt requires one explicit bullet per standup in the output
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

const TONE_PER_TYPE: Record<string, string> = {
  Story:
    "Decision-focused. What decisions were made, what's pending, what's blocking the user-narrative.",
  Epic: "Strategic. Surface scope shifts, KPI changes, steering-committee notes.",
  Feature:
    "Roadmap-focused. Surface release-impact, dependency changes, scope movement.",
  Task: "Progress-focused. State, blockers, next-step.",
  "QA Bug":
    "Triage-focused. Reproduction status, severity changes, who's investigating.",
  Bug: "Triage-focused. Reproduction status, severity changes, who's investigating.",
  "Production Incident":
    "Incident-management voice. Timeline of events, mitigation status, action items.",
  Incident:
    "Incident-management voice. Timeline of events, mitigation status, action items.",
  Subtask: "Progress-focused. State, blockers, next-step.",
  "Business Request":
    "Stakeholder-focused. Surface stakeholder positions, decisions, sign-off status.",
  "Business Gap":
    "Stakeholder-focused. Surface stakeholder positions, decisions, sign-off status.",
  "API Requirement":
    "Contract-focused. Surface API shape changes, breaking-change risks, integration questions.",
  "Change Request":
    "Change-control-focused. Surface CAB sign-offs, rollback considerations.",
  Default: "Neutral. Surface key points, decisions, blockers.",
};

interface StandupStatusChange {
  actor?: string;
  old_status?: string | null;
  new_status?: string | null;
  changed_at?: string;
  standup_id?: string;
  standup_date?: string | null;
}

interface Comment {
  author?: string;
  created_at?: string;
  body?: string;
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
      source: "summarize-comments",
    } as never);
  } catch (_e) {
    // Audit never blocks inference.
  }
}

/** Format the comment thread block — chronological, last 30, body
 *  truncated to 2000 chars each. Shared by both branches. */
function buildCommentText(comments: Comment[]): string {
  return comments
    .slice(-30)
    .map(
      (c, i) =>
        `[${i + 1}] ${c.author ?? "(unknown)"} @ ${c.created_at ?? ""}:\n${(c.body ?? "").slice(0, 2000)}`,
    )
    .join("\n\n");
}

/** Pre-group the standup status changes by standup_id so each standup
 *  becomes one block in the prompt. The AI is then required to emit
 *  one bullet per standup with all the changes nested. */
function buildStandupChangesText(changes: StandupStatusChange[]): string {
  if (changes.length === 0) return "";
  const groups = new Map<
    string,
    { standup_id: string; standup_date: string | null; changes: StandupStatusChange[] }
  >();
  for (const change of changes) {
    const id = change.standup_id ?? "";
    if (!id) continue;
    const existing = groups.get(id);
    if (existing) {
      existing.changes.push(change);
    } else {
      groups.set(id, {
        standup_id: id,
        standup_date: change.standup_date ?? null,
        changes: [change],
      });
    }
  }
  return [...groups.values()]
    .map((g) => {
      const date = g.standup_date
        ? new Date(g.standup_date).toISOString().slice(0, 10)
        : "(unknown date)";
      const inner = g.changes
        .map((c) => {
          const from = c.old_status ?? "Unset";
          const to = c.new_status ?? "(no status)";
          const actor = c.actor ?? "(unknown user)";
          return `  - ${from} → ${to} (by ${actor})`;
        })
        .join("\n");
      return `Standup on ${date}:\n${inner}`;
    })
    .join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const improve_type: string | undefined = body.improve_type;
    const issue_summary: string = body.issue_summary ?? "";
    const issueType: string = body.issue_type ?? "Default";
    const comments: Comment[] = Array.isArray(body.comments) ? body.comments : [];
    const standupStatusChanges: StandupStatusChange[] = Array.isArray(
      body.standup_status_changes,
    )
      ? body.standup_status_changes
      : [];

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ─────────────────────────────────────────────────────────────
    // Branch: summarize_comments_v2 (STREAMING — NDJSON)
    // ─────────────────────────────────────────────────────────────
    if (improve_type === "summarize_comments_v2" && body.stream === true) {
      if (comments.length === 0) {
        const enc = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(enc.encode(JSON.stringify({ type: "start" }) + "\n"));
            controller.enqueue(
              enc.encode(JSON.stringify({ type: "done", full_text: "" }) + "\n"),
            );
            controller.close();
          },
        });
        return new Response(stream, {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
          },
        });
      }

      const tone = TONE_PER_TYPE[issueType] ?? TONE_PER_TYPE.Default;
      const commentText = buildCommentText(comments);
      const standupChangesText = buildStandupChangesText(standupStatusChanges);

      const prompt = `Summarize the comment thread on this work item. Output Markdown — short paragraphs and bullet points only. No headings, no code fences, no preamble.

Work item type: ${issueType}
Title: ${issue_summary || "(untitled)"}
Tone: ${tone}

Comment thread (most recent 30):
${commentText}
${standupChangesText ? `\nStatus changes recorded during standups, pre-grouped by standup (authoritative — the actor field names the user who actually moved the card):\n${standupChangesText}\n` : ""}
Produce a summary in the requested tone. Lead with one short paragraph that states the situation. Follow with bullet points for decisions, blockers, and open questions.${standupChangesText ? `\n\nAdditionally, when standup status changes are present above, you MUST include a separate bullet block titled with a single line "Status changes during standups:" followed by one bullet per standup that touched this ticket. Each bullet starts "During the standup on <date>:" and then lists every change in that standup as a comma-separated sequence in chronological order, e.g. "During the standup on 2026-06-14: In Requirements → In Progress (Vikram), then → In Review (Waseem)". Do not skip any standup that appears above. Do not collapse multiple standups into one bullet. Do not invent extra dates or actors.` : ""} Be specific — name people, ids, and items where the thread mentions them. Begin immediately with the situation paragraph. No preamble.`;

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
                "You are an expert technical writer. Output Markdown only. No code fences, no preamble.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 800,
          stream: true,
        }),
        signal: upstreamAbort.signal,
      });

      if (!aiResp.ok || !aiResp.body) {
        const status = aiResp.status;
        const errBody = aiResp.body ? await aiResp.text() : "";
        console.error(
          "summarize_comments_v2 (stream) gateway error:",
          status,
          errBody,
        );
        await logGovernance({
          action: "summarize_comments_v2_stream",
          payload: { issue_type: issueType, comment_count: comments.length },
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
          {
            status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
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
                    // Malformed chunk — skip
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
              // Already closed
            }
          }
        },
        cancel(reason) {
          try {
            upstreamAbort.abort(reason);
          } catch {
            /* swallow */
          }
          try {
            reader.cancel(reason);
          } catch {
            /* swallow */
          }
        },
      });

      logGovernance({
        action: "summarize_comments_v2_stream",
        payload: { issue_type: issueType, comment_count: comments.length },
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
    // Branch: summarize_comments (LEGACY non-streaming)
    // ─────────────────────────────────────────────────────────────
    if (improve_type === "summarize_comments") {
      if (comments.length === 0) {
        return new Response(JSON.stringify({ summary: "" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tone = TONE_PER_TYPE[issueType] ?? TONE_PER_TYPE.Default;
      const commentText = buildCommentText(comments);

      const prompt = `Summarize the comment thread on this work item. Output ONLY valid JSON with one key "summary". No markdown.

Work item type: ${issueType}
Title: ${issue_summary || "(untitled)"}
Tone: ${tone}

Comment thread (most recent 30):
${commentText}

Produce a 4–8 sentence summary in the requested tone. Highlight blockers / decisions / open questions explicitly. If there are action items, list them as bullets inside the string. End with a one-line "Open items:" if any are unresolved.

Return JSON: {"summary": "..."}`;

      const aiResp = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages: [
            {
              role: "system",
              content:
                "You are an expert technical writer. Return only valid JSON. No markdown fences.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 800,
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429)
          return new Response(
            JSON.stringify({
              error: "Rate limits exceeded, please try again later.",
            }),
            {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        if (aiResp.status === 402)
          return new Response(
            JSON.stringify({ error: "Payment required, please add funds." }),
            {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        return new Response(JSON.stringify({ error: "AI gateway error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResp.json();
      const rawText = aiData.choices?.[0]?.message?.content ?? "{}";
      let summary = "";
      try {
        const clean = rawText.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        summary = typeof parsed.summary === "string" ? parsed.summary : "";
      } catch {
        summary = rawText.replace(/```json|```/g, "").trim();
      }
      await logGovernance({
        action: "summarize_comments",
        payload: { issue_type: issueType, comment_count: comments.length },
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
    console.error("[summarize-comments] unexpected error", err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
