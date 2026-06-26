/**
 * HuddleConnection — a single 2-person, audio-only WebRTC peer connection plus
 * its signaling glue. Separate concern from voice-flow/AudioCaptureService
 * (dictation): this drives a live call, not a recording.
 *
 * Offer-role tiebreak: when both peers are present, the one with the
 * lexicographically smaller user id creates the offer, so the two sides never
 * offer simultaneously (glare avoidance).
 */
import { chatRealtime } from '../ChatRealtimeManager';
import type { HuddleSignal } from './signaling';
import { getIceServers } from './iceConfig';

interface HuddleConnectionOpts {
  conversationId: string;
  selfId: string;
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionState: (state: RTCPeerConnectionState) => void;
}

export class HuddleConnection {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private unsub: (() => void) | null = null;
  private remoteId: string | null = null;
  /** ICE candidates received before setRemoteDescription was called are buffered here and drained immediately after. */
  private pendingCandidates: RTCIceCandidateInit[] = [];
  /** Set to true after the first successful setRemoteDescription so buffered candidates can be flushed. */
  private remoteDescSet = false;
  /** Periodic "join" announcer. The Supabase broadcast channel subscribes
   *  asynchronously, so a single join sent right after subscribe() is dropped
   *  (channel not joined yet) — and if BOTH peers drop their first join, neither
   *  ever learns about the other and negotiation deadlocks (endless "connecting").
   *  Re-announcing until the handshake starts guarantees eventual delivery. */
  private joinTimer: ReturnType<typeof setInterval> | null = null;
  private joinAttempts = 0;

  constructor(private opts: HuddleConnectionOpts) {}

  async start(): Promise<void> {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.unsub = chatRealtime.subscribeHuddleSignal(this.opts.conversationId, (sig) =>
      this.onSignal(sig),
    );
    // Announce presence immediately, then keep re-announcing (~every 1.5s, capped)
    // until the connection starts — the first send often lands before the channel
    // has finished subscribing and is silently dropped.
    this.announceJoin();
    this.joinTimer = setInterval(() => {
      this.joinAttempts += 1;
      if (this.joinAttempts > 14) { this.stopAnnounce(); return; } // ~21s cap
      const st = this.pc?.connectionState;
      if (st === 'connecting' || st === 'connected' || st === 'completed') { this.stopAnnounce(); return; }
      this.announceJoin();
    }, 1500);
  }

  private announceJoin(): void {
    chatRealtime.sendHuddleSignal(this.opts.conversationId, { kind: 'join', from: this.opts.selfId });
  }

  private stopAnnounce(): void {
    if (this.joinTimer) { clearInterval(this.joinTimer); this.joinTimer = null; }
  }

  setMicMuted(muted: boolean): void {
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }

  close(): void {
    this.stopAnnounce();
    chatRealtime.sendHuddleSignal(this.opts.conversationId, { kind: 'leave', from: this.opts.selfId });
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.pc?.close();
    this.pc = null;
    this.unsub?.();
    this.unsub = null;
  }

  private ensurePc(): RTCPeerConnection {
    if (this.pc) return this.pc;
    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    // addTrack is skipped when localStream is null (start() is the only intended caller and always sets it first).
    this.localStream?.getTracks().forEach((t) => pc.addTrack(t, this.localStream as MediaStream));
    pc.ontrack = (e) => {
      const [stream] = e.streams;
      if (stream) this.opts.onRemoteStream(stream);
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        chatRealtime.sendHuddleSignal(this.opts.conversationId, {
          kind: 'ice-candidate',
          from: this.opts.selfId,
          candidate: e.candidate.toJSON(),
        });
      }
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'connecting' || st === 'connected' || st === 'completed') this.stopAnnounce();
      this.opts.onConnectionState(st);
    };
    this.pc = pc;
    return pc;
  }

  private amOfferer(): boolean {
    return this.remoteId !== null && this.opts.selfId < this.remoteId;
  }

  private async onSignal(sig: HuddleSignal): Promise<void> {
    if (sig.from === this.opts.selfId) return;
    switch (sig.kind) {
      case 'join': {
        if (this.remoteId === sig.from) break;
        this.remoteId = sig.from;
        // Re-announce so a peer who joined first also learns about us.
        // Idempotent: the guard above ensures this fires at most once per remote peer.
        chatRealtime.sendHuddleSignal(this.opts.conversationId, { kind: 'join', from: this.opts.selfId });
        if (this.amOfferer() && !this.pc) {
          const pc = this.ensurePc();
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          chatRealtime.sendHuddleSignal(this.opts.conversationId, { kind: 'offer', from: this.opts.selfId, sdp: offer });
        }
        break;
      }
      case 'offer': {
        this.remoteId = sig.from;
        const pc = this.ensurePc();
        await pc.setRemoteDescription(sig.sdp);
        this.remoteDescSet = true;
        for (const c of this.pendingCandidates) {
          try { await this.pc?.addIceCandidate(c); } catch { /* stale candidate */ }
        }
        this.pendingCandidates = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        chatRealtime.sendHuddleSignal(this.opts.conversationId, { kind: 'answer', from: this.opts.selfId, sdp: answer });
        break;
      }
      case 'answer': {
        await this.pc?.setRemoteDescription(sig.sdp);
        this.remoteDescSet = true;
        for (const c of this.pendingCandidates) {
          try { await this.pc?.addIceCandidate(c); } catch { /* stale candidate */ }
        }
        this.pendingCandidates = [];
        break;
      }
      case 'ice-candidate': {
        if (this.pc && this.remoteDescSet) {
          try { await this.pc.addIceCandidate(sig.candidate); } catch { /* stale candidate */ }
        } else {
          // Buffer early candidates — remote description not yet set; drain happens after setRemoteDescription.
          this.pendingCandidates.push(sig.candidate);
        }
        break;
      }
      case 'leave': {
        this.opts.onConnectionState('disconnected');
        break;
      }
    }
  }
}
