/**
 * voice-transcribe — Phase 1 Gemini multimodal STT + translation.
 *
 * Accepts: audio blob as base64 in request body.
 * Flow: audio (AR/UR/HI) → Gemini 2.5 Flash native API → English text.
 *
 * Uses the native Gemini generateContent API (not the OpenAI-compat wrapper)
 * because the OpenAI-compat endpoint does not support inlineData audio parts.
 *
 * Security:
 *   - Auth required (Supabase JWT validated by serve())
 *   - GEMINI_API_KEY only in env — never sent to client
 *   - No audio stored
 *   - Audit row written to ai_governance_audit_log
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

const GEMINI_GENERATE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const SOURCE_LANG_LABELS: Record<string, string> = {
  "ar-SA": "Arabic (Saudi)",
  "ar-AE": "Arabic (UAE)",
  "ur-PK": "Urdu",
  "hi-IN": "Hindi",
};

function buildPrompt(sourceLanguages: string[], cleanupEnabled: boolean): string {
  const langs = sourceLanguages
    .map(l => SOURCE_LANG_LABELS[l] ?? l)
    .join(", ");

  return (
    `Transcribe the following audio recorded in ${langs}.\n` +
    `Translate the transcribed text to fluent English.\n` +
    (cleanupEnabled
      ? "Remove filler words (um, uh, hmm), false starts, and obvious repetitions from the English output.\n"
      : "") +
    "Return ONLY the clean English translation. No preamble, no commentary, no source-language text.\n" +
    "If the audio is silent or contains no speech, return the exact string: [no_speech]"
  );
}

async function logGovernance(params: {
  action: string;
  payload: Record<string, unknown>;
  status: "ok" | "error";
  error_message?: string;
}) {
  try {
    const url  = Deno.env.get("SUPABASE_URL");
    const svc  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !svc) return;
    const sb = createClient(url, svc, { auth: { persistSession: false } });
    await sb.from("ai_governance_audit_log").insert({
      action:        params.action,
      payload:       params.payload,
      status:        params.status,
      error_message: params.error_message ?? null,
      source:        "voice-transcribe",
    } as never);
  } catch { /* never block the response */ }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // ── Auth ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("voice-transcribe: GEMINI_API_KEY not set");
      return json({ error: "server_misconfiguration" }, 500);
    }

    // ── Request body ──────────────────────────────────────────────────
    const body = await req.json();
    const audioBase64: string | undefined = body?.audioBase64;
    const mimeType: string = body?.mimeType ?? "audio/webm";
    const sessionId: string | undefined = body?.sessionId;
    const sourceLanguages: string[] = Array.isArray(body?.sourceLanguages)
      ? body.sourceLanguages
      : ["ar-SA", "ur-PK", "hi-IN"];
    const cleanupEnabled: boolean = body?.cleanupEnabled !== false;

    if (!audioBase64 || audioBase64.length < 100) {
      return json({ error: "empty_audio", message: "No audio data provided" }, 400);
    }

    // Sanity check: base64 string → audio size
    const estimatedBytes = Math.floor(audioBase64.length * 0.75);
    if (estimatedBytes > 10 * 1024 * 1024) { // 10MB guard
      return json({ error: "audio_too_large", message: "Audio exceeds 10MB limit" }, 413);
    }

    // ── Gemini native API call ────────────────────────────────────────
    const prompt = buildPrompt(sourceLanguages, cleanupEnabled);

    const geminiBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        candidateCount: 1,
      },
    };

    const geminiResp = await fetch(
      `${GEMINI_GENERATE_URL}?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      },
    );

    if (!geminiResp.ok) {
      const status = geminiResp.status;
      const errBody = await geminiResp.text().catch(() => "");
      console.error("voice-transcribe Gemini error:", status, errBody.slice(0, 500));
      await logGovernance({
        action: "voice_transcribe",
        payload: { sessionId, audioBytes: estimatedBytes, status },
        status: "error",
        error_message: `gemini_${status}`,
      });
      const code = status === 429 ? "rate_limited"
                 : status === 400 ? "invalid_audio"
                 : "gateway_error";
      return json({
        error: code,
        message: status === 429 ? "Rate limit exceeded, try again in a moment" : "Transcription failed",
      }, status);
    }

    const geminiData = await geminiResp.json();

    // Navigate Gemini response: candidates[0].content.parts[0].text
    const rawText: string =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!rawText || rawText.trim() === "[no_speech]") {
      await logGovernance({
        action: "voice_transcribe",
        payload: { sessionId, audioBytes: estimatedBytes, noSpeech: true },
        status: "ok",
      });
      return json({ error: "no_speech", message: "No speech detected in audio" }, 422);
    }

    const englishText = rawText.trim().replace(/^["«]+|["»]+$/g, "").trim();

    if (!englishText) {
      return json({ error: "empty_result", message: "Transcription returned empty text" }, 502);
    }

    // Extract detected language hint from usage metadata if available
    const detectedLanguage: string | undefined =
      geminiData?.usageMetadata?.inputTokensDetails?.[0]?.modality === "AUDIO"
        ? undefined // Gemini doesn't report detected lang in v1beta yet
        : undefined;

    logGovernance({
      action: "voice_transcribe",
      payload: {
        sessionId,
        audioBytes: estimatedBytes,
        outputLength: englishText.length,
        sourceLanguages,
        cleanupEnabled,
      },
      status: "ok",
    }).catch(() => {});

    return json({ englishText, detectedLanguage, mimeType });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("voice-transcribe unhandled:", message);
    await logGovernance({
      action: "voice_transcribe",
      payload: {},
      status: "error",
      error_message: message,
    });
    return json({ error: "internal_error", message }, 500);
  }
});
