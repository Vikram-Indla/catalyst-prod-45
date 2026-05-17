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

const AI_GATEWAY_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const DEFAULT_MODEL = "gemini-2.5-flash";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return jsonError(500, "config_missing", "GEMINI_API_KEY is not configured");
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

INPUT TOLERANCE — IMPORTANT:
The user's query is often informal: typos, broken grammar, missing articles, mixed languages, voice-to-text artefacts, misspelled names. INFER intent — never refuse to parse. If the query is "tikets asignd hasan", treat it the same as "tickets assigned to Hasan". If it's "show me bugz mike fixd last week", treat it the same as "bugs Mike worked on this past week". Always extract the strongest signal you can; only return an empty filter when there is genuinely nothing to extract.

NAMES — partial vs full:
The frontend does fuzzy substring + typo-tolerant matching against the actual project members. So:
- DO put what the user typed (or your best-guess corrected spelling) into assignee_names — even single first names, even partial names, even slight misspellings. Examples: "tickets for Hassan" → assignee_names: ["Hassan"]. "issues assigned to hasan raza" → assignee_names: ["Hasan Raza"]. "what's mike up to" → assignee_names: ["Mike"].
- DO NOT split a single person across multiple array entries. ["Hassan Raza"] is ONE name. ["Hassan", "Raza"] would be interpreted as two different people.
- DO NOT canonicalize or "fix" names to full names you don't actually know — the frontend handles that. Just echo back what the user said.
- For "me" / "my" / "mine" / "I" / "myself", use assignee_ids with the current user's id (provided below). Do not use assignee_names for self-references.

Available filter fields (omit any you don't need — keep the spec minimal). AND across dimensions, OR within an array:

People
- assignee_names      string[]  display names or partial names (see NAMES rules above)
- assignee_ids        string[]  user IDs — use the current user's id when the query mentions "me", "my", "mine", "myself", "I", "I'm"
- is_unassigned       boolean   true → match items with no assignee at all
- reporter_names      string[]  same fuzzy rules as assignee_names
- reporter_ids        string[]

Lifecycle
- status_names        string[]  status names like "To Do", "In Progress", "Done", "In Review", "Code Review", "Blocked", "On Hold", "QA", "Ready for Development"
- status_categories   string[]  high-level: "todo" | "in_progress" | "done"
- priorities          string[]  one or more of "highest" | "high" | "medium" | "low" | "lowest"
- types               string[]  one or more of "epic" | "story" | "bug" | "task" | "subtask" | "feature" | "improvement"
- is_flagged          boolean   true → only flagged items, false → only unflagged
- resolution_set      boolean   true → has a resolution (closed/resolved), false → still unresolved/open

Time windows
- created_within_days number    e.g. 7 for "created this week", 1 for "created today"
- updated_within_days number    e.g. 1 for "touched today", 7 for "active this week"
- stale_for_days      number    inverse — NOT updated for the last N days; e.g. "haven't been worked on in 2 weeks" → 14

Hierarchy & grouping
- parent_keys         string[]  Jira issue keys like "BAU-4466"; use when user references "everything under …", "in this epic", a specific key
- sprint_names        string[]  exact sprint names
- fix_versions        string[]  exact fix-version names
- labels              string[]  exact label strings

Engagement / weight
- min_comments        number    e.g. 5 for "items with lots of discussion"
- story_points_min    number
- story_points_max    number

Free text
- text_contains       string    substring matched against BOTH summary AND description (use for topic queries, e.g. "issues about onboarding")

Response schema:
{
  "filters": { /* any subset of the fields above */ },
  "reason":  "one short sentence explaining what these filters match"
}

Concrete examples (study these carefully — the AI's job is to combine the right dimensions):
- "high priority issues without assignee" → { "filters": { "priorities": ["highest", "high"], "is_unassigned": true }, "reason": "Unassigned high/highest priority items" }
- "tickets assigned but not worked on since last week" → { "filters": { "stale_for_days": 7 }, "reason": "Items not updated in the last 7 days" }
- "in-progress bugs reported by Sara this month" → { "filters": { "types": ["bug"], "status_categories": ["in_progress"], "reporter_names": ["Sara"], "created_within_days": 30 } }
- "everything under BAU-4466" → { "filters": { "parent_keys": ["BAU-4466"] } }
- "stories I'm watching that have lots of discussion" → { "filters": { "assignee_ids": ["<current_user_id>"], "types": ["story"], "min_comments": 5 } }`;

    const userPrompt =
      `Project key: ${projectKey || "(unknown)"}
Current user: ${currentUserName}${currentUserId ? ` (id: ${currentUserId})` : ""}

User query:
"${query}"

Return the JSON now.`;

    const aiResp = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
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

  // People
  const assigneeNames = strArr(raw.assignee_names);
  if (assigneeNames) out.assignee_names = assigneeNames;

  const assigneeIds = strArr(raw.assignee_ids);
  if (assigneeIds) out.assignee_ids = assigneeIds;

  const isUnassigned = bool(raw.is_unassigned);
  if (isUnassigned !== undefined) out.is_unassigned = isUnassigned;

  const reporterNames = strArr(raw.reporter_names);
  if (reporterNames) out.reporter_names = reporterNames;

  const reporterIds = strArr(raw.reporter_ids);
  if (reporterIds) out.reporter_ids = reporterIds;

  // Lifecycle
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

  const isFlagged = bool(raw.is_flagged);
  if (isFlagged !== undefined) out.is_flagged = isFlagged;

  const resolutionSet = bool(raw.resolution_set);
  if (resolutionSet !== undefined) out.resolution_set = resolutionSet;

  // Time windows
  const createdWithin = num(raw.created_within_days);
  if (createdWithin !== undefined) out.created_within_days = createdWithin;

  const updatedWithin = num(raw.updated_within_days);
  if (updatedWithin !== undefined) out.updated_within_days = updatedWithin;

  const staleFor = num(raw.stale_for_days);
  if (staleFor !== undefined) out.stale_for_days = staleFor;

  // Hierarchy & grouping
  const parentKeys = strArr(raw.parent_keys)?.map((k) => k.toUpperCase());
  if (parentKeys && parentKeys.length > 0) out.parent_keys = parentKeys;

  const sprintNames = strArr(raw.sprint_names);
  if (sprintNames) out.sprint_names = sprintNames;

  const fixVersions = strArr(raw.fix_versions);
  if (fixVersions) out.fix_versions = fixVersions;

  const labels = strArr(raw.labels);
  if (labels) out.labels = labels;

  // Engagement / weight
  const minComments = num(raw.min_comments);
  if (minComments !== undefined) out.min_comments = minComments;

  const spMin = num(raw.story_points_min);
  if (spMin !== undefined) out.story_points_min = spMin;

  const spMax = num(raw.story_points_max);
  if (spMax !== undefined) out.story_points_max = spMax;

  // Free text
  const textContains = str(raw.text_contains);
  if (textContains) out.text_contains = textContains;

  return out;
}
