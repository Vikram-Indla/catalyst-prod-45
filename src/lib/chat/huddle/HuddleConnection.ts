/**
 * HuddleConnection — a single 2-person WebRTC connection (audio + optional
 * screen share) plus its signaling glue. Separate concern from
 * voice-flow/AudioCaptureService (dictation): this drives a live call.
 *
 * Offer-role tiebreak: the lexicographically smaller user id makes the initial
 * offer (glare avoidance). Mid-call renegotiation (screen share add/remove)
 * uses perfect-negotiation collision handling so either side can renegotiate
 * safely.
 */
import { chatRealtime } from '../ChatRealtimeManager';
import type { HuddleSignal } from './signaling';
import { getIceServers } from './iceConfig';

interface HuddleConnectionOpts {
  conversationId: string;
  selfId: string;
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionState: (state: RTCPeerConnectionState) => void;
  /** Remote peer's screen-share video stream (null when they stop). */
  onRemoteScreen?: (stream: MediaStream | null) => void;
  /** Our own screen share ended (e.g. user hit the browser "Stop sharing"). */
  onLocalScreenEnded?: () => void;
  /** The other participant left — in a 2-person call this ends the call. */
  onPeerLeft?: () => void;
}

export class HuddleConnection {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private screenSender: RTCRtpSender | null = null;
  private unsub: (() => void) | null = null;
  private remoteId: string | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private remoteDescSet = false;
  /** True while we are creating/applying our own offer — used by perfect-negotiation collision detection. */
  private makingOffer = false;
  private joinTimer: ReturnType<typeof setInterval> | null = null;
  private joinAttempts = 0;

  constructor(private opts: HuddleConnectionOpts) {}

