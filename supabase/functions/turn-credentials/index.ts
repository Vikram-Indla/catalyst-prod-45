// turn-credentials — mints short-lived (ephemeral) TURN credentials for the
// huddle WebRTC relay. coturn runs with `use-auth-secret` + `static-auth-secret`;
// the credential is HMAC-SHA1(secret, "<expiry>:<user>") so the long-lived
// secret NEVER ships to the browser. Auth is enforced by the platform
// (verify_jwt) so only signed-in users can request relay creds.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Creds valid 24h. coturn caps a relay allocation at the credential expiry, so
// the TTL must outlast any realistic call (a 1h TTL would drop relay mid-call
// after an hour). Still per-call ephemeral — the static secret never ships.
const TTL_SECONDS = 24 * 60 * 60;

function base64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("TURN_SECRET");
  const turnUrl = Deno.env.get("TURN_URL") ?? "turns:turn.senaei.app:5349";
  if (!secret) {
    return new Response(JSON.stringify({ error: "TURN_SECRET not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // username = "<unix-expiry>:<label>" — coturn validates the expiry itself.
  const expiry = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const username = `${expiry}:catalyst`;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(username));
  const credential = base64(sig);

  // Offer both TLS/TCP (turns:5349) and plain UDP (turn:3478) when the domain is
  // known, so ICE can pick the fastest reachable transport.
  const host = turnUrl.replace(/^turns?:/, "").replace(/:\d+$/, "");
  const urls = [turnUrl, `turn:${host}:3478`];

  return new Response(
    JSON.stringify({ urls, username, credential, ttl: TTL_SECONDS }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
