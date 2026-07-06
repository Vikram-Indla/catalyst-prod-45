// ============================================================================
// ai-tm-assist — parameterized TestHub AI operations (CAT-TESTHUB-V2 slice H1).
//
// One governed function, nine operations (generation itself stays in
// ai-generate-test-artefacts):
//   complete | improve | correct | convert_uat   — case-edit ops (draft output)
//   coverage | gaps                              — analysis ops
//   link_suggest                                 — traceability suggestions
//   sprint_risk | release_risk                   — quality-plane risk summaries
//
// Server-side context assembly (service role), JWT gate + daily quota +
// cooldown via tm_ai_usage_log (same ledger as the generator), structured
// outputs per op family, language en|ar. All case-edit output is DRAFT ONLY —
// the client must route it through explicit accept/reject before any write.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

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

type Op =
  | "complete"
  | "improve"
  | "correct"
  | "convert_uat"
  | "coverage"
  | "gaps"
  | "link_suggest"
  | "sprint_risk"
  | "release_risk";

const OPS: Op[] = [
  "complete", "improve", "correct", "convert_uat",
  "coverage", "gaps", "link_suggest", "sprint_risk", "release_risk",
];

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
  feature: string;
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
      feature: p.feature,
      model: MODEL,
      tokens_used: p.tokensUsed,
      request_data: p.requestData,
      response_summary: p.responseSummary,
    } as never);
  } catch (_e) {
    /* audit must never block inference */
  }
}

// ── Output schemas per op family ─────────────────────────────────────────────
const STEP = {
  type: "object",
  additionalProperties: false,
  required: ["step_number", "action", "expected_result", "test_data"],
  properties: {
    step_number: { type: "integer" },
    action: { type: "string" },
    expected_result: { type: "string" },
    test_data: { type: "string" },
  },
};

const CASE_EDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["updated_case", "changes", "rationale"],
  properties: {
    updated_case: {
      type: "object",
      additionalProperties: false,
      required: ["title", "objective", "preconditions", "steps"],
      properties: {
        title: { type: "string" },
        objective: { type: "string" },
        preconditions: { type: "string" },
        steps: { type: "array", items: STEP },
      },
    },
    changes: { type: "array", items: { type: "string" } },
    rationale: { type: "string" },
  },
};

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["covered", "gaps", "suggestions"],
  properties: {
    covered: { type: "array", items: { type: "string" } },
    gaps: { type: "array", items: { type: "string" } },
    suggestions: { type: "array", items: { type: "string" } },
  },
};

const LINK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["suggestions"],
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["external_key", "requirement_type", "reason"],
        properties: {
          external_key: { type: "string" },
          requirement_type: {
            type: "string",
            enum: ["story", "epic", "feature", "business_request", "defect", "incident", "task"],
          },
          reason: { type: "string" },
        },
      },
    },
  },
};

const RISK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["risk_level", "summary", "top_risks", "recommendations"],
  properties: {
    risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
    summary: { type: "string" },
    top_risks: { type: "array", items: { type: "string" } },
    recommendations: { type: "array", items: { type: "string" } },
  },
};

function schemaFor(op: Op) {
  if (op === "coverage" || op === "gaps") return { name: "tm_analysis", schema: ANALYSIS_SCHEMA };
  if (op === "link_suggest") return { name: "tm_links", schema: LINK_SCHEMA };
  if (op === "sprint_risk" || op === "release_risk") return { name: "tm_risk", schema: RISK_SCHEMA };
  return { name: "tm_case_edit", schema: CASE_EDIT_SCHEMA };
}

