/**
 * voice-transcribe — Groq Whisper primary, Gemini fallback.
 *
 * Flow: audio (AR/UR/HI) → Groq whisper-large-v3 (translate→EN) → English text.
 * Fallback: Groq failure → Gemini 2.5 Flash (non-streaming).
 *
 * Groq verbose_json provides:
 *   - language detection (BCP-47 mapped)
 *   - avg_logprob → confidence proxy (threshold -0.5)
 *
 * Security:
 *   - Auth required (Supabase JWT)
 *   - GROQ_API_KEY / GEMINI_API_KEY env-only, never client
 *   - No audio stored
 *   - Audit row → ai_governance_audit_log
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

const GROQ_STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GEMINI_GENERATE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/** Retry once on 429, honouring Retry-After (max 4 s). */
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 1): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const resp = await fetch(url, options);
    if (resp.status !== 429 || attempt === maxRetries) return resp;
    const retryAfter = parseInt(resp.headers.get("Retry-After") ?? "2", 10);
    await new Promise<void>((r) => setTimeout(r, Math.min(retryAfter * 1000, 4000)));
  }
  return fetch(url, options);
}

// Whisper language name → BCP-47
const WHISPER_LANG_MAP: Record<string, string> = {
  arabic: "ar-SA",
  urdu: "ur-PK",
  hindi: "hi-IN",
  english: "en",
};

// Gemini fallback helpers
const SOURCE_LANG_LABELS: Record<string, string> = {
  "ar-SA": "Arabic (Saudi)",
  "ar-AE": "Arabic (UAE)",
  "ur-PK": "Urdu",
  "hi-IN": "Hindi",
};

function buildGeminiPrompt(sourceLanguages: string[], preferredLanguage?: string): string {
  const langs = sourceLanguages.map(l => SOURCE_LANG_LABELS[l] ?? l).join(", ");
  const hint = preferredLanguage
    ? `The speaker's most recent language was "${preferredLanguage}" — use as a hint but do not assume.\n`
    : "";
  return (
    `Transcribe the following audio recorded in ${langs}.\n` +
    hint +
    `Translate the transcribed text to fluent English.\n` +
    "If uncertain about transcription quality, prepend exactly \"[LOW_CONFIDENCE]:\" followed by the transcription.\n" +
    "If you detect the language, append exactly \"[LANG:<BCP-47-code>]\" at the very end.\n" +
    "Return ONLY the English translation (and optional markers). No preamble, no source-language text.\n" +
    "If audio is silent or has no speech, return exactly: [no_speech]"
  );
}

function parseGeminiText(raw: string): {
  englishText: string;
  confidence: "high" | "low";
  detectedLanguage: string | undefined;
} {
  let text = raw.trim().replace(/^["«]+|["»]+$/g, "").trim();
  let confidence: "high" | "low" = "high";
  let detectedLanguage: string | undefined;
  const LOW_PREFIX = "[LOW_CONFIDENCE]:";
  if (text.startsWith(LOW_PREFIX)) { confidence = "low"; text = text.slice(LOW_PREFIX.length).trim(); }
  const langMatch = text.match(/\[LANG:([^\]]+)\]\s*$/);
  if (langMatch) { detectedLanguage = langMatch[1].trim(); text = text.slice(0, langMatch.index).trim(); }
  return { englishText: text, confidence, detectedLanguage };
}

