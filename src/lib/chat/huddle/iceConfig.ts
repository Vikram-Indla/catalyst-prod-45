/**
 * ICE servers for huddle WebRTC.
 *
 * - STUN: free Google servers (address discovery, always on).
 * - TURN: ephemeral credentials minted per-call by the `turn-credentials` edge
 *   function (HMAC over a server-side secret — the secret never reaches the
 *   browser). Falls back to STUN-only, or to static VITE_TURN_* env if present.
 */
import { supabase } from '@/integrations/supabase/client';

/** Synchronous baseline: STUN (+ static env TURN if configured). Used as the
 *  fallback when the ephemeral-credential fetch fails or before it resolves. */
export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];
  const turnUrl = import.meta.env.VITE_TURN_URL as string | undefined;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: import.meta.env.VITE_TURN_USER as string | undefined,
      credential: import.meta.env.VITE_TURN_CRED as string | undefined,
    });
  }
  return servers;
}

/** Full ICE list with ephemeral TURN creds for a call. Always returns at least
 *  the STUN baseline so a relay-fetch failure never breaks same-network calls. */
export async function fetchIceServers(): Promise<RTCIceServer[]> {
  const base = getIceServers();
  try {
    const { data, error } = await supabase.functions.invoke<{
      urls: string | string[];
      username: string;
      credential: string;
    }>('turn-credentials');
    if (error || !data?.urls || !data.credential) return base;
    return [...base, { urls: data.urls, username: data.username, credential: data.credential }];
  } catch {
    return base;
  }
}
