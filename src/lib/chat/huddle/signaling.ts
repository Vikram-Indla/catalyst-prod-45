export type HuddleSignal =
  | { kind: 'join'; from: string }
  | { kind: 'leave'; from: string }
  | { kind: 'offer'; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: 'answer'; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: 'ice-candidate'; from: string; candidate: RTCIceCandidateInit };

export const HUDDLE_SIGNAL_EVENT = 'huddle-signal';
