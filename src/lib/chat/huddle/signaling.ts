/**
 * Huddle signaling messages. Multi-party (mesh) capable: offer/answer/ice are
 * TARGETED at one peer via `to`, so with 3–4 people in a call each pair
 * negotiates its own RTCPeerConnection without cross-talk. `join`/`leave` stay
 * broadcast (no `to`) for peer discovery; a `join` MAY carry `to` when it's a
 * directed reply ("I'm here too") to a specific newcomer.
 */
export type HuddleSignal =
  | { kind: 'join'; from: string; to?: string }
  | { kind: 'leave'; from: string }
  | { kind: 'offer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { kind: 'answer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { kind: 'ice-candidate'; from: string; to: string; candidate: RTCIceCandidateInit };

export const HUDDLE_SIGNAL_EVENT = 'huddle-signal';
