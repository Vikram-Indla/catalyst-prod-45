/**
 * folio-ai-search — natural-language → structured Folio document filter
 * (CAT-FOLIO-AISEARCH-20260706). Same shape as ai-search-issues: the AI
 * ONLY translates the query into a JSON filter spec; the frontend applies
 * it to the already-loaded Folio document list (title, content_text,
 * template_key, workspace, publish state, linked work items). Cheap,
 * bounded, size-independent.
 *
 * Request : { query: string }
 * Response: { filters: FolioFilter, reason: string }  (200)
 *           { error, message }                          (4xx/5xx)
 *
 * FolioFilter:
 *   text_contains    string      topic keyword vs title + body ("license")
 *   template_keys    string[]    "brd" | "tech-spec" | "meeting-notes"
 *   linked_types     string[]    linked work-item types: "business_request"
 *                                | "epic" | "story" | "task" | "bug"
 *                                | "feature" | "incident"
 *   workspace_names  string[]    fuzzy workspace names
 *   status           "draft" | "published"
 *   is_orphan        boolean     true → no links AND no children
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

const AI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `You translate a natural-language search over a DOCUMENTATION hub ("Folio") into a structured JSON filter spec. Output ONLY valid JSON — no markdown, no preamble.

Folio holds documents (pages). Each document may be created from a TEMPLATE, may be LINKED to work items (business requests, epics, stories…), belongs to a WORKSPACE (a project or product), and is Draft or Published.

INPUT TOLERANCE: queries are informal — typos, broken grammar, voice-to-text. Infer intent, never refuse. Extract the strongest signal; return {} only when nothing is extractable.

VOCABULARY MAPPING (critical):
- "BRD", "BRDs", "business requirement(s) document", "requirements doc" → template_keys: ["brd"]
- "tech spec", "technical specification", "architecture doc", "design doc" → template_keys: ["tech-spec"]
- "meeting notes", "minutes", "standup notes" → template_keys: ["meeting-notes"]
- "business request(s)", "BR", "demand(s)" as a LINKED work item → linked_types: ["business_request"]
- "epic(s)" → linked_types: ["epic"]; "stor(y|ies)" → ["story"]; "bug(s)/defect(s)" → ["bug"]; "task(s)" → ["task"]
- A topic/subject word ("license", "onboarding", "payments", "GDPR") → text_contains: that word (lowercased, singular stem is fine)
- "draft(s)" → status: "draft"; "published" / "live" / "final" → status: "published"
- "orphan(s)", "unlinked", "not linked to anything" → is_orphan: true
- A project/product name → workspace_names: [that name]

EXAMPLES:
- "show me all BRDs of license"                  → {"template_keys":["brd"],"text_contains":"license"}
- "business requirement documents about payments" → {"template_keys":["brd"],"text_contains":"payments"}
- "tech specs in ICP Project"                     → {"template_keys":["tech-spec"],"workspace_names":["ICP Project"]}
- "published docs linked to business requests"    → {"status":"published","linked_types":["business_request"]}
- "orphan pages"                                  → {"is_orphan":true}
- "everything about onboarding"                   → {"text_contains":"onboarding"}
- "meeting notes from last sprint"                → {"template_keys":["meeting-notes"]}

RULES:
- Keep the spec MINIMAL — omit every field you don't need.
- text_contains is ONE keyword/phrase (the topic), never a person or template name.
- Do not invent workspaces; echo the name the user typed.
- Output shape: {"filters": {...}, "reason": "<one short sentence describing what will match>"}`;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return json(500, { error: "config_missing", message: "GEMINI_API_KEY is not configured" });

    const body = await req.json().catch(() => ({}));
    const query: string = typeof body?.query === "string" ? body.query.trim() : "";
    if (!query) return json(400, { error: "bad_request", message: "`query` is required" });

    const res = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: query },
        ],
      }),
    });

    if (!res.ok) {
      const code = res.status === 429 ? "rate_limited" : res.status === 402 ? "payment_required" : "gateway_error";
      return json(res.status, { error: code, message: "AI gateway error" });
    }

    const data = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    let parsed: { filters?: Record<string, unknown>; reason?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return json(502, { error: "unparseable", message: "Could not parse the AI response" });
    }

    // Some models wrap the spec directly (no {filters} envelope) — tolerate both.
    const filters = (parsed.filters ?? parsed) as Record<string, unknown>;
    delete (filters as Record<string, unknown>).reason;
    const reason = typeof parsed.reason === "string" ? parsed.reason : "";
    return json(200, { filters, reason });
  } catch (e) {
    return json(500, { error: "internal_error", message: e instanceof Error ? e.message : String(e) });
  }
});
