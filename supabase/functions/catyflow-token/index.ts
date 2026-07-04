/**
 * catyflow-token — mints an ephemeral realtime-transcription session for
 * CatyFlow dictation (CAT-VOICE-FLOW-20260704-001).
 *
 * The browser never sees a long-lived AI key: this function verifies the
 * Supabase JWT, then asks the configured AI gateway (OpenAI-compatible
 * Realtime API) for a short-lived client secret the browser uses to open
 * a WebRTC transcription session directly with the provider. Audio never
 * transits Supabase.
 *
 * Env:
 *   AI_GATEWAY_URL       — OpenAI-compatible base URL (default api.openai.com)
 *   AI_GATEWAY_API_KEY   — gateway key (falls back to OPENAI_API_KEY)
 *   CATYFLOW_ASR_MODEL   — default gpt-4o-mini-transcribe
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    // ---- Auth: verify Supabase JWT ----
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";
    const sb = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await sb.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

    const gatewayUrl = (Deno.env.get("AI_GATEWAY_URL") ?? "https://api.openai.com").replace(/\/$/, "");
    const apiKey = Deno.env.get("AI_GATEWAY_API_KEY") ?? Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "not_configured", message: "AI gateway key missing" }, 503);

    const model = Deno.env.get("CATYFLOW_ASR_MODEL") ?? "gpt-4o-mini-transcribe";

    // Optional keyterm vocabulary from the caller (personal dictionary)
    let vocabulary: string[] = [];
    try {
      const body = await req.json();
      if (Array.isArray(body?.vocabulary)) {
        vocabulary = body.vocabulary.filter((t: unknown) => typeof t === "string").slice(0, 80);
      }
    } catch {
      // empty body is fine
    }

    const prompt = vocabulary.length
      ? `Vocabulary: ${vocabulary.join(", ")}`
      : undefined;

    // ---- Mint ephemeral client secret for a realtime transcription session ----
    const resp = await fetch(`${gatewayUrl}/v1/realtime/client_secrets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_after: { anchor: "created_at", seconds: 600 },
        session: {
          type: "transcription",
          audio: {
            input: {
              transcription: {
                model,
                ...(prompt ? { prompt } : {}),
              },
              noise_reduction: { type: "near_field" },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 700,
              },
            },
          },
        },
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      const is429 = resp.status === 429;
      return json(
        { error: is429 ? "rate_limited" : "gateway_error", message: detail.slice(0, 400) },
        is429 ? 429 : 502,
      );
    }

    const data = await resp.json();
    return json({
      client_secret: data?.value ?? data?.client_secret?.value ?? null,
      expires_at: data?.expires_at ?? data?.client_secret?.expires_at ?? null,
      model,
      realtime_url: `${gatewayUrl.replace(/^http/, "http")}/v1/realtime`,
    });
  } catch (e) {
    return json({ error: "internal", message: String(e).slice(0, 300) }, 500);
  }
});
