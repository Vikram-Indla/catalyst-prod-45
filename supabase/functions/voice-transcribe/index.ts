/**
 * voice-transcribe — Phase 1 Gemini multimodal STT + translation.
 *
 * Accepts: audio blob as base64 in request body.
 * Flow: audio (AR/UR/HI) → Gemini 2.5 Flash native API → English text.
 *
 * Supports:
 *   - streaming=true → SSE via streamGenerateContent, partial text forwarded to client
 *   - [LOW_CONFIDENCE] prefix detection → confidence field in response
 *   - [LANG:code] detection → detectedLanguage field in response
 *   - preferredLanguage hint in prompt
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
const GEMINI_STREAM_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent";

/** Retry fetch once on 429, honouring Retry-After header (max 4 s delay). */
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 1): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const resp = await fetch(url, options);
    if (resp.status !== 429 || attempt === maxRetries) return resp;
    const retryAfter = parseInt(resp.headers.get("Retry-After") ?? "2", 10);
    await new Promise<void>((r) => setTimeout(r, Math.min(retryAfter * 1000, 4000)));
  }
  return fetch(url, options);
}

const SOURCE_LANG_LABELS: Record<string, string> = {
  "ar-SA": "Arabic (Saudi)",
  "ar-AE": "Arabic (UAE)",
  "ur-PK": "Urdu",
  "hi-IN": "Hindi",
};

function buildPrompt(sourceLanguages: string[], cleanupEnabled: boolean, preferredLanguage?: string): string {
  const langs = sourceLanguages
    .map(l => SOURCE_LANG_LABELS[l] ?? l)
    .join(", ");

  const langHint = preferredLanguage
    ? `The speaker's most recent language was "${preferredLanguage}" — use as a hint but do not assume.\n`
    : "";

  return (
    `Transcribe the following audio recorded in ${langs}.\n` +
    langHint +
    `Translate the transcribed text to fluent English.\n` +
    (cleanupEnabled
      ? "Remove filler words (um, uh, hmm), false starts, and obvious repetitions from the English output.\n"
      : "") +
    "If you are uncertain about the transcription quality (poor audio, unclear speech, heavy background noise), " +
    "prepend your response with exactly \"[LOW_CONFIDENCE]:\" followed by the transcription.\n" +
    "If you can detect the speaker's language, append exactly \"[LANG:<BCP-47-code>]\" at the very end of your response (after all text). " +
    "For example: \"[LANG:ar-SA]\" or \"[LANG:ur-PK]\".\n" +
    "Return ONLY the clean English translation (and optional markers above). No preamble, no commentary, no source-language text.\n" +
    "If the audio is silent or contains no speech, return the exact string: [no_speech]"
  );
}

/** Parse raw Gemini text → { englishText, confidence, detectedLanguage } */
function parseGeminiText(raw: string): {
  englishText: string;
  confidence: "high" | "low";
  detectedLanguage: string | undefined;
} {
  let text = raw.trim().replace(/^["«]+|["»]+$/g, "").trim();
  let confidence: "high" | "low" = "high";
  let detectedLanguage: string | undefined;

  // [LOW_CONFIDENCE]: prefix
  const LOW_PREFIX = "[LOW_CONFIDENCE]:";
  if (text.startsWith(LOW_PREFIX)) {
    confidence = "low";
    text = text.slice(LOW_PREFIX.length).trim();
  }

  // [LANG:code] suffix
  const langMatch = text.match(/\[LANG:([^\]]+)\]\s*$/);
  if (langMatch) {
    detectedLanguage = langMatch[1].trim();
    text = text.slice(0, langMatch.index).trim();
  }

  return { englishText: text, confidence, detectedLanguage };
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
    const streaming: boolean = body?.streaming === true;
    const preferredLanguage: string | undefined = body?.preferredLanguage ?? undefined;

    if (!audioBase64 || audioBase64.length < 100) {
      return json({ error: "empty_audio", message: "No audio data provided" }, 400);
    }

    const estimatedBytes = Math.floor(audioBase64.length * 0.75);
    if (estimatedBytes > 10 * 1024 * 1024) {
      return json({ error: "audio_too_large", message: "Audio exceeds 10MB limit" }, 413);
    }

    const prompt = buildPrompt(sourceLanguages, cleanupEnabled, preferredLanguage);

    const geminiBody = {
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: audioBase64 } },
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

    // ── Streaming path ────────────────────────────────────────────────
    if (streaming) {
      const geminiResp = await fetchWithRetry(
        `${GEMINI_STREAM_URL}?key=${GEMINI_API_KEY}&alt=sse`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiBody),
        },
      );

      if (!geminiResp.ok || !geminiResp.body) {
        const errBody = await geminiResp.text().catch(() => "");
        console.error("voice-transcribe streaming Gemini error:", geminiResp.status, errBody.slice(0, 500));
        const code = geminiResp.status === 429 ? "rate_limited" : "gateway_error";
        const message = geminiResp.status === 429 ? "Busy — try again in a moment" : "Transcription failed";
        return json({ error: code, message }, geminiResp.status);
      }

      // Forward Gemini SSE stream to client and accumulate for final packet
      const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      // Process Gemini SSE in background, forwarding chunks + appending final result packet
      (async () => {
        const reader = geminiResp.body!.getReader();
        let accumulated = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Forward raw chunk to client
            await writer.write(value);

            // Accumulate text for final parsing
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const raw = line.slice(6).trim();
                if (raw === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(raw);
                  const delta = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (delta) accumulated += delta;
                } catch { /* ignore */ }
              }
            }
          }

          // Parse accumulated and send final structured packet
          const { englishText, confidence, detectedLanguage } = parseGeminiText(accumulated);

          if (englishText && englishText !== "[no_speech]") {
            const finalPacket = `data: ${JSON.stringify({ englishText, confidence, detectedLanguage })}\ndata: [DONE]\n\n`;
            await writer.write(encoder.encode(finalPacket));

            logGovernance({
              action: "voice_transcribe",
              payload: { sessionId, audioBytes: estimatedBytes, outputLength: englishText.length, sourceLanguages, cleanupEnabled, streaming: true, confidence },
              status: "ok",
            }).catch(() => {});
          }
        } catch (e) {
          console.error("voice-transcribe stream error:", e);
        } finally {
          await writer.close().catch(() => {});
        }
      })();

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // ── Non-streaming path ────────────────────────────────────────────
    const geminiResp = await fetchWithRetry(
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
    const rawText: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!rawText || rawText.trim() === "[no_speech]") {
      await logGovernance({
        action: "voice_transcribe",
        payload: { sessionId, audioBytes: estimatedBytes, noSpeech: true },
        status: "ok",
      });
      return json({ error: "no_speech", message: "No speech detected in audio" }, 422);
    }

    const { englishText, confidence, detectedLanguage } = parseGeminiText(rawText);

    if (!englishText) {
      return json({ error: "empty_result", message: "Transcription returned empty text" }, 502);
    }

    logGovernance({
      action: "voice_transcribe",
      payload: { sessionId, audioBytes: estimatedBytes, outputLength: englishText.length, sourceLanguages, cleanupEnabled, confidence },
      status: "ok",
    }).catch(() => {});

    return json({ englishText, confidence, detectedLanguage, mimeType });

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
