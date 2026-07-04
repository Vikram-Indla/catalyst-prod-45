/**
 * generate-whatsapp-summary — AI-authored WhatsApp update from a filter context.
 *
 * The frontend sends a FilterSummaryContext (built by the deterministic context
 * builder, which has already permission-gated, sanitized, classified, and capped
 * the item set). This function writes the system + user prompts, calls Gemini,
 * and returns the generated text. Keys stay server-side; the frontend never
 * builds the model prompt.
 *
 * Mirrors ai-translate-field: same CORS headers, same Gemini endpoint + model,
 * same reasoning_effort/temperature/max_tokens, same logGovernance() pattern.
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

// ── Types (mirror of frontend types.ts — kept in sync manually) ───────────────

interface SanitizedItem {
  key: string;
  summary: string;
  issueType: string;
  assignee: string;
  businessStatus: string;
  rawStatus: string;
  isBlocked: boolean;
  blockerReason: string | null;
  etaDate: string | null;
  etaSource: "due_date" | "sprint" | "missing";
  sprintName: string | null;
  isInReview: boolean;
  isDecisionNeeded: boolean;
  daysStale: number | null;
  priority: string | null;
}

interface FilterSummaryContext {
  filterName: string;
  filterJql: string;
  projectKey: string | null;
  totalItemCount: number;
  cappedItemCount: number;
  isTruncated: boolean;
  generatedAt: string;
  options: {
    summaryType: string;
    recipientRole: string;
    maxItems: number;
  };
  counts: {
    total: number;
    done: number;
    inProgress: number;
    blocked: number;
    inReview: number;
    notStarted: number;
    decisionNeeded: number;
    missingEta: number;
    overdue: number;
  };
  cappedItems: SanitizedItem[];
}

// ── Audit logging (mirrors ai-translate-field) ────────────────────────────────

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
      source: "generate-whatsapp-summary",
    } as never);
  } catch (_e) {
    /* never fail the request because of audit logging */
  }
}

// ── Prompt construction ───────────────────────────────────────────────────────

// ── Role → persona map (mirrors ROLE_GROUPS in AdminAccessPage) ──────────────

const ROLE_PERSONA: Record<string, { label: string; detail: string; tone: string }> = {
  business_owner:       { label: "a Business Owner",        detail: "high-level outcomes, risks, and key decisions — no Jira ticket detail",        tone: "professional and concise" },
  product_owner:        { label: "a Product Owner",         detail: "feature progress, blockers to delivery, and sprint coverage",                   tone: "professional and direct" },
  product_manager:      { label: "a Product Manager",       detail: "progress, blockers, ETAs, and decisions needed",                                tone: "professional and structured" },
  project_manager:      { label: "a Project Manager",       detail: "full item-level detail — key, assignee, status, blockers, ETAs",                tone: "formal and precise" },
  project_coordinator:  { label: "a Project Coordinator",   detail: "full item list with status and assignee",                                       tone: "friendly and clear" },
  release_manager:      { label: "a Release Manager",       detail: "ETA coverage, overdue items, and sprint alignment",                             tone: "professional and focused on dates" },
  architect:            { label: "an Architect",            detail: "progress on technical items, blockers, and decisions needed",                   tone: "professional and technical" },
  developer:            { label: "a Developer",             detail: "full item-level status — what's in progress, blocked, or in review",            tone: "direct and technical" },
  qa_tester:            { label: "a QA Tester",             detail: "items in review or testing, blockers, and decisions needed",                   tone: "direct and factual" },
  operations_engineer:  { label: "an Operations Engineer",  detail: "in-progress and blocked items relevant to operations",                          tone: "direct and factual" },
  technical_support:    { label: "a Technical Support lead","detail": "items in progress and any blockers or decisions pending",                     tone: "friendly and factual" },
  support:              { label: "a Support lead",          detail: "high-level progress and any items that affect customers",                       tone: "friendly and clear" },
  governance:           { label: "a Governance reviewer",   detail: "milestone status, decisions needed, and risk items",                            tone: "formal and structured" },
  pmo:                  { label: "a PMO lead",              detail: "progress, ETA coverage, overdue items, and decisions needed",                   tone: "formal and structured" },
  admin:                { label: "an Admin",                detail: "full status — all items, assignees, blockers, and ETAs",                        tone: "professional and complete" },
  guest:                { label: "a Guest stakeholder",     detail: "high-level summary only — counts and key highlights, no ticket-level detail",   tone: "friendly and brief" },
};

function buildSystemPrompt(ctx: FilterSummaryContext): string {
  const { options } = ctx;
  const role = (options as any).recipientRole as string ?? "business_owner";
  const persona = ROLE_PERSONA[role] ?? ROLE_PERSONA["business_owner"];

  return `You are a senior delivery manager writing a WhatsApp status update for ${persona.label}.
Include: ${persona.detail}.
Tone: ${persona.tone}.

━━━━━━━━━━━━━━━ ABSOLUTE RULES ━━━━━━━━━━━━━━━

1. GROUND TRUTH ONLY — you must NEVER fabricate, invent, or infer information that is not explicitly present in the structured data you receive. This includes:
   - Dates and deadlines
   - Blocker reasons
   - Completion claims ("this will be done by...")
   - Owner names
   - Business impact statements
   - Risk assessments

2. USE REAL ITEM TITLES — always name specific items by their key and summary (e.g. "BAU-123 — Implement login flow"). Never collapse multiple items into "2 items by tomorrow" or similar.

3. STATE MISSING DATA PLAINLY — if a field is missing or null, say so directly. Examples:
   - etaSource = "missing" → "ETA is not clear — no target date is set"
   - blockerReason = null → "flagged as blocked (no reason given)"
   - daysStale > 14 → "no updates in more than 14 days"

4. NO HALLUCINATION — you have not read the Jira issues. You only know what the structured data says. Do not add business context, impact, urgency, or sentiment that is not in the data.

5. FORMAT — WhatsApp-friendly:
   - Use *bold* for section headers
   - Use emoji sparingly (1–2 per message max, only at section headers)
   - Short paragraphs or bullet points, not wall-of-text
   - No markdown tables
   - Keep total message under 1500 characters unless items require more detail

━━━━━━━━━━━━━━━ SCOPE ━━━━━━━━━━━━━━━

Summary type: ${options.summaryType}
${options.summaryType === "blockers" ? "Focus entirely on blocked items and what is blocking them." : ""}
${options.summaryType === "eta" ? "Focus entirely on ETAs — which items have dates, which are missing dates, and what sprint coverage looks like." : ""}
${options.summaryType === "progress" ? "Focus on what has moved forward (in progress, in review, done recently)." : ""}
${options.summaryType === "full" ? "Cover progress, blockers, ETAs, and any decisions needed." : ""}`;
}

