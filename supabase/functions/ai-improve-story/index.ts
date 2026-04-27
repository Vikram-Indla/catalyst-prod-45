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
          model: DEFAULT_MODEL,
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
          max_tokens: 200,
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
