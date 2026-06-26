/**
 * ICE servers for huddle WebRTC. STUN-only today (free Google servers).
 * TURN is read from env when present — populate VITE_TURN_URL/USER/CRED to
 * enable relay for restrictive networks with zero code change.
 */
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
