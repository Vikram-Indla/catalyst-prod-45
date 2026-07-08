/**
 * catyflow-clean — the Wispr-grade cleanup pass for CatyFlow dictation
 * (CAT-VOICE-FLOW-20260704-001; intent collapse CAT-DICTATION-INTELLIGENCE-
 * 20260708-001 S7).
 *
 * mode "clean":   raw ASR utterance → clean prose. Removes fillers,
 *                 collapses self-corrections and restarts to the FINAL
 *                 intent (bilingual: Arabic-corrects-English and vice
 *                 versa), punctuates, formats spoken lists, matches the
 *                 target field's register. Same-language output.
 * mode "command": selected text + spoken instruction → rewritten text.
 *
 * Provider: AI gateway (OpenAI-compatible chat completions) with
 * Gemini fallback via GEMINI_API_KEY. Client races a deadline for
 * "clean" — late responses are discarded there, so this function
 * favors small models and single-shot generation.
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

const REGISTERS: Record<string, string> = {
  comment:
    "Register: a work-item comment. Conversational but professional, first person, concise. No trailing period on single short sentences.",
  chat: "Register: a team chat message. Casual, brief, no formalities.",
  description:
    "Register: a work-item description. Structured, complete sentences. Use short paragraphs or hyphen lists when the speaker enumerates.",
  "brd-page":
    "Register: formal enterprise documentation (BRD / technical spec). Precise, complete sentences, professional tone. Use lists for enumerations.",
  title: "Register: a title or summary line. Sentence case, no terminal punctuation, at most ~120 characters.",
  formal: "Register: formal business writing.",
  field: "Register: a short form field. Plain, direct.",
};

function buildSystemPrompt(register: string, formality: string, dictionary: string[]): string {
  const lines = [
    "You clean up dictated speech into written text. Output ONLY the cleaned text — no preamble, no quotes, no explanations.",
    "Rules:",
    "- Remove filler words (um, uh, like, you know, يعني, اه) and false starts.",
    "- INTENT COLLAPSE — the speaker's LAST decision always wins:",
    '  • Corrections replace what they correct: "retry three times… no wait, five times" → "retry five times". The superseded value NEVER appears.',
    '  • "scratch that" / "forget that" / "خلاص لا" cancels the ENTIRE preceding clause — drop it and keep only what follows.',
    '  • Restarts collapse: "we need we need to ship" → "we need to ship"; "tell him… tell him tomorrow" → "tell him tomorrow".',
    '  • Correction markers in EITHER language apply ("no wait", "I mean", "actually", "make that", "rather", "لا انتظر", "اقصد", "بدل كذا") — a correction spoken in one language replaces content in the other just the same.',
    '  • Remove the correction marker itself from the output ("no wait", "scratch that" etc. never appear).',
    "  • When in doubt whether something is a correction or new content, keep it — never drop content that is not clearly superseded.",
    "- Add punctuation and capitalization. Honor spoken punctuation ('comma', 'new line', 'فاصلة').",
    "- When the speaker enumerates items, format them as a list (one item per line prefixed with '- ').",
    "- KEEP THE SPEAKER'S LANGUAGE: Arabic input stays Arabic, English stays English. Never translate.",
    "- Never add content, opinions, or facts the speaker did not say.",
    REGISTERS[register] ?? REGISTERS["description"],
  ];
  if (formality === "casual") lines.push("Tone preference: casual.");
  if (formality === "formal") lines.push("Tone preference: formal.");
  if (dictionary.length) {
    lines.push(`Prefer these exact spellings when they occur: ${dictionary.join(", ")}.`);
  }
  return lines.join("\n");
}

function buildCommandPrompt(): string {
  return [
    "You edit text according to a spoken instruction. Output ONLY the rewritten text — no preamble, no quotes, no explanations.",
    "Keep the text's language unless the instruction says otherwise. Preserve meaning except where the instruction changes it.",
  ].join("\n");
}

async function callGateway(
  system: string,
  user: string,
  maxTokens: number,
): Promise<{ text: string; provider: string } | null> {
  const gatewayUrl = (Deno.env.get("AI_GATEWAY_URL") ?? "https://api.openai.com").replace(/\/$/, "");
  const apiKey = Deno.env.get("AI_GATEWAY_API_KEY") ?? Deno.env.get("OPENAI_API_KEY");
  const model = Deno.env.get("CATYFLOW_CLEAN_MODEL") ?? "gpt-4.1-mini";
  if (!apiKey) return null;
  const resp = await fetch(`${gatewayUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  return text ? { text, provider: `gateway:${model}` } : null;
}

async function callGemini(
  system: string,
  user: string,
  maxTokens: number,
): Promise<{ text: string; provider: string } | null> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return null;
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
      }),
    },
  );
  if (!resp.ok) return null;
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("").trim();
  return text ? { text, provider: "gemini-2.5-flash" } : null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const started = Date.now();
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";
    const sb = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    // getUser() ignores global headers — the JWT must be passed explicitly,
    // otherwise every valid user gets 401 (live-probed 2026-07-05).
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userErr } = await sb.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

    const body = await req.json();
    const mode: "clean" | "command" = body?.mode === "command" ? "command" : "clean";
    const raw: string = String(body?.text ?? "").slice(0, 8000);
    if (!raw.trim()) return json({ error: "empty_text" }, 400);

    const register = String(body?.register ?? "description");
    const formality = String(body?.formality ?? "default");
    const dictionary: string[] = Array.isArray(body?.dictionary)
      ? body.dictionary.filter((t: unknown) => typeof t === "string").slice(0, 100)
      : [];
    const precedingContext = String(body?.preceding_context ?? "").slice(-400);

    let system: string;
    let user: string;
    let maxTokens: number;

    if (mode === "command") {
      const selection = String(body?.selected_text ?? "").slice(0, 6000);
      if (!selection.trim()) return json({ error: "empty_selection" }, 400);
      system = buildCommandPrompt();
      user = `Instruction: ${raw}\n\nText to edit:\n${selection}`;
      maxTokens = 2000;
    } else {
      system = buildSystemPrompt(register, formality, dictionary);
      user = precedingContext
        ? `Preceding field content (context only, do not repeat):\n…${precedingContext}\n\nDictated speech to clean:\n${raw}`
        : `Dictated speech to clean:\n${raw}`;
      maxTokens = 800;
    }

    const result = (await callGateway(system, user, maxTokens)) ?? (await callGemini(system, user, maxTokens));
    if (!result) return json({ error: "gateway_error", message: "No cleanup provider available" }, 502);

    // Governance audit (best effort, service role). ai_usage_log is the
    // canonical AI audit table (2026-07-04 sweep) — this fn previously
    // logged to ai_governance_audit_log by mistake.
    try {
      const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (svc) {
        const admin = createClient(supabaseUrl, svc, { auth: { persistSession: false } });
        await admin.from("ai_usage_log").insert({
          action: `catyflow_${mode}`,
          payload: {
            user_id: userData.user.id,
            provider: result.provider,
            register,
            input_chars: raw.length,
            output_chars: result.text.length,
            latency_ms: Date.now() - started,
          },
          status: "ok",
          source: "catyflow-clean",
        } as never);
      }
    } catch {
      // audit must never fail the request
    }

    return json({ cleaned: result.text, provider: result.provider, latency_ms: Date.now() - started });
  } catch (e) {
    return json({ error: "internal", message: String(e).slice(0, 300) }, 500);
  }
});
