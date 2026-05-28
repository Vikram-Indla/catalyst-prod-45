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
    await sb.from("ai_governance_audit_log").insert({
      action: params.action,
      payload: params.payload,
      status: params.status,
      error_message: params.error_message ?? null,
      source: "ai-improve-comment",
    } as never);
  } catch (_e) {
    /* never fail the request because of audit logging */
  }
}

const SYSTEM_PROMPT =
  "You polish work-item comments so they read like a thoughtful, professional message a colleague would post. You stay strictly inside the writer's existing context — never invent new questions, asks, scope, or topics. Output plain Markdown only. No code fences, no preamble, no quotes around the answer.";

function buildUserPrompt(comment: string, issueSummary: string): string {
  return `Polish the following comment so it reads as a clear, professional, well-formatted message on a work-management tool.

You MAY:
- Fix grammar, spelling, typos, and awkward phrasing.
- Reorganise sentences for clarity and flow.
- Add a missing question mark when a sentence is clearly a question.
- Split a wall of text into short paragraphs.
- Add bullet points if the writer is listing multiple items — use them only to clarify structure that's already in the text.
- Add a short bold sub-heading (e.g. **Performance**, **UI**) ONLY if the comment naturally covers multiple distinct topics and headings genuinely help readability. Otherwise, do not add headings.

You MUST NOT:
- Invent new questions, new asks, new scope, new technical content, or new opinions that the writer did not already include.
- Lengthen the comment beyond what's needed for clarity. Stay close in length to the original.
- Add boilerplate, sign-offs, greetings, names, or "Hi team / Thanks / Regards" framing the writer didn't use.
- Add section headers like "Description", "Acceptance criteria", "Summary" — this is a comment, not a spec.
- Echo the work-item title or quote the original comment back. Reply with ONLY the rewritten comment.

Context (for tone only — do not echo): the comment is on work item titled "${issueSummary || "(untitled)"}".

Comment to polish:
${comment || "(empty)"}`;
}

// ─── suggest_reply prompt ─────────────────────────────────────────────────
// Generates a concise, professional reply TO a comment, rather than polishing
// the comment itself. Uses the parent comment body + issue context as signal.

const SUGGEST_REPLY_SYSTEM =
  "You write professional, concise replies to comments on work items in an enterprise project-management tool. Output plain text only — no markdown, no bullet points, no greetings, no sign-offs. Maximum 3 sentences.";

function buildSuggestReplyPrompt(parentComment: string, issueSummary: string, issueType: string): string {
  return `Generate a helpful reply to the following comment on a ${issueType || "work item"} titled "${issueSummary || "(untitled)"}".

COMMENT:
"${parentComment}"

INSTRUCTIONS:
- Be professional and direct.
- If the comment asks a question, answer it or acknowledge it.
- If the comment is informational, acknowledge and add value where possible.
- Stay within the scope of what the comment says — do not invent new information.
- Plain text only. No markdown. No greeting. No sign-off. Under 3 sentences.

Reply:`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

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

    // ── suggest_reply branch ─────────────────────────────────────────────
    // Separate prompt path: generate a NEW reply to a comment, not polish.
    if (body?.improve_type === "suggest_reply") {
      const parentComment: string =
        typeof body?.parent_comment === "string" ? body.parent_comment : "";
      const replyIssueSummary: string =
        typeof body?.issue_summary === "string" ? body.issue_summary : "";
      const replyIssueType: string =
        typeof body?.issue_type === "string" ? body.issue_type : "";

      const userPromptText = buildSuggestReplyPrompt(
        parentComment,
        replyIssueSummary,
        replyIssueType,
      );

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
            { role: "system", content: SUGGEST_REPLY_SYSTEM },
            { role: "user", content: userPromptText },
          ],
          temperature: 0.5,
          max_tokens: 256,
          stream: true,
        }),
        signal: upstreamAbort.signal,
      });

      if (!aiResp.ok || !aiResp.body) {
        const errBody = aiResp.body ? await aiResp.text() : "";
        console.error("ai-improve-comment suggest_reply gateway error:", aiResp.status, errBody);
        await logGovernance({ action: "ai_suggest_reply", payload: {}, status: "error", error_message: `gateway_${aiResp.status}` });
        return new Response(
          JSON.stringify({ error: "gateway_error", message: "AI gateway error" }),
          { status: aiResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
                      writeEvent({ type: "error", message: String(parsed.error?.message ?? parsed.error) });
                      upstreamErrored = true;
                      break;
                    }
                    const delta: string | undefined = parsed?.choices?.[0]?.delta?.content;
                    if (typeof delta === "string" && delta.length > 0) {
                      fullText += delta;
                      writeEvent({ type: "text", delta });
                    }
                  } catch { /* skip malformed chunk */ }
                }
                if (upstreamErrored) break;
              }
              if (upstreamErrored) break;
            }
            if (!upstreamErrored) writeEvent({ type: "done", full_text: fullText });
          } catch (e) {
            if ((e as DOMException)?.name !== "AbortError") {
              writeEvent({ type: "error", message: e instanceof Error ? e.message : "Stream error" });
            }
          } finally {
            try { controller.close(); } catch { /* already closed */ }
          }
        },
        cancel(reason) {
          try { upstreamAbort.abort(reason); } catch { /* swallow */ }
          try { reader.cancel(reason); } catch { /* swallow */ }
        },
      });

      logGovernance({ action: "ai_suggest_reply", payload: { has_summary: replyIssueSummary.length > 0 }, status: "ok" }).catch(() => {});

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // ── original polish branch (existing code below) ─────────────────────
    const currentComment: string =
      typeof body?.current_comment === "string"
        ? body.current_comment
        : typeof body?.current_description === "string"
          ? body.current_description
          : "";
    const issueSummary: string =
      typeof body?.issue_summary === "string" ? body.issue_summary : "";

    const userPromptText = buildUserPrompt(currentComment, issueSummary);
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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPromptText },
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
      console.error("ai-improve-comment gateway error:", status, errBody);
      await logGovernance({
        action: "ai_improve_comment",
        payload: {},
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
      action: "ai_improve_comment",
      payload: { has_summary: issueSummary.length > 0 },
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
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("ai-improve-comment unhandled error:", message);
    await logGovernance({
      action: "ai_improve_comment",
      payload: {},
      status: "error",
      error_message: message,
    });
    return new Response(
      JSON.stringify({ error: "internal_error", message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