/** Primary: Groq whisper-large-v3 with task=translate → English. */
async function transcribeWithGroq(
  audioBase64: string,
  mimeType: string,
  groqKey: string,
): Promise<{ englishText: string; confidence: "high" | "low"; detectedLanguage: string | undefined }> {
  const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
  // Groq rejects codec params (e.g. "audio/webm;codecs=opus") — strip to base type
  const groqMimeType = mimeType.split(";")[0].trim();
  const form = new FormData();
  form.append("file", new Blob([audioBytes], { type: groqMimeType }), "audio.webm");
  form.append("model", "whisper-large-v3");
  form.append("response_format", "verbose_json");
  form.append("task", "translate");
  form.append("temperature", "0");

  const resp = await fetchWithRetry(GROQ_STT_URL, {
    method: "POST",
    headers: { "Authorization": `Bearer ${groqKey}` },
    body: form,
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    throw new Error(`groq_${resp.status}: ${err.slice(0, 200)}`);
  }

  const data = await resp.json() as {
    text: string;
    language?: string;
    duration?: number;
    segments?: Array<{ avg_logprob: number }>;
  };

  const englishText = data.text?.trim() ?? "";
  const rawLang = data.language?.toLowerCase() ?? "";
  const detectedLanguage = WHISPER_LANG_MAP[rawLang] ?? (rawLang || undefined);

  const segments = data.segments ?? [];
  const avgLogprob = segments.length > 0
    ? segments.reduce((s, seg) => s + (seg.avg_logprob ?? 0), 0) / segments.length
    : -0.3;
  const confidence: "high" | "low" = avgLogprob > -0.5 ? "high" : "low";

  return { englishText, confidence, detectedLanguage };
}

/** Fallback: Gemini non-streaming (used only when Groq fails). */
async function transcribeWithGemini(
  audioBase64: string,
  mimeType: string,
  geminiKey: string,
  sourceLanguages: string[],
  preferredLanguage: string | undefined,
): Promise<{ englishText: string; confidence: "high" | "low"; detectedLanguage: string | undefined }> {
  const body = {
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType, data: audioBase64 } },
        { text: buildGeminiPrompt(sourceLanguages, preferredLanguage) },
      ],
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 2048, candidateCount: 1 },
  };

  const resp = await fetchWithRetry(
    `${GEMINI_GENERATE_URL}?key=${geminiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
  );

  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    throw new Error(`gemini_${resp.status}: ${err.slice(0, 200)}`);
  }

  const data = await resp.json();
  const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return parseGeminiText(raw);
}

async function logGovernance(params: {
  action: string;
  payload: Record<string, unknown>;
  status: "ok" | "error";
  error_message?: string;
}) {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !svc) return;
    const sb = createClient(url, svc, { auth: { persistSession: false } });
    await sb.from("ai_governance_audit_log").insert({
      action: params.action,
      payload: params.payload,
      status: params.status,
      error_message: params.error_message ?? null,
      source: "voice-transcribe",
    } as never);
  } catch { /* non-blocking */ }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // ── Auth ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const GROQ_API_KEY   = Deno.env.get("GROQ_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GROQ_API_KEY && !GEMINI_API_KEY) {
      console.error("voice-transcribe: no GROQ_API_KEY or GEMINI_API_KEY set");
      return json({ error: "server_misconfiguration" }, 500);
    }

    // ── Request body ──────────────────────────────────────────────────
    const body = await req.json();
    const audioBase64: string | undefined = body?.audioBase64;
    const mimeType: string               = body?.mimeType ?? "audio/webm";
    const sessionId: string | undefined  = body?.sessionId;
    const sourceLanguages: string[]      = Array.isArray(body?.sourceLanguages)
      ? body.sourceLanguages : ["ar-SA", "ur-PK", "hi-IN"];
    const preferredLanguage: string | undefined = body?.preferredLanguage ?? undefined;

    if (!audioBase64 || audioBase64.length < 100)
      return json({ error: "empty_audio", message: "No audio data provided" }, 400);

    const estimatedBytes = Math.floor(audioBase64.length * 0.75);
    if (estimatedBytes > 10 * 1024 * 1024)
      return json({ error: "audio_too_large", message: "Audio exceeds 10MB limit" }, 413);

    // ── Transcription — Groq primary, Gemini fallback ────────────────
    let englishText: string;
    let confidence: "high" | "low";
    let detectedLanguage: string | undefined;
    let provider: "groq" | "gemini" = "groq";

    if (GROQ_API_KEY) {
      try {
        ({ englishText, confidence, detectedLanguage } = await transcribeWithGroq(audioBase64, mimeType, GROQ_API_KEY));
      } catch (groqErr) {
        console.warn("voice-transcribe Groq failed, falling back to Gemini:", groqErr);
        if (!GEMINI_API_KEY) {
          const msg = groqErr instanceof Error ? groqErr.message : "Groq transcription failed";
          const is429 = msg.includes("groq_429");
          return json({ error: is429 ? "rate_limited" : "gateway_error", message: is429 ? "Busy — try again in a moment" : msg }, is429 ? 429 : 502);
        }
        provider = "gemini";
        ({ englishText, confidence, detectedLanguage } = await transcribeWithGemini(audioBase64, mimeType, GEMINI_API_KEY, sourceLanguages, preferredLanguage));
      }
    } else {
      // No Groq key — Gemini only
      provider = "gemini";
      ({ englishText, confidence, detectedLanguage } = await transcribeWithGemini(audioBase64, mimeType, GEMINI_API_KEY!, sourceLanguages, preferredLanguage));
    }

    if (!englishText || englishText.trim() === "[no_speech]") {
      await logGovernance({ action: "voice_transcribe", payload: { sessionId, audioBytes: estimatedBytes, noSpeech: true, provider }, status: "ok" });
      return json({ error: "no_speech", message: "No speech detected in audio" }, 422);
    }

    // ── SSE response (streaming=true client path) ─────────────────────
    // Groq responds synchronously; we wrap the result as a single SSE packet
    // so the client SSE reader works unchanged (no partial text with Groq).
    const streaming: boolean = body?.streaming === true;

    logGovernance({
      action: "voice_transcribe",
      payload: { sessionId, audioBytes: estimatedBytes, outputLength: englishText.length, sourceLanguages, provider, confidence },
      status: "ok",
    }).catch(() => {});

    if (streaming) {
      const packet = `data: ${JSON.stringify({ englishText, confidence, detectedLanguage })}\ndata: [DONE]\n\n`;
      return new Response(packet, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
      });
    }

    return json({ englishText, confidence, detectedLanguage, mimeType, provider });

  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("voice-transcribe unhandled:", message);
    await logGovernance({ action: "voice_transcribe", payload: {}, status: "error", error_message: message });
    // If both providers 429'd, return a proper 429 so client shows "Busy" toast
    if (message.includes("_429")) {
      return json({ error: "rate_limited", message: "Busy — try again in a moment" }, 429);
    }
    return json({ error: "internal_error", message }, 500);
  }
});
