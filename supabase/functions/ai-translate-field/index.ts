/**
 * ai-translate-field — translate longer fields (description, comments).
 *
 * Differences from ai-translate-title:
 *   - max_tokens: 4000 (descriptions can be paragraphs-long)
 *   - temperature: 0.1  (more deterministic for structured prose)
 *   - Prompt preserves paragraph breaks (\n\n) and Markdown structure
 *   - Transliteration rule still enforced for technical terms in EN→AR
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

const ARABIC_RE =
  /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

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
    await sb.from("ai_usage_log").insert({
      action: params.action,
      payload: params.payload,
      status: params.status,
      error_message: params.error_message ?? null,
      source: "ai-translate-field",
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
    // Auth gate (CAT-VOICE-UX-PREMIUM-20260708-001 S0): this function is
    // deployed with verify_jwt=false, so without this check it is an open
    // Gemini proxy. Same getUser pattern as catyflow-token.
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!jwt || !supabaseUrl || !anonKey) {
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Sign-in required." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Sign-in required." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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
        ? `You are a professional Arabic translator for enterprise software documentation.

═══════════════════════════════════════════════════════════════════
THE GENERAL RULE (this is the ONLY rule that matters — read it twice):

For EVERY token in the input that contains Latin letters, you do exactly ONE of the following:
  (A) If it falls into the EXCEPTIONS LIST below → keep it EXACTLY as written.
  (B) Otherwise → it MUST become Arabic script. If a standard Arabic translation exists, use it. If not, transliterate the token phonetically into Arabic letters (or letter-by-letter for acronyms).

There is no "(C)". A Latin-script token that does not fall into the exceptions list NEVER appears in your output. This rule applies to all words — every single one — including ones not listed in any example below. Examples shown later are ILLUSTRATIVE, NOT EXHAUSTIVE. The same logic applies to any technical term, abbreviation, acronym, environment name, jargon, or generic loanword you encounter, whether listed or not.
═══════════════════════════════════════════════════════════════════

EXCEPTIONS LIST — these tokens stay EXACTLY as written in Latin script:

(a) Brand names — proper-noun names of identifiable companies, organisations, or vendors. A token qualifies as a brand name only if a typical reader would recognise it as a specific organisation's name.

(b) Product names — proper-noun names of specific shipping software products, platforms, or services. A token qualifies only if it is a uniquely-identifiable product, not a generic software concept.

(c) Ticket / issue keys — any token matching the pattern <UPPERCASE-LETTERS>-<DIGITS> (BAU-1212, PROJ-9999, BUG-42, ABC-7, etc.) OR matching customfield_<digits>.

(d) Content INSIDE code blocks (between \`\`\` marks) and inline code (between \` marks). The text between the marks is never altered.

(e) Full URLs (anything starting with http:// or https://) and email addresses.

(f) Placeholder tokens like {minValue}, \${variable}, %s, {{ name }}, <%= x %> — keep including the surrounding braces / sigils.

═══════════════════════════════════════════════════════════════════

HOW TO HANDLE EVERYTHING ELSE (the (B) branch):

For any Latin-script token that does NOT match (a)–(f) above:
  - If a widely-used Arabic translation exists for the concept, use it.
  - Otherwise, transliterate the token's PRONUNCIATION into Arabic letters.
  - For single-letter acronyms (DNS, JWT, SSL, STG, QA, MVP, ETL, SaaS, IaaS, etc.), transliterate each letter to its Arabic name and join with spaces.

Illustrative (non-exhaustive) examples — the same approach applies to any other token you meet:
     • "API" → "إيه بي آي"
     • "Sprint" → "سبرنت"
     • "Backlog" → "باكلوج"
     • "Production" → "برودكشن"
     • "Staging" → "ستيجينج"
     • "Beta" → "بيتا"
     • "STG" → "إس تي جي"
     • "DNS" → "دي إن إس"

Tie-breaker when unsure whether a token is a brand/product (keep) or a generic term (transliterate): treat it as generic and transliterate. It is better to err on the side of an Arabic-script output than to leave a Latin word in.

═══════════════════════════════════════════════════════════════════

FORMATTING:
  - Preserve paragraph structure — keep blank lines between paragraphs.
  - Preserve Markdown formatting symbols (* ** # - 1.) exactly as-is; only translate the text within them.
  - Return ONLY the translated text. No preamble, no commentary, no notes.

═══════════════════════════════════════════════════════════════════

MANDATORY SELF-CHECK before returning your output:
  1. Scan every Latin-script token in the output.
  2. For each one, identify which exception (a, b, c, d, e, or f) it matches.
  3. If a token matches NONE of the exceptions, convert it to Arabic via translation or transliteration, then re-scan from step 1.
  4. Repeat until every remaining Latin-script token clearly matches exactly one exception.

If you cannot confidently match a Latin token to an exception, you MUST transliterate it. When in doubt, transliterate.`
        : `You are a professional English translator for enterprise software documentation.

═══════════════════════════════════════════════════════════════════
THE GENERAL RULE (this is the ONLY rule that matters — read it twice):

For EVERY token in the input that contains Arabic letters, you do exactly ONE of the following:
  (A) If it falls into the EXCEPTIONS LIST below → keep it as-is OR de-transliterate it to its canonical Latin form (see "How to handle brand/product de-transliteration" below).
  (B) Otherwise → translate it to fluent English. If the Arabic token is a transliteration of an English technical term (e.g. ستيجينج), return it to its canonical English spelling ("Staging").

There is no "(C)". An Arabic token that does not fall into the exceptions list NEVER appears in your output. This rule applies to all words — every single one — including ones not listed in any example below. Examples shown later are ILLUSTRATIVE, NOT EXHAUSTIVE. The same logic applies to any technical term, abbreviation, acronym, environment name, jargon, or generic loanword you encounter, whether listed or not.
═══════════════════════════════════════════════════════════════════

EXCEPTIONS LIST — tokens whose IDENTITY is preserved (even though the script may change for brand/product names that were transliterated to Arabic):

(a) Brand names — proper-noun names of identifiable companies, organisations, or vendors. A token qualifies as a brand name only if a typical reader would recognise it as a specific organisation's name.

(b) Product names — proper-noun names of specific shipping software products, platforms, or services. A token qualifies only if it is a uniquely-identifiable product, not a generic software concept.

(c) Ticket / issue keys — any token matching the pattern <UPPERCASE-LETTERS>-<DIGITS> (BAU-1212, PROJ-9999, BUG-42, ABC-7, etc.) OR matching customfield_<digits>. These are typically already in Latin script in the source; keep them exactly.

(d) Content INSIDE code blocks (between \`\`\` marks) and inline code (between \` marks). The text between the marks is never altered.

(e) Full URLs (anything starting with http:// or https://) and email addresses.

(f) Placeholder tokens like {minValue}, \${variable}, %s, {{ name }}, <%= x %> — keep including the surrounding braces / sigils.

═══════════════════════════════════════════════════════════════════

HOW TO HANDLE BRAND / PRODUCT DE-TRANSLITERATION (exceptions a, b):

If the source already wrote the brand/product in Latin script (e.g. "Jira") → keep it in Latin script exactly as written.
If the source transliterated the brand/product into Arabic (e.g. "جيرا", "أتلاسيان", "جيت هاب") → return it to its canonical Latin spelling ("Jira", "Atlassian", "GitHub").

═══════════════════════════════════════════════════════════════════

HOW TO HANDLE EVERYTHING ELSE (the (B) branch):

For any Arabic token that does NOT match (a)–(f) above:
  - If the token is fluent Arabic prose, translate it to fluent English.
  - If the token is an Arabic transliteration of an English technical term (recognisable by its phonetic match to a known English word/acronym), return it to its canonical English form rather than re-translating.
  - For Arabic acronyms transliterated letter-by-letter (e.g. "دي إن إس", "جي دبليو تي"), reverse them to the canonical Latin acronym ("DNS", "JWT").

Illustrative (non-exhaustive) de-transliteration examples — the same approach applies to any other token you meet:
     • "إيه بي آي" → "API"
     • "سبرنت" → "Sprint"
     • "باكلوج" → "Backlog"
     • "برودكشن" → "Production"
     • "ستيجينج" → "Staging"
     • "بيتا" → "Beta"
     • "إس تي جي" → "STG"
     • "دي إن إس" → "DNS"

Tie-breaker when unsure whether an Arabic token is a brand/product (preserve identity) or a generic term (translate to canonical English): treat it as generic and translate. It is better to err on the side of clean English output than to leave Arabic prose untranslated.

═══════════════════════════════════════════════════════════════════

FORMATTING:
  - Preserve paragraph structure — keep blank lines between paragraphs.
  - Preserve Markdown formatting symbols (* ** # - 1.) exactly as-is; only translate the text within them.
  - Return ONLY the translated text. No preamble, no commentary, no notes.

═══════════════════════════════════════════════════════════════════

MANDATORY SELF-CHECK before returning your output:
  1. Scan every token in the output. Each token must be one of: fluent English prose, a brand name (a), a product name (b), a ticket key (c), code/URL/email (d–e), or a placeholder (f).
  2. If ANY Arabic character remains anywhere outside of (c) or (f), translate or de-transliterate it and re-scan from step 1.
  3. Repeat until the output is clean fluent English plus only the allowed exception tokens.

When in doubt about an Arabic token's identity, translate it. Never leave Arabic prose in the output.`;

    const userPrompt = target === "ar"
      ? `Translate the following work-item field content to Arabic. Follow all rules in the system prompt.

Content:
${text}`
      : `Translate the following work-item field content to English. Follow all rules in the system prompt.

Content:
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
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      const errBody = await aiResp.text().catch(() => "");
      console.error("ai-translate-field gateway error:", status, errBody);
      await logGovernance({
        action: "ai_translate_field",
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
        action: "ai_translate_field",
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
      action: "ai_translate_field",
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
    console.error("ai-translate-field unhandled error:", message);
    await logGovernance({
      action: "ai_translate_field",
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
