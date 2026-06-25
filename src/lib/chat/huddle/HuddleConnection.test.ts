import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- mocks ----
const sent: any[] = [];
let signalCb: ((s: any) => void) | null = null;
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('../ChatRealtimeManager', () => ({
  chatRealtime: {
    subscribeHuddleSignal: (_c: string, cb: (s: any) => void) => { signalCb = cb; return () => {}; },
    sendHuddleSignal: (_c: string, s: any) => { sent.push(s); },
  },
}));

const track = { stop: vi.fn(), enabled: true };
const fakeStream = { getTracks: () => [track], getAudioTracks: () => [track] } as unknown as MediaStream;

let lastPC: FakePC;

class FakePC {
  connectionState: RTCPeerConnectionState = 'new';
  onicecandidate: any; ontrack: any; onconnectionstatechange: any;
  addTrack = vi.fn();
  createOffer = vi.fn(async () => ({ type: 'offer', sdp: 'o' }));
  createAnswer = vi.fn(async () => ({ type: 'answer', sdp: 'a' }));
  setLocalDescription = vi.fn(async () => {});
  setRemoteDescription = vi.fn(async () => {});
  addIceCandidate = vi.fn(async () => {});
  close = vi.fn();
  constructor() { lastPC = this; }
}

beforeEach(() => {
  sent.length = 0; signalCb = null;
  (globalThis as any).RTCPeerConnection = FakePC as any;
  (globalThis as any).navigator = { mediaDevices: { getUserMedia: vi.fn(async () => fakeStream) } };
});

import { HuddleConnection } from './HuddleConnection';

describe('HuddleConnection', () => {
  it('announces join on start and captures mic', async () => {
    const c = new HuddleConnection({ conversationId: 'cv', selfId: 'aaa', onRemoteStream: () => {}, onConnectionState: () => {} });
    await c.start();
    expect((navigator.mediaDevices.getUserMedia as any)).toHaveBeenCalledWith({ audio: true });
    expect(sent.some(s => s.kind === 'join' && s.from === 'aaa')).toBe(true);
  });

  it('lower id becomes the offerer when the other peer joins', async () => {
    const c = new HuddleConnection({ conversationId: 'cv', selfId: 'aaa', onRemoteStream: () => {}, onConnectionState: () => {} });
    await c.start();
    sent.length = 0;
    signalCb!({ kind: 'join', from: 'zzz' }); // remote id is higher → we (aaa) offer
    await Promise.resolve(); await Promise.resolve();
    expect(sent.some(s => s.kind === 'offer')).toBe(true);
  });

  it('mute toggles the audio track enabled flag', async () => {
    const c = new HuddleConnection({ conversationId: 'cv', selfId: 'aaa', onRemoteStream: () => {}, onConnectionState: () => {} });
    await c.start();
    c.setMicMuted(true);
    expect(track.enabled).toBe(false);
    c.setMicMuted(false);
    expect(track.enabled).toBe(true);
  });

  it('buffers early ICE candidates and applies them after setRemoteDescription', async () => {
    const c = new HuddleConnection({ conversationId: 'cv', selfId: 'zzz', onRemoteStream: () => {}, onConnectionState: () => {} });
    await c.start();

    // Deliver an ICE candidate BEFORE any offer/answer (remoteDescSet is false).
    const earlyCandidate = { candidate: 'candidate:1 1 UDP 2113667327 10.0.0.1 56789 typ host', sdpMid: '0', sdpMLineIndex: 0 };
    signalCb!({ kind: 'ice-candidate', from: 'aaa', candidate: earlyCandidate });
    await Promise.resolve();

    // PC has not been created yet (no join/offer received), so addIceCandidate cannot have been called.
    // Even if PC existed, remoteDescSet=false means the candidate is buffered.
    const pcBeforeOffer = lastPC as FakePC | undefined;
    if (pcBeforeOffer) {
      expect(pcBeforeOffer.addIceCandidate).not.toHaveBeenCalled();
    }

    // Now deliver an offer (sets remoteDescription → drains buffer).
    // selfId='zzz' > 'aaa' so zzz is the answerer; receiving an offer is valid.
    signalCb!({ kind: 'offer', from: 'aaa', sdp: { type: 'offer', sdp: 'o' } });
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();

    // After setRemoteDescription the buffered candidate must have been applied.
    expect(lastPC.addIceCandidate).toHaveBeenCalledWith(earlyCandidate);
  });

  it('bounded join loop: duplicate join signal causes at most one offer and one re-announce', async () => {
    const c = new HuddleConnection({ conversationId: 'cv', selfId: 'aaa', onRemoteStream: () => {}, onConnectionState: () => {} });
    await c.start();
    sent.length = 0; // clear the initial join from start()
    // Deliver the same peer's join signal TWICE (simulates echo / re-announce from remote).
    signalCb!({ kind: 'join', from: 'zzz' });
    await Promise.resolve(); await Promise.resolve();
    signalCb!({ kind: 'join', from: 'zzz' });
    await Promise.resolve(); await Promise.resolve();
    // Only ONE offer should have been sent (not two).
    expect(sent.filter(s => s.kind === 'offer')).toHaveLength(1);
    // Only ONE re-announce join should have been sent (not two).
    expect(sent.filter(s => s.kind === 'join')).toHaveLength(1);
  });

  it('close stops tracks, broadcasts leave, closes peer', async () => {
    const c = new HuddleConnection({ conversationId: 'cv', selfId: 'aaa', onRemoteStream: () => {}, onConnectionState: () => {} });
    await c.start();
    // Trigger PC creation so we can verify close() is called on it.
    signalCb!({ kind: 'join', from: 'zzz' });
    await Promise.resolve(); await Promise.resolve();
    c.close();
    expect(track.stop).toHaveBeenCalled();
    expect(sent.some(s => s.kind === 'leave' && s.from === 'aaa')).toBe(true);
    expect(lastPC.close).toHaveBeenCalled();
  });
});