function buildUserPrompt(ctx: FilterSummaryContext): string {
  const { filterName, counts, isTruncated, cappedItemCount, totalItemCount, cappedItems } = ctx;
  const truncNote = isTruncated
    ? `\n⚠️ Note: only ${cappedItemCount} of ${totalItemCount} items are included in this payload. Mention this in your summary.`
    : "";

  const itemsJson = JSON.stringify(
    cappedItems.map(item => ({
      key: item.key,
      summary: item.summary,
      type: item.issueType,
      assignee: item.assignee,
      status: item.rawStatus,
      businessStatus: item.businessStatus,
      blocked: item.isBlocked,
      blockerReason: item.blockerReason,
      etaDate: item.etaDate,
      etaSource: item.etaSource,
      sprint: item.sprintName,
      inReview: item.isInReview,
      decisionNeeded: item.isDecisionNeeded,
      daysStale: item.daysStale,
      priority: item.priority,
    })),
    null,
    2,
  );

  return `Write a WhatsApp status update for the filter: *${filterName}*

SUMMARY COUNTS (use these for the headline — do not recompute):
- Total: ${counts.total}
- Done: ${counts.done}
- In progress: ${counts.inProgress}
- Blocked: ${counts.blocked}
- In review: ${counts.inReview}
- Not started: ${counts.notStarted}
- Overdue: ${counts.overdue}
- Missing ETA: ${counts.missingEta}
- Decision needed: ${counts.decisionNeeded}
${truncNote}

ITEMS (structured data — use this for all item-level detail):
${itemsJson}

Write the WhatsApp message now. Use the counts above for the headline and the items array for per-item detail. Follow all rules in the system prompt.`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const ctx: FilterSummaryContext | null =
      body && typeof body === "object" && typeof body.filterName === "string" ? body : null;

    if (!ctx) {
      return new Response(
        JSON.stringify({ error: "invalid_payload", message: "Expected a FilterSummaryContext object." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!ctx.cappedItems || ctx.cappedItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "no_items", message: "No items in filter context — nothing to summarise." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "misconfigured", message: "GEMINI_API_KEY is not set." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = buildSystemPrompt(ctx);
    const userPrompt = buildUserPrompt(ctx);

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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3, // slightly higher than translate — prose needs some variation
        max_tokens: 1200,
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      const errBody = await aiResp.text().catch(() => "");
      console.error("generate-whatsapp-summary gateway error:", status, errBody);
      await logGovernance({
        action: "generate_whatsapp_summary",
        payload: { filterName: ctx.filterName, itemCount: ctx.cappedItemCount },
        status: "error",
        error_message: `gateway_${status}`,
      });
      const code = status === 429 ? "rate_limited" : status === 402 ? "payment_required" : "gateway_error";
      return new Response(
        JSON.stringify({
          error: code,
          message: status === 429
            ? "Rate limits exceeded — please try again."
            : status === 402
              ? "Payment required."
              : "AI gateway error.",
        }),
        // Return 200 so Supabase client preserves the JSON body — non-2xx causes
        // functions.invoke() to discard the body and emit a generic error string.
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await aiResp.json();
    const raw: string =
      typeof data?.choices?.[0]?.message?.content === "string"
        ? data.choices[0].message.content
        : "";
    const generatedText = raw.trim();

    if (!generatedText) {
      await logGovernance({
        action: "generate_whatsapp_summary",
        payload: { filterName: ctx.filterName },
        status: "error",
        error_message: "empty_response",
      });
      return new Response(
        JSON.stringify({ error: "empty_response", message: "AI returned no text." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const warnings: string[] = [];
    if (ctx.isTruncated) {
      warnings.push(`Only ${ctx.cappedItemCount} of ${ctx.totalItemCount} items were included.`);
    }

    logGovernance({
      action: "generate_whatsapp_summary",
      payload: {
        filterName: ctx.filterName,
        itemCount: ctx.cappedItemCount,
        summaryType: ctx.options.summaryType,
        recipientRole: ctx.options.recipientRole,
        isTruncated: ctx.isTruncated,
      },
      status: "ok",
    }).catch(() => {});

    return new Response(
      JSON.stringify({
        generatedText,
        warnings,
        itemCountUsed: ctx.cappedItemCount,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("generate-whatsapp-summary unhandled error:", message);
    await logGovernance({
      action: "generate_whatsapp_summary",
      payload: {},
      status: "error",
      error_message: message,
    });
    return new Response(
      JSON.stringify({ error: "internal_error", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
