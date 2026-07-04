/**
 * catyflow-token — mints an ephemeral Gemini Live API token for CatyFlow
 * dictation (CAT-VOICE-FLOW-20260704-001).
 *
 * The browser never sees the durable key: this function verifies the
 * Supabase JWT, then asks the Gemini API to mint a short-lived,
 * single-session ephemeral token constrained to a live transcription
 * session. The browser uses that token to open a WebSocket straight to
 * Gemini (BidiGenerateContent) — audio never transits Supabase.
 *
 * Gemini-native: powered by the same GEMINI_API_KEY that runs the
 * cleanup pass. No OpenAI dependency.
 *
 * Env: GEMINI_API_KEY, CATYFLOW_LIVE_MODEL (default gemini-2.0-flash-live-001)
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

const GEMINI_AUTH_TOKENS_URL =
  "https://generativelanguage.googleapis.com/v1alpha/auth_tokens";
const LIVE_WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";

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

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "not_configured", message: "GEMINI_API_KEY missing" }, 503);

    const model = "models/" + (Deno.env.get("CATYFLOW_LIVE_MODEL") ?? "gemini-2.0-flash-live-001");

    // Optional keyterm vocabulary → nudges recognition of names/jargon.
    let vocabulary: string[] = [];
    try {
      const body = await req.json();
      if (Array.isArray(body?.vocabulary)) {
        vocabulary = body.vocabulary.filter((t: unknown) => typeof t === "string").slice(0, 60);
      }
    } catch {
      // empty body is fine
    }

    // Live session config the ephemeral token is LOCKED to (probed against
    // the v1alpha auth_tokens API — the field is `bidiGenerateContentSetup`).
    // Transcribe user audio; keep model text output empty.
    const bidiSetup: Record<string, unknown> = {
      model,
      generationConfig: { responseModalities: ["TEXT"] },
      inputAudioTranscription: {},
      systemInstruction: {
        parts: [
          {
            text:
              "You are a silent transcriber. Never produce spoken or text responses. " +
              "Only the automatic input transcription of the user's speech is used." +
              (vocabulary.length ? ` Expect these terms: ${vocabulary.join(", ")}.` : ""),
          },
        ],
      },
    };

    // Ephemeral token: single new session, ~2 min to open + 16 min live
    // (covers CatyFlow's 15-min max), single-use, model+config locked.
    const now = Date.now();
    const resp = await fetch(`${GEMINI_AUTH_TOKENS_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uses: 1,
        expireTime: new Date(now + 16 * 60_000).toISOString(),
        newSessionExpireTime: new Date(now + 2 * 60_000).toISOString(),
        bidiGenerateContentSetup: bidiSetup,
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
    const tokenName: string | undefined = data?.name; // e.g. "auth_tokens/AQ.xxx"
    const ephemeral = tokenName?.startsWith("auth_tokens/")
      ? tokenName.slice("auth_tokens/".length)
      : tokenName;
    if (!ephemeral) return json({ error: "mint_failed" }, 502);

    return json({
      provider: "gemini-live",
      access_token: ephemeral,
      ws_url: LIVE_WS_URL,
      model,
    });
  } catch (e) {
    return json({ error: "internal", message: String(e).slice(0, 300) }, 500);
  }
});