  async start(): Promise<void> {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.unsub = chatRealtime.subscribeHuddleSignal(this.opts.conversationId, (sig) =>
      this.onSignal(sig),
    );
    this.announceJoin();
    this.joinTimer = setInterval(() => {
      this.joinAttempts += 1;
      if (this.joinAttempts > 14) { this.stopAnnounce(); return; }
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
    this.localStream?.getAudioTracks().forEach((t) => { t.enabled = !muted; });
  }

  isScreenSharing(): boolean {
    return !!this.screenStream;
  }

  /** Start sharing the screen — adds a video track and renegotiates. */
  async startScreenShare(): Promise<MediaStream> {
    const pc = this.ensurePc();
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    this.screenStream = stream;
    const track = stream.getVideoTracks()[0];
    this.screenSender = pc.addTrack(track, stream);
    // User clicking the browser's native "Stop sharing" bar.
    track.onended = () => { void this.stopScreenShare(); };
    await this.renegotiate();
    return stream;
  }

  /** Stop sharing the screen — removes the track and renegotiates. */
  async stopScreenShare(): Promise<void> {
    const had = !!this.screenStream;
    this.screenStream?.getTracks().forEach((t) => t.stop());
    this.screenStream = null;
    if (this.screenSender && this.pc) {
      try { this.pc.removeTrack(this.screenSender); } catch { /* ignore */ }
      this.screenSender = null;
      await this.renegotiate();
    }
    if (had) this.opts.onLocalScreenEnded?.();
  }

  close(): void {
    this.stopAnnounce();
    chatRealtime.sendHuddleSignal(this.opts.conversationId, { kind: 'leave', from: this.opts.selfId });
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.screenStream?.getTracks().forEach((t) => t.stop());
    this.screenStream = null;
    this.screenSender = null;
    this.pc?.close();
    this.pc = null;
    this.unsub?.();
    this.unsub = null;
  }

  private ensurePc(): RTCPeerConnection {
    if (this.pc) return this.pc;
    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    this.localStream?.getTracks().forEach((t) => pc.addTrack(t, this.localStream as MediaStream));
    pc.ontrack = (e) => {
      if (e.track.kind === 'video') {
        const s = new MediaStream([e.track]);
        this.opts.onRemoteScreen?.(s);
        e.track.onended = () => this.opts.onRemoteScreen?.(null);
        e.track.onmute = () => this.opts.onRemoteScreen?.(null);
      } else {
        const [stream] = e.streams;
        this.opts.onRemoteStream(stream || new MediaStream([e.track]));
      }
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        chatRealtime.sendHuddleSignal(this.opts.conversationId, {
          kind: 'ice-candidate', from: this.opts.selfId, candidate: e.candidate.toJSON(),
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

  /** Create + send an offer (initial or renegotiation). Guards makingOffer. */
  private async sendOffer(pc: RTCPeerConnection): Promise<void> {
    try {
      this.makingOffer = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      chatRealtime.sendHuddleSignal(this.opts.conversationId, { kind: 'offer', from: this.opts.selfId, sdp: offer });
    } finally {
      this.makingOffer = false;
    }
  }

  private async renegotiate(): Promise<void> {
    if (this.pc) await this.sendOffer(this.pc);
  }

  /** After a renegotiation, surface or clear the remote screen based on whether
   *  a live remote video track exists — reliable across browsers. */
  private reconcileRemoteScreen(): void {
    if (!this.pc || typeof this.pc.getTransceivers !== 'function') return;
    // A video transceiver whose negotiated direction lets us RECEIVE = the peer
    // is actively sharing. After they removeTrack + renegotiate, currentDirection
    // flips to 'inactive'/'sendonly' even though the track object may linger 'live'
    // — so direction is the reliable signal, not readyState.
    const vt = this.pc.getTransceivers().find((t) => t.receiver?.track?.kind === 'video');
    const receiving = !!vt && (vt.currentDirection === 'sendrecv' || vt.currentDirection === 'recvonly');
    this.opts.onRemoteScreen?.(receiving && vt!.receiver.track ? new MediaStream([vt!.receiver.track]) : null);
  }

  private drainCandidates(): void {
    for (const c of this.pendingCandidates) {
      void this.pc?.addIceCandidate(c).catch(() => { /* stale candidate */ });
    }
    this.pendingCandidates = [];
  }

  private async onSignal(sig: HuddleSignal): Promise<void> {
    if (sig.from === this.opts.selfId) return;
    switch (sig.kind) {
      case 'join': {
        if (this.remoteId === sig.from) break;
        this.remoteId = sig.from;
        chatRealtime.sendHuddleSignal(this.opts.conversationId, { kind: 'join', from: this.opts.selfId });
        if (this.amOfferer() && !this.pc) {
          await this.sendOffer(this.ensurePc());
        }
        break;
      }
      case 'offer': {
        this.remoteId = sig.from;
        const pc = this.ensurePc();
        // Perfect-negotiation collision handling (matters for mid-call screen-share renegotiation).
        const polite = this.opts.selfId > sig.from;
        const collision = this.makingOffer || (pc.signalingState ?? 'stable') !== 'stable';
        if (collision && !polite) break;                 // impolite peer ignores the colliding offer
        if (collision && polite) {
          try { await pc.setLocalDescription({ type: 'rollback' } as RTCLocalSessionDescriptionInit); } catch { /* ignore */ }
        }
        await pc.setRemoteDescription(sig.sdp);
        this.remoteDescSet = true;
        this.drainCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        chatRealtime.sendHuddleSignal(this.opts.conversationId, { kind: 'answer', from: this.opts.selfId, sdp: answer });
        // Reconcile remote screen after (re)negotiation: surface the live video
        // track if present, or clear it when the sharer removed their track.
        // This is deterministic and doesn't depend on track mute/ended events.
        this.reconcileRemoteScreen();
        break;
      }
      case 'answer': {
        // Only apply an answer when we actually have a pending local offer.
        if (this.pc && (this.pc.signalingState ?? 'have-local-offer') === 'have-local-offer') {
          await this.pc.setRemoteDescription(sig.sdp);
          this.remoteDescSet = true;
          this.drainCandidates();
        }
        break;
      }

      case 'ice-candidate': {
        if (this.pc && this.remoteDescSet) {
          try { await this.pc.addIceCandidate(sig.candidate); } catch { /* stale candidate */ }
        } else {
          this.pendingCandidates.push(sig.candidate);
        }
        break;
      }
      case 'leave': {
        if (sig.from !== this.remoteId && this.remoteId !== null) break; // ignore strays
        this.opts.onRemoteScreen?.(null);
        this.opts.onConnectionState('disconnected');
        // 2-person call: the other person hung up → end locally so the mic is
        // released and the FAB clears (no lingering recording indicator).
        this.opts.onPeerLeft?.();
        break;
      }
    }
  }
}
