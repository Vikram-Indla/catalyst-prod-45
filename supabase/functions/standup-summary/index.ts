/**
 * standup-summary — lazy AI recap for a standup session.
 *
 * Called on first view of a valid session (>= 5 min) that has no summary yet.
 * Reads standup_sessions.changes_json + comments_json (the driver's own card
 * movements + comments captured between Start and End), asks Gemini for a
 * short, plain-language recap, and writes it back to summary_text (idempotent).
 *
 * Ground-truth only — the model sees ONLY the captured changes/comments. No
 * Jira issue bodies, no fabricated impact. Mirrors generate-whatsapp-summary:
 * same CORS, same Gemini endpoint + model, same key handling.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

const AI_GATEWAY_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const DEFAULT_MODEL = "gemini-2.5-flash";

interface StandupChange { key: string; type: string; action: string; field: string | null; from: string | null; to: string | null; ts: string; }
interface StandupComment { key: string; type: string; snippet: string; ts: string; }

const SYSTEM_PROMPT = `You write a short standup recap for executives reading later.

ABSOLUTE RULES:
1. GROUND TRUTH ONLY — use ONLY the changes and comments given. Never invent impact, dates, owners, risk, or completion claims.
2. NAME TICKETS by their key (e.g. "BAU-5884"). Group related moves naturally.
3. PLAIN LANGUAGE — no executive jargon, no buzzwords. Say exactly what happened to the tickets.
4. SHORT — 2 to 4 sentences. No headers, no bullet salad, no preamble like "In this standup".
5. If there are no changes and no comments, say "No tracked changes were recorded." and nothing else.`;

function buildUserPrompt(driver: string, changes: StandupChange[], comments: StandupComment[]): string {
  return `Driver: ${driver}

CHANGES (the driver's own card movements):
${JSON.stringify(changes, null, 2)}

COMMENTS (the driver's own comments):
${JSON.stringify(comments, null, 2)}

Write the recap now. Plain language, 2–4 sentences, ground-truth only.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) {
    return new Response(JSON.stringify({ error: "misconfigured", message: "Supabase env not set." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const sb = createClient(url, service, { auth: { persistSession: false } });

  try {
    const { sessionId } = await req.json().catch(() => ({ sessionId: null }));
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "invalid_payload", message: "sessionId required." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: session, error: selErr } = await sb
      .from("standup_sessions")
      .select("id, driver_name, is_valid, summary_text, changes_json, comments_json")
      .eq("id", sessionId)
      .single();

    if (selErr || !session) {
      return new Response(JSON.stringify({ error: "not_found", message: "Session not found." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!session.is_valid) {
      return new Response(JSON.stringify({ summary: null, skipped: "invalid" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (session.summary_text) {
      // Idempotent — already generated.
      return new Response(JSON.stringify({ summary: session.summary_text, cached: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const changes: StandupChange[] = Array.isArray(session.changes_json) ? session.changes_json : [];
    const comments: StandupComment[] = Array.isArray(session.comments_json) ? session.comments_json : [];

    let summary: string;
    if (changes.length === 0 && comments.length === 0) {
      summary = "No tracked changes were recorded.";
    } else {
      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
      if (!GEMINI_API_KEY) {
        return new Response(JSON.stringify({ error: "misconfigured", message: "GEMINI_API_KEY not set." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const aiResp = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          reasoning_effort: "none",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(session.driver_name ?? "Unknown", changes, comments) },
          ],
          temperature: 0.3,
          max_tokens: 400,
        }),
      });
      if (!aiResp.ok) {
        const status = aiResp.status;
        console.error("standup-summary gateway error:", status, await aiResp.text().catch(() => ""));
        const code = status === 429 ? "rate_limited" : status === 402 ? "payment_required" : "gateway_error";
        return new Response(JSON.stringify({ error: code }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const data = await aiResp.json();
      summary = (typeof data?.choices?.[0]?.message?.content === "string" ? data.choices[0].message.content : "").trim();
      if (!summary) {
        return new Response(JSON.stringify({ error: "empty_response" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    await sb.from("standup_sessions").update({ summary_text: summary }).eq("id", sessionId);

    return new Response(JSON.stringify({ summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("standup-summary unhandled error:", message);
    return new Response(JSON.stringify({ error: "internal_error", message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
