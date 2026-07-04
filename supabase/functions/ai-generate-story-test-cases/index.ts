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

type TestPriority = "critical" | "high" | "medium" | "low";
type TestStatus = "DRAFT" | "REVIEW" | "APPROVED";

interface GeneratedStep {
  step_number: number;
  action: string;
  test_data?: string;
  expected_result: string;
}

interface GeneratedCase {
  title: string;
  objective: string;
  preconditions: string;
  priority: TestPriority;
  status: TestStatus;
  steps: GeneratedStep[];
}

// P2-S9 (AI-003): the repo-wide `logGovernance()` pattern (used by ~10 other AI
// edge functions too) inserts into `ai_governance_audit_log` with columns
// (payload/status/error_message/source) that don't exist on that table's real
// schema (id/actor_id/contract_id/action/object_type/object_id/diff) — every
// call has been silently failing (0 rows, ever) behind the "audit must never
// block inference" catch. Fixed here for this function only, writing to
// `tm_ai_usage_log` (the actual usage-ledger table — has user_id/tokens_used/
// model/feature, exactly the usage-ledger shape this slice needs). The same
// bug in the other ~10 AI edge functions is out of this feature's scope —
// flagged separately rather than fixed here.
async function logUsage(params: {
  userId: string | null;
  projectId: string | null;
  model: string;
  tokensUsed: number | null;
  requestData: Record<string, unknown>;
  responseSummary: string;
}) {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !service) return;
    const sb = createClient(url, service, { auth: { persistSession: false } });
    await sb.from("tm_ai_usage_log").insert({
      user_id: params.userId,
      project_id: params.projectId,
      feature: "test_case_generation",
      model: params.model,
      tokens_used: params.tokensUsed,
      request_data: params.requestData,
      response_summary: params.responseSummary,
    } as never);
  } catch (_e) {
    /* audit must never block inference */
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth gate: a valid user JWT is required for every invocation. ──────
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) {
      return new Response(
        JSON.stringify({ error: "config_error", message: "Auth is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "unauthorized",
          message: "A valid user JWT is required",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── P2-S10 (AI-004): per-user daily quota + short cooldown, enforced
    //    server-side against the same tm_ai_usage_log ledger S9 now writes
    //    to (no separate counter table — the ledger already has every row
    //    needed to compute both checks).
    const DAILY_LIMIT = 20;
    const COOLDOWN_SECONDS = 10;
    {
      const url = Deno.env.get("SUPABASE_URL");
      const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (url && service) {
        const sbAdmin = createClient(url, service, { auth: { persistSession: false } });
        const dayStart = new Date();
        dayStart.setUTCHours(0, 0, 0, 0);
        const { count: usedToday } = await sbAdmin
          .from("tm_ai_usage_log")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("feature", "test_case_generation")
          .gte("created_at", dayStart.toISOString());
        if ((usedToday ?? 0) >= DAILY_LIMIT) {
          return new Response(
            JSON.stringify({
              error: "quota_exceeded",
              message: `Daily AI test-case generation limit (${DAILY_LIMIT}) reached. Try again tomorrow.`,
              test_cases: [],
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const { data: lastRow } = await sbAdmin
          .from("tm_ai_usage_log")
          .select("created_at")
          .eq("user_id", user.id)
          .eq("feature", "test_case_generation")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastRow?.created_at) {
          const elapsedMs = Date.now() - new Date(lastRow.created_at).getTime();
          if (elapsedMs < COOLDOWN_SECONDS * 1000) {
            return new Response(
              JSON.stringify({
                error: "cooldown",
                message: `Please wait ${Math.ceil((COOLDOWN_SECONDS * 1000 - elapsedMs) / 1000)}s before generating again.`,
                test_cases: [],
              }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        }
      }
    }

    const body = await req.json();

    // ── Mode discrimination. Default ("story") preserves the original
    //    request shape exactly; {mode:"prompt"} enables free-prompt generation.
    const mode: "story" | "prompt" = body?.mode === "prompt" ? "prompt" : "story";

    const storyKey: string =
      typeof body?.story_key === "string" ? body.story_key : "";
    const storySummary: string =
      typeof body?.story_summary === "string" ? body.story_summary : "";
    const storyDescription: string =
      typeof body?.story_description === "string" ? body.story_description : "";
    const acceptanceCriteria: string =
      typeof body?.acceptance_criteria === "string"
        ? body.acceptance_criteria
        : "";

    // Prompt-mode fields.
    const freePrompt: string =
      typeof body?.prompt === "string" ? body.prompt : "";
    const projectId: string =
      typeof body?.project_id === "string" ? body.project_id : "";
    const folderId: string =
      typeof body?.folder_id === "string" ? body.folder_id : "";
    const projectName: string =
      typeof body?.project_name === "string" ? body.project_name : "";
    const featureName: string =
      typeof body?.feature_name === "string" ? body.feature_name : "";
    const testTypeFocus: string =
      typeof body?.test_type === "string" ? body.test_type : "";
    const rawCount = typeof body?.count === "number" ? body.count : 10;
    // Hard ceiling of 10 cases in both modes.
    const maxCases = Math.min(Math.max(1, Math.floor(rawCount) || 10), 10);

    if (mode === "prompt") {
      if (!freePrompt.trim()) {
        return new Response(
          JSON.stringify({
            error: "invalid_input",
            message: "prompt is required when mode is 'prompt'",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    } else if (!storySummary.trim() && !storyDescription.trim()) {
      return new Response(
        JSON.stringify({
          error: "invalid_input",
          message: "story_summary or story_description is required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

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

    // Shared output contract: rules 4–6 + JSON shape are identical in both modes.
    const sharedRulesAndShape = `4. Each title is concise (under 90 chars), imperative, sentence case, no trailing punctuation.
5. Each test case has: title, objective (one-sentence purpose), preconditions (short paragraph or "None"), priority (one of: critical, high, medium, low), status ("DRAFT"), and 2–6 numbered steps.
6. Each step has: step_number (1-based), action (imperative), optional test_data (only when a concrete value matters), expected_result (observable outcome).

Return ONLY valid JSON. No markdown, no preamble, no code fences.
Shape:
{
  "test_cases": [
    {
      "title": "...",
      "objective": "...",
      "preconditions": "...",
      "priority": "high",
      "status": "DRAFT",
      "steps": [
        { "step_number": 1, "action": "...", "test_data": "...", "expected_result": "..." }
      ]
    }
  ]
}`;

    // Prompt: enforce max-cases ceiling + coverage rules. JSON-only output.
    const userPrompt =
      mode === "prompt"
        ? `You are a senior QA engineer designing a compact, high-coverage test suite from a free-form requirement description in an enterprise portfolio-management tool.

Project: ${projectName || "(unspecified)"}
Feature: ${featureName || "(unspecified)"}
Test type focus: ${testTypeFocus && testTypeFocus !== "all" ? testTypeFocus : "all types"}

Requirement description:
${freePrompt}

Rules — read carefully, they are non-negotiable:
1. Generate AT MOST ${maxCases} test cases. Fewer is fine when full coverage needs fewer.
2. Together, the test cases MUST achieve 100% coverage of the described behavior. If an aspect needs multiple tests to be fully covered, split it — but stay within the ${maxCases}-case ceiling by consolidating overlapping happy-path checks.
3. Blend: happy path, edge cases, negative / error paths, and permission/auth boundaries when relevant. Prefer breadth over redundancy.
${sharedRulesAndShape}`
        : `You are a senior QA engineer designing a compact, high-coverage test suite for a single user story in an enterprise portfolio-management tool.

Story key: ${storyKey || "(unknown)"}
Story summary: ${storySummary || "(none)"}
Story description:
${storyDescription || "(none)"}

Acceptance criteria:
${acceptanceCriteria || "(none)"}

Rules — read carefully, they are non-negotiable:
1. Generate AT MOST 10 test cases. Fewer is fine when full coverage needs fewer.
2. Together, the test cases MUST achieve 100% coverage of the story's stated behavior and every acceptance criterion. Do not omit an acceptance criterion. If a criterion needs multiple tests to be fully covered, split it — but stay within the 10-case ceiling by consolidating overlapping happy-path checks.
3. Blend: happy path, edge cases, negative / error paths, and permission/auth boundaries when relevant to the story. Prefer breadth over redundancy.
${sharedRulesAndShape}`;

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
              "You are a senior QA engineer. Return ONLY valid JSON. No markdown fences, no preamble.",
          },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        // 10 test cases × ~6 steps × verbose action/expected_result plus JSON
        // scaffolding easily runs 4–5k tokens. 6000 provides slack without
        // burning budget.
        max_tokens: 6000,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      const errBody = await aiResp.text().catch(() => "");
      console.error("ai-generate-story-test-cases gateway error:", status, errBody);
      await logUsage({
        userId: user.id,
        projectId: projectId || null,
        model: DEFAULT_MODEL,
        tokensUsed: null,
        requestData: {
          mode, story_key: storyKey, summary_len: storySummary.length,
          prompt_len: freePrompt.length, folder_id: folderId,
        },
        responseSummary: `error: gateway_${status}`,
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
                : `AI gateway error (${status})`,
          test_cases: [],
          diagnostic: { gatewayStatus: status, gatewayBody: errBody.slice(0, 2000) },
        }),
        {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const aiData = await aiResp.json();
    const rawText: string = aiData?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = null;
    let parseError: string | null = null;
    const clean = rawText.replace(/```json|```/g, "").trim();
    try {
      parsed = JSON.parse(clean);
    } catch (_e1) {
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch (e2) {
          parseError = e2 instanceof Error ? e2.message : String(e2);
        }
      } else {
        parseError = "no JSON object in response";
      }
    }

    if (!parsed || !Array.isArray(parsed.test_cases)) {
      await logUsage({
        userId: user.id,
        projectId: projectId || null,
        model: DEFAULT_MODEL,
        tokensUsed: aiData?.usage?.total_tokens ?? null,
        requestData: { mode, story_key: storyKey },
        responseSummary: `error: parse_error (${parseError ?? "unknown"})`,
      });
      return new Response(
        JSON.stringify({
          error: "parse_error",
          message: "AI returned unparseable output",
          test_cases: [],
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Sanitize + enforce ceiling.
    const validPriorities: TestPriority[] = ["critical", "high", "medium", "low"];
    const validStatuses: TestStatus[] = ["DRAFT", "REVIEW", "APPROVED"];
    const cleaned: GeneratedCase[] = [];
    for (const raw of parsed.test_cases as unknown[]) {
      if (cleaned.length >= maxCases) break;
      const c = raw as any;
      const title = typeof c?.title === "string" ? c.title.trim() : "";
      if (!title) continue;
      const priority: TestPriority = validPriorities.includes(c?.priority)
        ? c.priority
        : "medium";
      const status: TestStatus = validStatuses.includes(c?.status)
        ? c.status
        : "DRAFT";
      const stepsRaw = Array.isArray(c?.steps) ? c.steps : [];
      const steps: GeneratedStep[] = [];
      for (const s of stepsRaw as unknown[]) {
        const st = s as any;
        const action = typeof st?.action === "string" ? st.action.trim() : "";
        const expected =
          typeof st?.expected_result === "string" ? st.expected_result.trim() : "";
        if (!action || !expected) continue;
        steps.push({
          step_number: steps.length + 1,
          action,
          test_data:
            typeof st?.test_data === "string" && st.test_data.trim()
              ? st.test_data.trim()
              : undefined,
          expected_result: expected,
        });
      }
      cleaned.push({
        title: title.slice(0, 240),
        objective:
          typeof c?.objective === "string" ? c.objective.trim().slice(0, 500) : "",
        preconditions:
          typeof c?.preconditions === "string"
            ? c.preconditions.trim().slice(0, 500)
            : "",
        priority,
        status,
        steps,
      });
    }

    await logUsage({
      userId: user.id,
      projectId: projectId || null,
      model: DEFAULT_MODEL,
      tokensUsed: aiData?.usage?.total_tokens ?? null,
      requestData: {
        mode, story_key: storyKey, summary_len: storySummary.length,
        prompt_len: freePrompt.length, folder_id: folderId,
      },
      responseSummary: `generated ${cleaned.length} test case(s)`,
    });

    return new Response(
      JSON.stringify({ test_cases: cleaned, model: DEFAULT_MODEL }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("ai-generate-story-test-cases unexpected error:", err);
    return new Response(
      JSON.stringify({
        error: "internal_error",
        message: err instanceof Error ? err.message : "Unknown error",
        test_cases: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