const OP_INSTRUCTIONS: Record<Op, string> = {
  complete:
    "Complete this partially-authored manual test case: fill missing steps, preconditions and objective so the stated intent is fully executable. Preserve everything the author already wrote unless it is contradictory; list every addition in changes.",
  improve:
    "Improve this test case's quality: sharpen the title, make steps atomic and verifiable, add concrete test_data on boundary/negative steps, tighten expected results. Preserve intent; list every change.",
  correct:
    "Correct defects in this test case: fix contradictions, wrong expected results, steps that don't match the linked requirement, ordering problems. Only change what is wrong; list each correction and why.",
  convert_uat:
    "Convert this functional test case into UAT language: business-readable, persona-driven ('As the finance approver…'), jargon-free steps a business user can execute, acceptance phrased as business outcomes. Keep traceability to the same behaviour.",
  coverage:
    "Audit the coverage of the EXISTING test cases against the requirement source. covered[] = behaviours/criteria with at least one case (name it). gaps[] = uncovered behaviours, edge cases, negative paths, boundaries. suggestions[] = one-line new-case titles that would close each gap.",
  gaps:
    "Find coverage gaps across this scope. covered[] = well-tested areas. gaps[] = untested or thinly-tested behaviours, integration seams, failure modes. suggestions[] = concrete one-line case titles to close them, highest risk first.",
  link_suggest:
    "Suggest work items this test case should be linked to for traceability. Only suggest from the CANDIDATE ITEMS provided — never invent keys. Give a one-line reason per suggestion; omit weak matches.",
  sprint_risk:
    "Summarize this sprint's testing risk for an engineering manager deciding signoff. Ground every statement in the numbers provided; do not invent data. risk_level reflects blockers > failures > coverage gaps > unexecuted scope.",
  release_risk:
    "Summarize this release's testing risk for a go/no-go decision. Ground every statement in the numbers provided; do not invent data. Blocking defects or failed tests force high/critical.",
};

function systemPrompt(op: Op, language: "en" | "ar") {
  const lang =
    language === "ar"
      ? "Respond in Modern Standard Arabic (العربية الفصحى). Keys/identifiers stay in Latin script."
      : "Respond in English.";
  return `You are a principal SDET working inside an enterprise test-management platform.
${OP_INSTRUCTIONS[op]}
Never invent behaviour absent from the source. Unknown stays unknown — say so rather than fabricate.
${lang}
Return your answer through the structured output schema only.`;
}

