// ============================================================================
// ai-generate-test-artefacts — high-grade AI test-artefact generation.
//
// CAT-TESTHUB-REBUILD-20260704-001 Phase C. Replaces the "cheap" Gemini-Flash
// title+paragraph generator (ai-generate-story-test-cases) with a Claude
// (claude-opus-4-8) generator that (1) assembles REAL context server-side from
// a project work item / defect / incident, (2) returns per-case test_type +
// coverage_area + AC/defect/incident traceability + a coverage map, and (3)
// uses structured outputs so the JSON contract is guaranteed, not best-effort.
//
// Client passes only an id/key + source mode — the server does the DB gather
// (service role) so context can't be spoofed by the caller. Governance
// (JWT gate, daily quota, cooldown, tm_ai_usage_log) mirrors the legacy fn.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Pinned 2.39.0 predates this project's ES256 (asymmetric) JWT signing keys —
// its auth.getUser() rejects valid current tokens even though GoTrue itself
// accepts them. Floating @2 matches the proven-working login-with-audit fn.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-8";
const FEATURE = "test_artefact_generation";

type SourceMode = "work_item" | "defect" | "incident" | "prompt";

const j = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function admin() {
  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) return null;
  return createClient(url, service, { auth: { persistSession: false } });
}

async function logUsage(p: {
  userId: string | null;
  projectId: string | null;
  tokensUsed: number | null;
  requestData: Record<string, unknown>;
  responseSummary: string;
}) {
  try {
    const sb = admin();
    if (!sb) return;
    await sb.from("tm_ai_usage_log").insert({
      user_id: p.userId,
      project_id: p.projectId,
      feature: FEATURE,
      model: MODEL,
      tokens_used: p.tokensUsed,
      request_data: p.requestData,
      response_summary: p.responseSummary,
    } as never);
  } catch (_e) {
    /* audit must never block inference */
  }
}

/** Best-effort ADF → plain text (handles the {type,content,text} node tree). */
function adfToText(adf: unknown): string {
  if (!adf) return "";
  if (typeof adf === "string") return adf;
  const out: string[] = [];
  const walk = (n: any) => {
    if (!n || typeof n !== "object") return;
    if (typeof n.text === "string") out.push(n.text);
    if (Array.isArray(n.content)) n.content.forEach(walk);
  };
  walk(adf);
  return out.join(" ").replace(/\s+/g, " ").trim();
}

// ── Structured-output schema (Claude json_schema; strict shape) ─────────────
const CASE_STEP = {
  type: "object",
  additionalProperties: false,
  required: ["step_number", "action", "expected_result", "test_data"],
  properties: {
    step_number: { type: "integer" },
    action: { type: "string" },
    expected_result: { type: "string" },
    test_data: { type: "string" }, // "" when no concrete value is needed
  },
};
const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["test_cases", "coverage_map", "gaps"],
  properties: {
    test_cases: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "objective",
          "preconditions",
          "priority",
          "priority_rationale",
          "test_type",
          "type_rationale",
          "coverage_area",
          "covers",
          "similar_to_existing",
          "steps",
        ],
        properties: {
          title: { type: "string" },
          objective: { type: "string" },
          preconditions: { type: "string" },
          priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
          priority_rationale: { type: "string" },
          test_type: {
            type: "string",
            enum: ["functional", "api", "security", "performance", "integration", "regression"],
          },
          type_rationale: { type: "string" },
          coverage_area: {
            type: "string",
            enum: ["happy", "negative", "boundary", "security", "performance", "integration"],
          },
          covers: { type: "array", items: { type: "string" } },
          similar_to_existing: { type: "boolean" },
          steps: { type: "array", items: CASE_STEP },
        },
      },
    },
    coverage_map: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["requirement", "case_indices"],
        properties: {
          requirement: { type: "string" },
          case_indices: { type: "array", items: { type: "integer" } },
        },
      },
    },
    gaps: { type: "array", items: { type: "string" } },
  },
};

