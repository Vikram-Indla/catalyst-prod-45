import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IMPROVE_INSTRUCTIONS: Record<string, string> = {
  improve_clarify: "Rewrite for clarity, fix grammar, add missing detail",
  expand_detail: "Expand into a full story with context and examples",
  add_acceptance_criteria: "Generate Given/When/Then acceptance criteria",
  convert_user_story:
    'Rewrite as "As a [user], I want [action], so that [benefit]"',
  shorten_focus: "Shorten, remove redundancy, sharpen scope",
  add_edge_cases:
    "Add edge cases and failure conditions to acceptance criteria",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3-flash-preview";

// Best-effort audit logger. Never throws — a logging failure must not fail
// the request. Scoped to the deployed ai_governance_audit_log table.
async function logGovernance(params: {
  admin_jwt: string | null;
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
      source: "ai-improve-story",
    } as never);
  } catch (_e) {
    // Swallow — audit must never block inference.
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      improve_type,
      focus_hint,
      current_description,
      current_ac,
      issue_summary,
      // New branch payload fields
      parent_summary,
      parent_type,
      sibling_summaries,
      user_draft,
    } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─────────────────────────────────────────────────────────────
    // Branch: predict_subtask_titles
    //   Returns: { suggestions: string[] } (max 5)
    //   Used by SubtasksPanel inline-create AI hint popover.
    // ─────────────────────────────────────────────────────────────
    if (improve_type === "predict_subtask_titles") {
      const siblings = Array.isArray(sibling_summaries)
        ? sibling_summaries.slice(0, 20)
        : [];
      const draft = typeof user_draft === "string" ? user_draft.trim() : "";
      const parentSum = typeof parent_summary === "string" ? parent_summary : "";
      const parentType = typeof parent_type === "string" ? parent_type : "Story";

      const prompt = `You help a product team add subtasks / child work items inside an enterprise portfolio-management tool used by the Saudi Ministry of Industry. Output ONLY valid JSON. No markdown, no preamble, no explanation.

Parent work item type: ${parentType}
Parent summary: ${parentSum || "(none)"}
Existing sibling summaries:
${siblings.length ? siblings.map((s: string) => `- ${s}`).join("\n") : "(none)"}

User draft so far: "${draft}"

Task: Suggest up to 5 concise, specific next-item titles that fit this parent and complement the existing siblings (do not repeat them). If the user has started typing, extend that direction — do NOT contradict their draft. Each title under 80 characters.

Return JSON only: {"suggestions": ["...", "...", "..."]}`;

      const aiResp = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages: [
            {
              role: "system",
              content:
                "You are a senior business analyst. Return only valid JSON. No markdown fences.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.6,
          max_tokens: 300,
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) {
          await logGovernance({
            admin_jwt: null,
            action: "predict_subtask_titles",
            payload: { parent_summary: parentSum, parent_type: parentType, user_draft: draft },
            status: "error",
            error_message: "rate_limit_429",
          });
          return new Response(
            JSON.stringify({ error: "Rate limits exceeded, please try again later.", suggestions: [] }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        if (aiResp.status === 402) {
          return new Response(
            JSON.stringify({ error: "Payment required, please add funds.", suggestions: [] }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const t = await aiResp.text();
        console.error("AI gateway error:", aiResp.status, t);
        await logGovernance({
          admin_jwt: null,
          action: "predict_subtask_titles",
          payload: { parent_summary: parentSum, user_draft: draft },
          status: "error",
          error_message: `gateway_${aiResp.status}`,
        });
        return new Response(
          JSON.stringify({ error: "AI gateway error", suggestions: [] }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const aiData = await aiResp.json();
      const rawText = aiData.choices?.[0]?.message?.content ?? "{}";
      let suggestions: string[] = [];
      try {
        const clean = rawText.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed.suggestions)) {
          suggestions = parsed.suggestions
            .filter((s: unknown): s is string => typeof s === "string")
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0 && s.length <= 160)
            .slice(0, 5);
        }
      } catch {
        suggestions = [];
      }

      await logGovernance({
        admin_jwt: null,
        action: "predict_subtask_titles",
        payload: {
          parent_summary: parentSum,
          parent_type: parentType,
          user_draft: draft,
          sibling_count: siblings.length,
          suggestion_count: suggestions.length,
        },
        status: "ok",
      });

      return new Response(JSON.stringify({ suggestions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // Branch: translate_text
    //   Returns: { translation: string }
    //   Used by CreateBusinessRequestModal bidirectional title translation.
    //   direction: 'en_to_ar' | 'ar_to_en'
    // ─────────────────────────────────────────────────────────────
    if (improve_type === "translate_text") {
      const { text, direction } = body as { text: string; direction: "en_to_ar" | "ar_to_en" };
      if (!text?.trim()) {
        return new Response(JSON.stringify({ translation: "" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const isToArabic = direction === "en_to_ar";
      const prompt = isToArabic
        ? `Translate the following English text into Modern Standard Arabic (فصحى). Output ONLY the Arabic translation — no explanation, no punctuation changes, no quotes. Preserve technical terms as-is if there is no standard Arabic equivalent.\n\nText: ${text}`
        : `Translate the following Arabic text into English. Output ONLY the English translation — no explanation, no quotes, no Arabic. Use professional enterprise software terminology.\n\nText: ${text}`;

      const aiResp = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: isToArabic
                ? "You are a professional Arabic translator specialising in enterprise software and government ministry systems. Return only the translation, nothing else."
                : "You are a professional English translator specialising in enterprise software and government ministry systems. Return only the translation, nothing else.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 80,
        }),
      });

      if (!aiResp.ok) {
        const t = await aiResp.text();
        console.error("translate_text gateway error:", aiResp.status, t);
        return new Response(JSON.stringify({ error: "Translation failed", translation: "" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResp.json();
      const translation = (aiData.choices?.[0]?.message?.content ?? "").trim();
      await logGovernance({ admin_jwt: null, action: "translate_text", payload: { direction, char_count: text.length }, status: "ok" });
      return new Response(JSON.stringify({ translation }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═════════════════════════════════════════════════════════════
    // 2026-04-28 (jira-compare cycle 3 — Phase B B2):
    //   Three new branches that mirror Jira's "Improve {type}"
    //   dropdown menu items (https://digital-transformation.atlassian.net
    //   /browse/BAU-5711 → "Improve QA Bug" trigger). Per-issue-type
    //   prompt focus is keyed off `issue_type` (Story / Epic / Feature /
    //   Task / QA Bug / Production Incident / Subtask / Business
    //   Request) — Jira's menu shape is identical across types but the
    //   model output differs because the system prompt differs.
    // ═════════════════════════════════════════════════════════════

    const PER_TYPE_FOCUS: Record<string, string> = {
      Story:
        "User-narrative form (\"As a [user], I want [action], so that [benefit]\") with Given/When/Then acceptance criteria. Keep scope to ONE persona × ONE goal.",
      Epic:
        "Outcome-focused. Lead with the measurable business outcome / KPI uplift. Bound scope (in / out). Name the success criteria a steering committee would sign off on.",
      Feature:
        "Functional-scope shape: capability statement, user impact, primary dependencies, target release. Avoid implementation detail.",
      Task:
        "Concrete deliverable, single-owner action, crisp definition-of-done. Keep it tactical — no narrative.",
      "QA Bug":
        "Reproduction steps (numbered), expected vs actual behaviour, environment (browser / OS / build), severity rationale. Steps must be deterministic.",
      Bug: // legacy synonym for QA Bug
        "Reproduction steps (numbered), expected vs actual behaviour, environment (browser / OS / build), severity rationale. Steps must be deterministic.",
      "Production Incident":
        "Impact statement (who / how many / dollar magnitude), MTTR target, root-cause hypothesis, mitigation step list. Treat this as an active incident write-up.",
      Incident: // legacy synonym
        "Impact statement (who / how many / dollar magnitude), MTTR target, root-cause hypothesis, mitigation step list. Treat this as an active incident write-up.",
      Subtask:
        "Single concrete action, time-boxed (≤ 1 day), aligned to the parent's intent. No sub-narrative.",
      "Business Request":
        "Business value, requirements (functional + non-functional), stakeholders, success metric. Government-ministry tone.",
      "Business Gap":
        "Gap statement (current vs desired state), business impact, dependencies, recommended remediation. Government-ministry tone.",
      "API Requirement":
        "API contract: endpoint(s), request / response shape, auth, rate limits, error contract, observability hooks.",
      "Change Request":
        "Change description, business justification, blast-radius assessment, rollback plan, sign-off list.",
      Default:
        "Be precise, professional, and structured. Lead with intent, follow with detail.",
    };

    const focusFor = (t?: string) =>
      (t && PER_TYPE_FOCUS[t]) || PER_TYPE_FOCUS.Default;

    // ─────────────────────────────────────────────────────────────
    // Branch: improve_description_v2
    //   Per-type description rewrite. Returns
    //   { description, acceptance_criteria }.
    //   Differs from the legacy default branch by branching on
    //   `issue_type` to select PER_TYPE_FOCUS.
    // ─────────────────────────────────────────────────────────────
    if (improve_type === "improve_description_v2") {
      const issueType: string = body.issue_type ?? "Default";
      const subInstruction =
        IMPROVE_INSTRUCTIONS[body.improve_sub_type ?? "improve_clarify"] ??
          IMPROVE_INSTRUCTIONS.improve_clarify;
      const typeFocus = focusFor(issueType);
      const focusText = focus_hint ? `\nUser hint: ${focus_hint}` : "";

      const prompt = `You are a senior business analyst writing requirements for an enterprise portfolio management platform used by the Saudi Ministry of Industry. Write in English. Output ONLY valid JSON with keys "description" and "acceptance_criteria". No markdown fences, no preamble.

Work item type: ${issueType}
Type-specific focus: ${typeFocus}

Operation: ${subInstruction}${focusText}

Title: ${issue_summary || "(untitled)"}
Current description: ${current_description || "(empty)"}
Current acceptance criteria: ${current_ac || "(none)"}

Return JSON: {"description": "...", "acceptance_criteria": "..."}`;

      const aiResp = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages: [
            { role: "system", content: "You are a senior business analyst. Return only valid JSON. No markdown fences." },
            { role: "user", content: prompt },
          ],
          temperature: 0.4,
          max_tokens: 1500,
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (aiResp.status === 402) {
          return new Response(JSON.stringify({ error: "Payment required, please add funds." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const t = await aiResp.text();
        console.error("improve_description_v2 gateway error:", aiResp.status, t);
        return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const aiData = await aiResp.json();
      const rawText = aiData.choices?.[0]?.message?.content ?? "{}";
      let parsed = { description: "", acceptance_criteria: "" };
      try {
        const clean = rawText.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(clean);
      } catch {
        parsed = { description: rawText, acceptance_criteria: "" };
      }
      await logGovernance({
        admin_jwt: null,
        action: "improve_description_v2",
        payload: { issue_type: issueType, sub_type: body.improve_sub_type ?? "improve_clarify" },
        status: "ok",
      });
      return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─────────────────────────────────────────────────────────────
    // Branch: summarize_comments
    //   Returns { summary: string }.
    //   Per-type tone keyed off issue_type (Story → decision-focused;
    //   Bug → triage-focused; Incident → incident-mgmt-focused; ...).
    // ─────────────────────────────────────────────────────────────
    if (improve_type === "summarize_comments") {
      const issueType: string = body.issue_type ?? "Default";
      const comments: Array<{ author?: string; created_at?: string; body?: string }> =
        Array.isArray(body.comments) ? body.comments : [];
      if (comments.length === 0) {
        return new Response(JSON.stringify({ summary: "" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const tonePerType: Record<string, string> = {
        Story: "Decision-focused. What decisions were made, what's pending, what's blocking the user-narrative.",
        Epic: "Strategic. Surface scope shifts, KPI changes, steering-committee notes.",
        Feature: "Roadmap-focused. Surface release-impact, dependency changes, scope movement.",
        Task: "Progress-focused. State, blockers, next-step.",
        "QA Bug": "Triage-focused. Reproduction status, severity changes, who's investigating.",
        Bug: "Triage-focused. Reproduction status, severity changes, who's investigating.",
        "Production Incident": "Incident-management voice. Timeline of events, mitigation status, action items.",
        Incident: "Incident-management voice. Timeline of events, mitigation status, action items.",
        Subtask: "Progress-focused. State, blockers, next-step.",
        "Business Request": "Stakeholder-focused. Surface stakeholder positions, decisions, sign-off status.",
        "Business Gap": "Stakeholder-focused. Surface stakeholder positions, decisions, sign-off status.",
        "API Requirement": "Contract-focused. Surface API shape changes, breaking-change risks, integration questions.",
        "Change Request": "Change-control-focused. Surface CAB sign-offs, rollback considerations.",
        Default: "Neutral. Surface key points, decisions, blockers.",
      };
      const tone = tonePerType[issueType] ?? tonePerType.Default;

      const commentText = comments
        .slice(-30) // last 30 comments
        .map((c, i) => `[${i + 1}] ${c.author ?? "(unknown)"} @ ${c.created_at ?? ""}:\n${(c.body ?? "").slice(0, 2000)}`)
        .join("\n\n");

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
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages: [
            { role: "system", content: "You are an expert technical writer. Return only valid JSON. No markdown fences." },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 800,
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Payment required, please add funds." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
      await logGovernance({ admin_jwt: null, action: "summarize_comments", payload: { issue_type: issueType, comment_count: comments.length }, status: "ok" });
      return new Response(JSON.stringify({ summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─────────────────────────────────────────────────────────────
    // Branch: suggest_child_issues
    //   Returns { suggestions: Array<{title, description, type}> }.
    //   Per-type child shape (Epic → Stories; Story → Tasks; Task →
    //   Subtasks; Bug → Linked-tests; Incident → Action-items; etc.).
    // ─────────────────────────────────────────────────────────────
    if (improve_type === "suggest_child_issues") {
      const parentType: string = body.parent_type ?? body.issue_type ?? "Story";
      const parentSum: string = body.parent_summary ?? body.issue_summary ?? "";
      const parentDesc: string = body.parent_description ?? body.current_description ?? "";

      const childTypeByParent: Record<string, string> = {
        Epic: "Story",
        Feature: "Story",
        Story: "Task",
        Task: "Subtask",
        Subtask: "Subtask", // can't go deeper, return same level
        "QA Bug": "Linked test",
        Bug: "Linked test",
        "Production Incident": "Action item",
        Incident: "Action item",
        "Business Request": "Story",
        "Business Gap": "Story",
        "API Requirement": "Task",
        "Change Request": "Task",
      };
      const childType = childTypeByParent[parentType] ?? "Task";

      const prompt = `Suggest 3-7 child work items for this parent. Output ONLY valid JSON with key "suggestions". No markdown.

Parent type: ${parentType}
Parent title: ${parentSum}
Parent description: ${parentDesc.slice(0, 4000) || "(none)"}

Child type to produce: ${childType}

Each suggestion must be:
  - Distinct (no overlap)
  - Independently workable
  - Concrete (no "investigate X" placeholders)
  - Title under 90 characters

Return JSON: {"suggestions": [{"title": "...", "description": "...", "type": "${childType}"}]}`;

      const aiResp = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages: [
            { role: "system", content: "You are a senior business analyst. Return only valid JSON. No markdown fences." },
            { role: "user", content: prompt },
          ],
          temperature: 0.5,
          max_tokens: 1200,
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later.", suggestions: [] }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Payment required, please add funds.", suggestions: [] }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "AI gateway error", suggestions: [] }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const aiData = await aiResp.json();
      const rawText = aiData.choices?.[0]?.message?.content ?? "{}";
      let suggestions: Array<{ title: string; description: string; type: string }> = [];
      try {
        const clean = rawText.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed.suggestions)) {
          suggestions = parsed.suggestions
            .filter((s: any) => s && typeof s.title === "string")
            .map((s: any) => ({
              title: String(s.title).trim().slice(0, 160),
              description: typeof s.description === "string" ? s.description.trim().slice(0, 4000) : "",
              type: typeof s.type === "string" ? s.type : childType,
            }))
            .slice(0, 7);
        }
      } catch {
        suggestions = [];
      }
      await logGovernance({ admin_jwt: null, action: "suggest_child_issues", payload: { parent_type: parentType, child_type: childType, count: suggestions.length }, status: "ok" });
      return new Response(JSON.stringify({ suggestions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─────────────────────────────────────────────────────────────
    // Default branch: existing story-improvement contract (unchanged)
    // ─────────────────────────────────────────────────────────────
    const instruction = IMPROVE_INSTRUCTIONS[improve_type] ?? "Improve and clarify";
    const focusText = focus_hint ? `\nFocus: ${focus_hint}` : "";

    const prompt = `You are a senior business analyst writing requirements for an enterprise portfolio management platform used by the Saudi Ministry of Industry. Write in English. Be precise, professional, and structured. Output ONLY valid JSON with keys "description" and "acceptance_criteria". No markdown fences, no preamble.

Improve type: ${instruction}${focusText}

Story title: ${issue_summary || "(untitled)"}
Current description: ${current_description || "(empty)"}
Current acceptance criteria: ${current_ac || "(none)"}

Return JSON: {"description": "...", "acceptance_criteria": "..."}`;

    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a senior business analyst. Return only valid JSON. No markdown fences.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await response.json();
    const rawText = aiData.choices?.[0]?.message?.content ?? "{}";

    let parsed = { description: "", acceptance_criteria: "" };
    try {
      const clean = rawText.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = { description: rawText, acceptance_criteria: "" };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-improve-story error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
