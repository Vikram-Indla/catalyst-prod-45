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
    await sb.from("ai_governance_audit_log").insert({
      action: params.action,
      payload: params.payload,
      status: params.status,
      error_message: params.error_message ?? null,
      source: "ai-suggest-children",
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
    const body = await req.json();
    const parentSummary: string =
      typeof body?.parent_summary === "string" ? body.parent_summary : "";
    const parentType: string =
      typeof body?.parent_type === "string" ? body.parent_type : "Story";
    const allowedTypes: string[] = Array.isArray(body?.allowed_child_types)
      ? (body.allowed_child_types as unknown[]).filter(
          (t): t is string => typeof t === "string",
        )
      : [];
    const siblings: string[] = Array.isArray(body?.sibling_summaries)
      ? (body.sibling_summaries as unknown[])
          .filter((s): s is string => typeof s === "string")
          .slice(0, 20)
      : [];
    const userHint: string =
      typeof body?.user_hint === "string" ? body.user_hint.trim() : "";

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

    const allowedTypeList = allowedTypes.length > 0
      ? allowedTypes.join(", ")
      : "Sub-task";
    const defaultType = allowedTypes[0] ?? "Sub-task";

    const userPrompt = `You help a product team add child work items inside an enterprise portfolio-management tool.

Parent work item type: ${parentType}
Parent summary: ${parentSummary || "(none)"}

Allowed child work-item types for this parent: ${allowedTypeList}
Existing sibling summaries (do NOT repeat these):
${siblings.length ? siblings.map((s) => `- ${s}`).join("\n") : "(none)"}
${userHint ? `\nUser direction: ${userHint}` : ""}

Task:
- Propose 5 concise, specific next-item titles that decompose this parent.
- For each suggestion, pick the most appropriate type from the allowed list. If unsure, use "${defaultType}".
- Each title under 80 characters, no trailing punctuation, sentence case.
- Do NOT repeat or paraphrase the existing siblings.

Return ONLY valid JSON. No markdown, no preamble, no code fences.
Shape:
{"suggestions":[{"title":"...","type":"..."}, ...]}`;

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
              "You are a senior business analyst. Return only valid JSON. No markdown fences, no preamble.",
          },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 600,
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      const errBody = await aiResp.text().catch(() => "");
      console.error("ai-suggest-children gateway error:", status, errBody);
      await logGovernance({
        action: "ai_suggest_children",
        payload: { parent_type: parentType, hint_len: userHint.length },
        status: "error",
        error_message: `gateway_${status}`,
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
                : "AI gateway error",
          suggestions: [],
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
    try {
      const clean = rawText.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = null;
    }

    const allowedSet = new Set(allowedTypes.length > 0 ? allowedTypes : [defaultType]);
    const suggestions: Array<{ title: string; type: string }> = [];
    if (parsed && Array.isArray(parsed.suggestions)) {
      for (const s of parsed.suggestions) {
        if (!s || typeof s !== "object") continue;
        const title = typeof s.title === "string" ? s.title.trim() : "";
        let type = typeof s.type === "string" ? s.type.trim() : "";
        if (!title || title.length > 160) continue;
        if (!allowedSet.has(type)) type = defaultType;
        suggestions.push({ title, type });
        if (suggestions.length >= 5) break;
      }
    }

    logGovernance({
      action: "ai_suggest_children",
      payload: {
        parent_type: parentType,
        suggestion_count: suggestions.length,
        sibling_count: siblings.length,
        hint_len: userHint.length,
      },
      status: "ok",
    }).catch(() => {});

    return new Response(
      JSON.stringify({ suggestions, defaultType }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("ai-suggest-children unhandled error:", message);
    await logGovernance({
      action: "ai_suggest_children",
      payload: {},
      status: "error",
      error_message: message,
    });
    return new Response(
      JSON.stringify({ error: "internal_error", message, suggestions: [] }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
