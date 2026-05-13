/**
 * ai-search-issues
 * ─────────────────
 * Parses a natural-language work-item search query into a structured
 * filter spec the frontend applies locally to its already-loaded
 * project items list. NOT a semantic search — we don't send every
 * ticket to the AI. The AI's job is JUST to translate human language
 * into structured criteria; the matching happens client-side against
 * the existing `useProjectAllWorkItems` array. This keeps the call
 * cheap, fast, and bounded regardless of project size.
 *
 * Request body:
 *   {
 *     query: string,
 *     projectKey: string,
 *     current_user?: { id: string, name: string }
 *   }
 *
 * Response (200):
 *   {
 *     filters: CatyFilter,   // see schema in the prompt below
 *     reason: string         // one-liner explaining what was matched
 *   }
 *
 * Response (error): { error: code, message: string } with 4xx/5xx
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3-flash-preview";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return jsonError(500, "config_missing", "LOVABLE_API_KEY is not configured");
    }

    const body = await req.json().catch(() => ({}));
    const query: string = typeof body.query === "string" ? body.query.trim() : "";
    const projectKey: string =
      typeof body.projectKey === "string" ? body.projectKey : "";
    const currentUser = (body.current_user ?? {}) as {
      id?: string;
      name?: string;
    };

    if (!query) {
      return jsonError(400, "bad_request", "`query` is required");
    }

    const currentUserId = typeof currentUser.id === "string" ? currentUser.id : "";
    const currentUserName =
      typeof currentUser.name === "string" && currentUser.name.trim()
        ? currentUser.name.trim()
        : "the current user";

    const systemPrompt =
      `You translate natural-language work-item search queries into a structured JSON filter spec for a Jira-like UI. Output ONLY valid JSON. No markdown, no preamble, no explanation outside the JSON.

Available filter fields (omit any you don't need — keep the spec minimal):
- assignee_names      string[]  exact display names to match (e.g. ["Mike Smith"])
- assignee_ids        string[]  user IDs — use the current user's id when the query mentions "me", "my", "mine", "myself", "I", "I'm"
- is_unassigned       boolean   true → match items with no assignee at all
- status_names        string[]  exact status names like "To Do", "In Progress", "Done", "In Review", "Code Review", "Blocked", "On Hold", "QA", "Ready for Development"
- status_categories   string[]  high-level: "todo" | "in_progress" | "done"
- priorities          string[]  one or more of "highest" | "high" | "medium" | "low" | "lowest"
- types               string[]  one or more of "epic" | "story" | "bug" | "task" | "subtask" | "feature" | "improvement"
- text_contains       string    free-text substring to fuzzy-match in the summary (use when the user asks about a topic, e.g. "issues about onboarding")
- created_within_days number    e.g. 7 for "this week", 30 for "this month", 1 for "today"
- labels              string[]  exact label strings

Response schema:
{
  "filters": { /* any subset of the fields above */ },
  "reason":  "one short sentence explaining what these filters match"
}`;

    const userPrompt =
      `Project key: ${projectKey || "(unknown)"}
Current user: ${currentUserName}${currentUserId ? ` (id: ${currentUserId})` : ""}

User query:
"${query}"

Return the JSON now.`;

    const aiResp = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        // Low temperature — we want deterministic filter parsing, not
        // creative writing.
        temperature: 0.1,
        max_tokens: 400,
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      const t = await aiResp.text().catch(() => "");
      console.error("ai-search-issues gateway error:", status, t);
      if (status === 429) {
        return jsonError(429, "rate_limited", "Rate limits exceeded, please try again later.");
      }
      if (status === 402) {
        return jsonError(402, "payment_required", "AI credits exhausted.");
      }
      return jsonError(500, "gateway_error", "AI gateway error");
    }

    const aiData = await aiResp.json();
    const rawText: string = aiData?.choices?.[0]?.message?.content ?? "{}";
    // Strip any stray markdown fences and parse.
    const clean = rawText.replace(/```json|```/g, "").trim();
    let parsed: { filters?: Record<string, unknown>; reason?: string };
    try {
      parsed = JSON.parse(clean);
    } catch (_e) {
      // Fallback — empty filter set so the frontend at least shows a
      // "no results" rather than crashing.
      return jsonOk({
        filters: {},
        reason: "Caty couldn't parse that — try rephrasing.",
      });
    }

    const filters = sanitizeFilters(parsed?.filters ?? {});
    const reason =
      typeof parsed?.reason === "string" && parsed.reason.trim()
        ? parsed.reason.trim().slice(0, 200)
        : "";

    return jsonOk({ filters, reason });
  } catch (e) {
    console.error("ai-search-issues error:", e);
    return jsonError(500, "internal", e instanceof Error ? e.message : "Unknown error");
  }
});

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function jsonOk(payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: code, message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Whitelist the AI output to known filter shapes. The AI is highly
 * likely to follow the schema, but if it invents fields or returns
 * weird types we want the frontend to see a clean, predictable spec
 * — not arbitrary AI-generated data.
 */
function sanitizeFilters(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const strArr = (v: unknown): string[] | undefined => {
    if (!Array.isArray(v)) return undefined;
    const arr = v.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((s) => s.trim())
      .slice(0, 25);
    return arr.length > 0 ? arr : undefined;
  };
  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim().length > 0 ? v.trim().slice(0, 200) : undefined;
  const bool = (v: unknown): boolean | undefined =>
    typeof v === "boolean" ? v : undefined;
  const num = (v: unknown): number | undefined => {
    if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
    if (v < 0 || v > 3650) return undefined;
    return Math.round(v);
  };

  const assigneeNames = strArr(raw.assignee_names);
  if (assigneeNames) out.assignee_names = assigneeNames;

  const assigneeIds = strArr(raw.assignee_ids);
  if (assigneeIds) out.assignee_ids = assigneeIds;

  const isUnassigned = bool(raw.is_unassigned);
  if (isUnassigned !== undefined) out.is_unassigned = isUnassigned;

  const statusNames = strArr(raw.status_names);
  if (statusNames) out.status_names = statusNames;

  const statusCats = strArr(raw.status_categories)?.filter((c) =>
    ["todo", "in_progress", "done"].includes(c),
  );
  if (statusCats && statusCats.length > 0) out.status_categories = statusCats;

  const priorities = strArr(raw.priorities)?.map((p) => p.toLowerCase()).filter((p) =>
    ["highest", "high", "medium", "low", "lowest"].includes(p),
  );
  if (priorities && priorities.length > 0) out.priorities = priorities;

  const types = strArr(raw.types)?.map((t) => t.toLowerCase()).filter((t) =>
    ["epic", "story", "bug", "task", "subtask", "feature", "improvement"].includes(t),
  );
  if (types && types.length > 0) out.types = types;

  const textContains = str(raw.text_contains);
  if (textContains) out.text_contains = textContains;

  const createdWithin = num(raw.created_within_days);
  if (createdWithin !== undefined) out.created_within_days = createdWithin;

  const labels = strArr(raw.labels);
  if (labels) out.labels = labels;

  return out;
}
