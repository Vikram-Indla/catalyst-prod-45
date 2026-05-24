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

const ARABIC_RE =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

function detectSource(text: string): "ar" | "en" {
  return ARABIC_RE.test(text) ? "ar" : "en";
}

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
      source: "ai-translate-title",
    } as never);
  } catch (_e) {
    /* never fail the request because of audit logging */
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const text: string = typeof body?.text === "string" ? body.text.trim() : "";
    const requestedTarget: string | undefined =
      typeof body?.target === "string" ? body.target.toLowerCase() : undefined;

    if (!text) {
      return new Response(
        JSON.stringify({ error: "empty_text", message: "Nothing to translate." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const source = detectSource(text);
    const target: "en" | "ar" =
      requestedTarget === "en" || requestedTarget === "ar"
        ? (requestedTarget as "en" | "ar")
        : source === "ar"
          ? "en"
          : "ar";

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

    const systemPrompt =
      target === "ar"
        ? "You are a professional Arabic translator for enterprise software. Every output word must be written in Arabic script. For English words that have no direct Arabic equivalent (Staging, Production, Beta, API, Sprint, Backlog, etc.) you MUST transliterate them phonetically into Arabic letters (e.g. Beta -> بيتا, Staging -> ستيجينج, Production -> برودكشن, API -> إيه بي آي). Return ONLY the Arabic translation. No quotes, no preamble, no commentary."
        : "You are a professional English translator for enterprise software. Return ONLY the English translation. No quotes, no preamble, no commentary.";

    const userPrompt = target === "ar"
      ? `Translate the following work-item title to Arabic. Hard rules:
1. Every word in the output must be written in Arabic script.
2. If a word has a direct Arabic translation, translate it.
3. If a word has no good Arabic translation (technical terms, product names like Staging / Production / Beta / API / Sprint / Backlog / DevOps), transliterate it phonetically into Arabic letters — DO NOT leave it in English.
4. The ONLY things that may stay in Latin script are: alphanumeric code identifiers (e.g. BAU-1234, JIRA-5678), URLs, and email addresses.
5. Reply with ONLY the translated title. No quotes, no labels.

Title:
${text}`
      : `Translate the following work-item title to English. Preserve any code identifiers (e.g. BAU-1234), URLs, and email addresses exactly as written. Reply with ONLY the translated title.

Title:
${text}`;

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
        temperature: 0.2,
        max_tokens: 400,
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      const errBody = await aiResp.text().catch(() => "");
      console.error("ai-translate-title gateway error:", status, errBody);
      await logGovernance({
        action: "ai_translate_title",
        payload: { source, target },
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
        }),
        {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = await aiResp.json();
    const raw: string =
      typeof data?.choices?.[0]?.message?.content === "string"
        ? data.choices[0].message.content
        : "";
    const translated = raw
      .trim()
      .replace(/^"+|"+$/g, "")
      .replace(/^«+|»+$/g, "")
      .trim();

    if (!translated) {
      await logGovernance({
        action: "ai_translate_title",
        payload: { source, target },
        status: "error",
        error_message: "empty_response",
      });
      return new Response(
        JSON.stringify({
          error: "empty_response",
          message: "Translation returned no text.",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    logGovernance({
      action: "ai_translate_title",
      payload: { source, target, length: text.length },
      status: "ok",
    }).catch(() => {});

    return new Response(
      JSON.stringify({ translated, source, target }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("ai-translate-title unhandled error:", message);
    await logGovernance({
      action: "ai_translate_title",
      payload: {},
      status: "error",
      error_message: message,
    });
    return new Response(
      JSON.stringify({ error: "internal_error", message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
