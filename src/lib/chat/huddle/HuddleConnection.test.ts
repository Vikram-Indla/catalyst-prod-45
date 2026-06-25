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

  it('close stops tracks, broadcasts leave, closes peer', async () => {
    const c = new HuddleConnection({ conversationId: 'cv', selfId: 'aaa', onRemoteStream: () => {}, onConnectionState: () => {} });
    await c.start();
    c.close();
    expect(track.stop).toHaveBeenCalled();
    expect(sent.some(s => s.kind === 'leave' && s.from === 'aaa')).toBe(true);
  });
});