// ── Context assembly helpers ─────────────────────────────────────────────────
async function caseContext(sb: any, caseKey: string, projectId: string | null) {
  let q = sb
    .from("tm_test_cases")
    .select("id, case_key, title, description, preconditions, expected_result, status, origin, project_id")
    .eq("case_key", caseKey);
  if (projectId) q = q.eq("project_id", projectId);
  const { data: tc } = await q.limit(1).maybeSingle();
  if (!tc) return null;
  const { data: steps } = await sb
    .from("tm_test_steps")
    .select("step_number, action, expected_result, test_data")
    .eq("test_case_id", tc.id)
    .is("deleted_at", null)
    .order("step_number");
  const { data: links } = await sb
    .from("tm_requirement_links")
    .select("external_key, requirement_type, external_title")
    .eq("test_case_id", tc.id)
    .limit(10);
  const stepLines = (steps ?? [])
    .map((s: any) => `${s.step_number}. ACTION: ${s.action ?? ""} | EXPECTED: ${s.expected_result ?? ""} | DATA: ${s.test_data ?? ""}`)
    .join("\n");
  const linkLines = (links ?? [])
    .map((l: any) => `- ${l.requirement_type} ${l.external_key}: ${l.external_title ?? ""}`)
    .join("\n");
  return {
    row: tc,
    block: [
      `TEST CASE ${tc.case_key} (status: ${tc.status}, origin: ${tc.origin ?? "manual"})`,
      `Title: ${tc.title}`,
      `Objective/description: ${tc.description ?? "(none)"}`,
      `Preconditions: ${tc.preconditions ?? "(none)"}`,
      `Expected result: ${tc.expected_result ?? "(none)"}`,
      `Steps:\n${stepLines || "(no steps)"}`,
      linkLines ? `Linked requirements:\n${linkLines}` : "Linked requirements: (none)",
    ].join("\n"),
  };
}

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
    if (authError || !user) return j({ error: "unauthorized", message: "A valid user JWT is required" }, 401);

    const body = await req.json();
    const op: Op | null = OPS.includes(body?.op) ? body.op : null;
    if (!op) return j({ error: "invalid_input", message: `op must be one of ${OPS.join(", ")}` }, 400);
    const language: "en" | "ar" = body?.language === "ar" ? "ar" : "en";
    const projectId: string | null = typeof body?.project_id === "string" ? body.project_id : null;
    const FEATURE = `tm_assist_${op}`;

    // ── Quota + cooldown (shared tm_ai_usage_log ledger) ───────────────────
    const DAILY_LIMIT = 60;
    const COOLDOWN_SECONDS = 5;
    const sbAdmin = admin();
    if (sbAdmin) {
      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0);
      const { count: usedToday } = await sbAdmin
        .from("tm_ai_usage_log")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .like("feature", "tm_assist_%")
        .gte("created_at", dayStart.toISOString());
      if ((usedToday ?? 0) >= DAILY_LIMIT)
        return j({ error: "quota_exceeded", message: `Daily AI assist limit (${DAILY_LIMIT}) reached.` }, 429);
      const { data: lastRow } = await sbAdmin
        .from("tm_ai_usage_log")
        .select("created_at")
        .eq("user_id", user.id)
        .like("feature", "tm_assist_%")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastRow?.created_at) {
        const elapsed = Date.now() - new Date(lastRow.created_at).getTime();
        if (elapsed < COOLDOWN_SECONDS * 1000)
          return j({ error: "cooldown", message: `Please wait ${Math.ceil((COOLDOWN_SECONDS * 1000 - elapsed) / 1000)}s.` }, 429);
      }
    }

    // ── Server-side context assembly per op ────────────────────────────────
    const sb = sbAdmin ?? authClient;
    let contextBlock = "";
    let anchor = "";

    if (op === "complete" || op === "improve" || op === "correct" || op === "convert_uat" || op === "coverage" || op === "link_suggest") {
      const caseKey = typeof body?.case_key === "string" ? body.case_key : "";
      if (!caseKey) return j({ error: "invalid_input", message: "case_key is required for this op" }, 400);
      const ctx = await caseContext(sb, caseKey, projectId);
      if (!ctx) return j({ error: "not_found", message: `Test case ${caseKey} not found` }, 404);
      anchor = caseKey;
      contextBlock = ctx.block;

      if (op === "coverage") {
        // Requirement source for the audit: linked work item description(s)
        const { data: links } = await sb
          .from("tm_requirement_links")
          .select("external_key")
          .eq("test_case_id", ctx.row.id)
          .limit(3);
        for (const l of links ?? []) {
          const { data: issue } = await sb
            .from("ph_issues")
            .select("issue_key, summary, description_adf")
            .eq("issue_key", (l as any).external_key)
            .maybeSingle();
          if (issue) {
            contextBlock += `\n\nREQUIREMENT SOURCE ${(issue as any).issue_key}: ${(issue as any).summary ?? ""}`;
          }
        }
      }
      if (op === "link_suggest") {
        // Candidate items: same-project recent work items + open defects
        const { data: candidates } = await sb
          .from("ph_issues")
          .select("issue_key, issue_type, summary")
          .order("updated_at", { ascending: false })
          .limit(60);
        const lines = (candidates ?? [])
          .map((c: any) => `- ${c.issue_key} (${c.issue_type}): ${c.summary}`)
          .join("\n");
        contextBlock += `\n\nCANDIDATE ITEMS (suggest only from these):\n${lines || "(none)"}`;
      }
    } else if (op === "gaps") {
      const issueKey = typeof body?.issue_key === "string" ? body.issue_key : "";
      anchor = issueKey || "project";
      if (issueKey) {
        const { data: issue } = await sb
          .from("ph_issues")
          .select("issue_key, issue_type, summary, description_adf")
          .eq("issue_key", issueKey)
          .maybeSingle();
        if (!issue) return j({ error: "not_found", message: `Work item ${issueKey} not found` }, 404);
        const { data: links } = await sb
          .from("tm_requirement_links")
          .select("test_case_id")
          .eq("external_key", issueKey);
        const ids = (links ?? []).map((l: any) => l.test_case_id);
        let existing: any[] = [];
        if (ids.length > 0) {
          const { data } = await sb.from("tm_test_cases").select("case_key, title").in("id", ids).limit(60);
          existing = data ?? [];
        }
        contextBlock = [
          `SCOPE: work item ${(issue as any).issue_key} (${(issue as any).issue_type}) — ${(issue as any).summary ?? ""}`,
          `EXISTING LINKED CASES:\n${existing.map((c) => `- ${c.case_key}: ${c.title}`).join("\n") || "(none)"}`,
        ].join("\n\n");
      } else {
        if (!projectId) return j({ error: "invalid_input", message: "issue_key or project_id required for gaps" }, 400);
        const { data: cases } = await sb
          .from("tm_test_cases")
          .select("case_key, title, status")
          .eq("project_id", projectId)
          .limit(150);
        contextBlock = `SCOPE: whole test project.\nEXISTING CASES:\n${(cases ?? []).map((c: any) => `- ${c.case_key} [${c.status}]: ${c.title}`).join("\n") || "(none)"}`;
      }
    } else if (op === "sprint_risk") {
      const sprintId = typeof body?.sprint_id === "string" ? body.sprint_id : "";
      if (!sprintId) return j({ error: "invalid_input", message: "sprint_id is required" }, 400);
      anchor = sprintId;
      const { data: health, error: hErr } = await sb.rpc("tm_compute_sprint_test_health", { p_sprint_id: sprintId });
      if (hErr) return j({ error: "internal_error", message: hErr.message }, 500);
      contextBlock = `SPRINT TEST HEALTH (computed now — the only ground truth):\n${JSON.stringify(health, null, 2)}`;
    } else if (op === "release_risk") {
      const releaseId = typeof body?.release_id === "string" ? body.release_id : "";
      if (!releaseId) return j({ error: "invalid_input", message: "release_id is required" }, 400);
      anchor = releaseId;
      const { data: gate, error: gErr } = await sb.rpc("tm_compute_ph_release_gate", { p_release_id: releaseId });
      if (gErr) return j({ error: "internal_error", message: gErr.message }, 500);
      contextBlock = `RELEASE TEST GATE (computed now — the only ground truth):\n${JSON.stringify(gate, null, 2)}`;
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY)
      return j({ error: "config_error", message: "ANTHROPIC_API_KEY is not configured" }, 500);

    const { name, schema } = schemaFor(op);
    const aiResp = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        thinking: { type: "adaptive" },
        output_config: {
          effort: "medium",
          format: { type: "json_schema", name, schema },
        },
        system: systemPrompt(op, language),
        messages: [{ role: "user", content: contextBlock }],
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      const errBody = await aiResp.text().catch(() => "");
      console.error("ai-tm-assist anthropic error:", status, errBody);
      await logUsage({
        userId: user.id, projectId, feature: FEATURE, tokensUsed: null,
        requestData: { op, anchor, language },
        responseSummary: `error: anthropic_${status}`,
      });
      const code = status === 429 ? "rate_limited" : status === 401 || status === 403 ? "auth_error" : "gateway_error";
      return j({ error: code, message: status === 429 ? "Rate limited — retry shortly." : `AI gateway error (${status})` }, status);
    }

    const aiData = await aiResp.json();
    if (aiData?.stop_reason === "refusal") {
      await logUsage({ userId: user.id, projectId, feature: FEATURE, tokensUsed: aiData?.usage?.output_tokens ?? null, requestData: { op, anchor, language }, responseSummary: "refusal" });
      return j({ error: "refusal", message: "The model declined this request." }, 200);
    }
    const textBlock = Array.isArray(aiData?.content)
      ? aiData.content.find((b: any) => b?.type === "text")?.text ?? ""
      : "";
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(textBlock);
    } catch (_e) {
      const m = String(textBlock).match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch { /* fallthrough */ } }
    }
    if (!parsed) {
      await logUsage({ userId: user.id, projectId, feature: FEATURE, tokensUsed: aiData?.usage?.output_tokens ?? null, requestData: { op, anchor, language }, responseSummary: "error: parse_error" });
      return j({ error: "parse_error", message: "AI returned unparseable output" }, 502);
    }

    await logUsage({
      userId: user.id,
      projectId,
      feature: FEATURE,
      tokensUsed: (aiData?.usage?.input_tokens ?? 0) + (aiData?.usage?.output_tokens ?? 0) || null,
      requestData: { op, anchor, language },
      responseSummary: `ok: ${op}`,
    });

    // Draft-only contract: the result is a proposal; persisting anything is an
    // explicit, human-reviewed client action.
    return j({ op, anchor, language, draft_only: true, result: parsed, model: MODEL });
  } catch (err) {
    console.error("ai-tm-assist unexpected error:", err);
    return j({ error: "internal_error", message: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