const SYSTEM_PROMPT = `You are a principal SDET designing enterprise-grade manual test suites.

Invariant contract — follow exactly:
- Enumerate every acceptance criterion / behaviour / failure mode in the source FIRST, map each to at least one case, THEN emit cases. Return that mapping in coverage_map, and list anything you could NOT cover in gaps.
- Blend coverage areas: happy, negative, boundary, security, performance, integration — as the source warrants. Do not emit only happy-path checks.
- Every case: a concise imperative title (sentence case, no trailing punctuation), a one-sentence objective, structured preconditions ("None" if truly none), a priority WITH a one-line rationale grounded in the source's own priority/severity, a test_type WITH a one-line rationale, a coverage_area, and 2–8 numbered steps. Put a concrete value in test_data on every boundary and negative step; use "" only when no concrete value is needed.
- covers[] MUST tag each case with the source anchors it verifies (e.g. "AC-2", "defect-DEF-14", "incident-INC-9"). Never leave covers[] empty.
- similar_to_existing = true when a case substantially duplicates one of the EXISTING TEST CASES provided; still return it (the reviewer decides), just flag it.
- Do not invent behaviour that is not implied by the source. If the source is thin, cover what is stated and record the rest in gaps rather than fabricating.

Example of one well-formed case (for shape only):
{"title":"Reject checkout when cart drops below the tier-2 discount threshold","objective":"Verify the tier-2 discount is removed the instant the cart total falls under the threshold.","preconditions":"Cart seeded at exactly the tier-2 threshold value.","priority":"high","priority_rationale":"Source story is High and the discount is revenue-affecting.","test_type":"functional","type_rationale":"Business-rule behaviour, no API/security surface.","coverage_area":"boundary","covers":["AC-3"],"similar_to_existing":false,"steps":[{"step_number":1,"action":"Remove one item so the cart total falls one cent below the tier-2 threshold","expected_result":"Discount recalculates to tier-1 immediately","test_data":"threshold = 500.00, remove item priced 0.01"}]}

Return your answer through the structured output schema only.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ── Auth gate ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) return j({ error: "config_error", message: "Auth is not configured" }, 500);
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return j({ error: "unauthorized", message: "A valid user JWT is required", test_cases: [] }, 401);

    // ── Quota + cooldown (same ledger the legacy fn uses) ──────────────────
    const DAILY_LIMIT = 30;
    const COOLDOWN_SECONDS = 8;
    const sbAdmin = admin();
    if (sbAdmin) {
      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0);
      const { count: usedToday } = await sbAdmin
        .from("tm_ai_usage_log")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("feature", FEATURE)
        .gte("created_at", dayStart.toISOString());
      if ((usedToday ?? 0) >= DAILY_LIMIT)
        return j({ error: "quota_exceeded", message: `Daily AI generation limit (${DAILY_LIMIT}) reached.`, test_cases: [] }, 429);
      const { data: lastRow } = await sbAdmin
        .from("tm_ai_usage_log")
        .select("created_at")
        .eq("user_id", user.id)
        .eq("feature", FEATURE)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastRow?.created_at) {
        const elapsed = Date.now() - new Date(lastRow.created_at).getTime();
        if (elapsed < COOLDOWN_SECONDS * 1000)
          return j({ error: "cooldown", message: `Please wait ${Math.ceil((COOLDOWN_SECONDS * 1000 - elapsed) / 1000)}s before generating again.`, test_cases: [] }, 429);
      }
    }

    const body = await req.json();
    const mode: SourceMode = ["work_item", "defect", "incident", "prompt"].includes(body?.source)
      ? body.source
      : "work_item";
    const projectId: string | null = typeof body?.project_id === "string" ? body.project_id : null;
    const rawCount = typeof body?.count === "number" ? body.count : 12;
    const maxCases = Math.min(Math.max(1, Math.floor(rawCount) || 12), 20);

    // ── Server-side context assembly ───────────────────────────────────────
    const sb = sbAdmin ?? authClient;
    let contextBlock = "";
    let anchorLabel = "";

    if (mode === "prompt") {
      const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
      if (!prompt) return j({ error: "invalid_input", message: "prompt is required for source 'prompt'", test_cases: [] }, 400);
      anchorLabel = "free-prompt";
      contextBlock = `SOURCE: free-form requirement.\n${prompt}\n\nAnchor covers[] entries to "requirement-1..n" describing the behaviours you infer.`;
    } else if (mode === "work_item") {
      const key = typeof body?.issue_key === "string" ? body.issue_key : "";
      if (!key) return j({ error: "invalid_input", message: "issue_key is required for source 'work_item'", test_cases: [] }, 400);
      anchorLabel = key;
      const { data: issue } = await sb
        .from("ph_issues")
        .select("issue_key, issue_type, summary, description_adf, priority, status, parent_key")
        .eq("issue_key", key)
        .maybeSingle();
      if (!issue) return j({ error: "not_found", message: `Work item ${key} not found`, test_cases: [] }, 404);
      const desc = adfToText((issue as any).description_adf);
      // Child sub-tasks / linked items for domain context (titles only).
      const { data: children } = await sb
        .from("ph_issues")
        .select("issue_key, issue_type, summary")
        .eq("parent_key", key)
        .limit(25);
      // Existing coverage (dedup set).
      const { data: existing } = await sb
        .from("tm_test_cases")
        .select("title, objective")
        .eq("linked_story_key", key)
        .limit(50);
      const childLines = (children ?? []).map((c: any) => `- ${c.issue_key} (${c.issue_type}): ${c.summary}`).join("\n");
      const existingLines = (existing ?? []).map((c: any) => `- ${c.title}`).join("\n");
      contextBlock = [
        `SOURCE: project work item (${(issue as any).issue_type}).`,
        `Key: ${(issue as any).issue_key}`,
        `Priority: ${(issue as any).priority ?? "unspecified"}`,
        `Summary: ${(issue as any).summary ?? ""}`,
        `Description / acceptance criteria (index each criterion AC-1..n for traceability):`,
        desc || "(none provided)",
        childLines ? `\nChild / linked items (domain context):\n${childLines}` : "",
        existingLines ? `\nEXISTING TEST CASES (flag substantial duplicates with similar_to_existing):\n${existingLines}` : "",
        `\nGenerate cases covering this item's behaviour and every acceptance criterion. Reason about priority relative to the item's own priority.`,
      ].filter(Boolean).join("\n");
    } else if (mode === "defect") {
      const key = typeof body?.defect_key === "string" ? body.defect_key : "";
      if (!key) return j({ error: "invalid_input", message: "defect_key is required for source 'defect'", test_cases: [] }, 400);
      anchorLabel = key;
      const { data: defect } = await sb
        .from("tm_defects")
        .select("defect_key, title, description, severity, parent_key, expected_result, actual_result")
        .eq("defect_key", key)
        .maybeSingle();
      if (!defect) return j({ error: "not_found", message: `Defect ${key} not found`, test_cases: [] }, 404);
      contextBlock = [
        `SOURCE: defect (generate REGRESSION cases that would have caught it).`,
        `Key: ${(defect as any).defect_key}`,
        `Severity: ${(defect as any).severity ?? "unspecified"}`,
        `Title: ${(defect as any).title ?? ""}`,
        `Description / steps to reproduce: ${adfToText((defect as any).description) || "(none)"}`,
        `Expected: ${adfToText((defect as any).expected_result) || "(none)"}`,
        `Actual: ${adfToText((defect as any).actual_result) || "(none)"}`,
        `\nProduce: (1) one reproduction case that fails on the buggy behaviour, (2) regression cases covering the failure class and adjacent boundaries. covers[] must include "defect-${(defect as any).defect_key}". Priority skews high/critical (a shipped defect).`,
      ].join("\n");
    } else if (mode === "incident") {
      const key = typeof body?.incident_key === "string" ? body.incident_key : "";
      if (!key) return j({ error: "invalid_input", message: "incident_key is required for source 'incident'", test_cases: [] }, 400);
      anchorLabel = key;
      const { data: incident } = await sb
        .from("incidents")
        .select("incident_key, title, description, severity, impact")
        .eq("incident_key", key)
        .maybeSingle();
      if (!incident) return j({ error: "not_found", message: `Incident ${key} not found`, test_cases: [] }, 404);
      contextBlock = [
        `SOURCE: production incident (generate VALIDATION + REGRESSION scenarios).`,
        `Key: ${(incident as any).incident_key}`,
        `Severity: ${(incident as any).severity ?? "unspecified"}`,
        `Title: ${(incident as any).title ?? ""}`,
        `Description: ${adfToText((incident as any).description) || "(none)"}`,
        `Impact: ${adfToText((incident as any).impact) || "(none)"}`,
        `\nProduce: (1) validation scenarios confirming the fix holds, (2) regression scenarios for the failure mode incl. monitoring/alerting checks, (3) resilience/negative cases for the incident class. covers[] must include "incident-${(incident as any).incident_key}".`,
      ].join("\n");
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY)
      return j({ error: "config_error", message: "ANTHROPIC_API_KEY is not configured", test_cases: [] }, 500);

    const userMessage = `${contextBlock}\n\nGenerate AT MOST ${maxCases} test cases. Fewer is fine when full coverage needs fewer; more coverage over redundancy.`;

    const aiResp = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        thinking: { type: "adaptive" },
        output_config: {
          effort: "high",
          format: { type: "json_schema", name: "test_artefacts", schema: OUTPUT_SCHEMA },
        },
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      const errBody = await aiResp.text().catch(() => "");
      console.error("ai-generate-test-artefacts anthropic error:", status, errBody);
      await logUsage({
        userId: user.id,
        projectId,
        tokensUsed: null,
        requestData: { mode, anchor: anchorLabel },
        responseSummary: `error: anthropic_${status}`,
      });
      const code = status === 429 ? "rate_limited" : status === 401 || status === 403 ? "auth_error" : "gateway_error";
      return j(
        {
          error: code,
          message: status === 429 ? "Rate limits exceeded, please try again shortly." : `AI gateway error (${status})`,
          test_cases: [],
          diagnostic: { status, body: errBody.slice(0, 1500) },
        },
        status,
      );
    }

    const aiData = await aiResp.json();
    // stop_reason refusal guard.
    if (aiData?.stop_reason === "refusal") {
      await logUsage({ userId: user.id, projectId, tokensUsed: aiData?.usage?.output_tokens ?? null, requestData: { mode, anchor: anchorLabel }, responseSummary: "refusal" });
      return j({ error: "refusal", message: "The model declined this request.", test_cases: [] }, 200);
    }
    // Extract the text block (structured output arrives as JSON text).
    const textBlock = Array.isArray(aiData?.content)
      ? aiData.content.find((b: any) => b?.type === "text")?.text ?? ""
      : "";
    let parsed: any = null;
    try {
      parsed = JSON.parse(textBlock);
    } catch (_e) {
      const m = String(textBlock).match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch { /* fallthrough */ } }
    }
    if (!parsed || !Array.isArray(parsed.test_cases)) {
      await logUsage({ userId: user.id, projectId, tokensUsed: aiData?.usage?.output_tokens ?? null, requestData: { mode, anchor: anchorLabel }, responseSummary: "error: parse_error" });
      return j({ error: "parse_error", message: "AI returned unparseable output", test_cases: [] }, 502);
    }

    // ── Sanitize (defense-in-depth even with structured outputs) ───────────
    const PRI = ["critical", "high", "medium", "low"];
    const TYPES = ["functional", "api", "security", "performance", "integration", "regression"];
    const AREAS = ["happy", "negative", "boundary", "security", "performance", "integration"];
    const cleaned: any[] = [];
    for (const raw of parsed.test_cases as any[]) {
      if (cleaned.length >= maxCases) break;
      const title = typeof raw?.title === "string" ? raw.title.trim() : "";
      if (!title) continue;
      const steps: any[] = [];
      for (const s of Array.isArray(raw?.steps) ? raw.steps : []) {
        const action = typeof s?.action === "string" ? s.action.trim() : "";
        const expected = typeof s?.expected_result === "string" ? s.expected_result.trim() : "";
        if (!action || !expected) continue;
        steps.push({
          step_number: steps.length + 1,
          action,
          expected_result: expected,
          test_data: typeof s?.test_data === "string" && s.test_data.trim() ? s.test_data.trim() : null,
        });
      }
      cleaned.push({
        title: title.slice(0, 240),
        objective: typeof raw?.objective === "string" ? raw.objective.trim().slice(0, 600) : "",
        preconditions: typeof raw?.preconditions === "string" ? raw.preconditions.trim().slice(0, 800) : "",
        priority: PRI.includes(raw?.priority) ? raw.priority : "medium",
        priority_rationale: typeof raw?.priority_rationale === "string" ? raw.priority_rationale.slice(0, 300) : "",
        // test_type is RETURNED per case and persisted — never fabricated uniform.
        test_type: TYPES.includes(raw?.test_type) ? raw.test_type : "functional",
        type_rationale: typeof raw?.type_rationale === "string" ? raw.type_rationale.slice(0, 300) : "",
        coverage_area: AREAS.includes(raw?.coverage_area) ? raw.coverage_area : "happy",
        covers: Array.isArray(raw?.covers) ? raw.covers.filter((x: unknown) => typeof x === "string").slice(0, 20) : [],
        similar_to_existing: raw?.similar_to_existing === true,
        steps,
      });
    }

    const coverageMap = Array.isArray(parsed.coverage_map) ? parsed.coverage_map : [];
    const gaps = Array.isArray(parsed.gaps) ? parsed.gaps.filter((x: unknown) => typeof x === "string") : [];

    await logUsage({
      userId: user.id,
      projectId,
      tokensUsed: (aiData?.usage?.input_tokens ?? 0) + (aiData?.usage?.output_tokens ?? 0) || null,
      requestData: { mode, anchor: anchorLabel, requested: maxCases },
      responseSummary: `generated ${cleaned.length} case(s), ${gaps.length} gap(s)`,
    });

    return j({ test_cases: cleaned, coverage_map: coverageMap, gaps, model: MODEL, source: mode, anchor: anchorLabel });
  } catch (err) {
    console.error("ai-generate-test-artefacts unexpected error:", err);
    return j({ error: "internal_error", message: err instanceof Error ? err.message : "Unknown error", test_cases: [] }, 500);
  }
});
