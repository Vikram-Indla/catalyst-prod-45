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
  /** A marker/annotation message arrived from the peer over the data channel. */
  onMarker?: (m: unknown) => void;
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
  /** P2P data channel for screen-share markers/annotations. */
  private markerChannel: RTCDataChannel | null = null;

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

  private wireMarkerChannel(): void {
    const ch = this.markerChannel;
    if (!ch) return;
    ch.onmessage = (e) => {
      try { this.opts.onMarker?.(JSON.parse(e.data as string)); } catch { /* ignore */ }
    };
  }

  /** Send a marker/annotation message to the peer (no-op until channel open). */
  sendMarker(data: unknown): void {
    if (this.markerChannel?.readyState === 'open') {
      try { this.markerChannel.send(JSON.stringify(data)); } catch { /* ignore */ }
    }
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
    try { this.markerChannel?.close(); } catch { /* ignore */ }
    this.markerChannel = null;
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
    // Answerer receives the marker data channel the offerer created.
    pc.ondatachannel = (e) => { this.markerChannel = e.channel; this.wireMarkerChannel(); };
    this.pc = pc;
    return pc;
  }

  private amOfferer(): boolean {
    return this.remoteId !== null && this.opts.selfId < this.remoteId;
  }

  /** The peer's connection is gone (ICE dropped or closed). Used to detect a
   *  rejoin after the other side dropped, so we rebuild + renegotiate rather
   *  than ignore the duplicate join. */
  private peerDead(): boolean {
    const st = this.pc?.connectionState;
    return st === 'disconnected' || st === 'failed' || st === 'closed';
  }

  /** Tear down the stale RTCPeerConnection and build a fresh one, re-adding our
   *  local audio (via ensurePc) AND any in-progress screen share. Used when the
   *  peer rejoins after a drop — their new pc has no prior SDP/ICE state, so
   *  reusing our old pc would never reconnect. */
  private rebuildPc(): RTCPeerConnection {
    try { this.pc?.close(); } catch { /* ignore */ }
    this.pc = null;
    this.remoteDescSet = false;
    this.pendingCandidates = [];
    this.makingOffer = false;
    this.markerChannel = null;
    this.screenSender = null;
    const pc = this.ensurePc();
    if (this.screenStream) {
      const track = this.screenStream.getVideoTracks()[0];
      if (track) { try { this.screenSender = pc.addTrack(track, this.screenStream); } catch { /* ignore */ } }
    }
    return pc;
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
        // A repeated join from the same peer is normally the periodic
        // re-announce — ignore it. EXCEPT when our connection to them is dead:
        // that means they dropped and are rejoining with a fresh pc, so we must
        // rebuild and re-offer (otherwise they hang on "Connecting…").
        const rejoin = this.remoteId === sig.from && this.peerDead();
        if (this.remoteId === sig.from && !rejoin) break;
        this.remoteId = sig.from;
        chatRealtime.sendHuddleSignal(this.opts.conversationId, { kind: 'join', from: this.opts.selfId });
        if (this.amOfferer() && (!this.pc || rejoin)) {
          const pc = rejoin ? this.rebuildPc() : this.ensurePc();
          // Offerer creates the marker data channel (must exist before the offer).
          if (typeof pc.createDataChannel === 'function') {
            this.markerChannel = pc.createDataChannel('huddle-markers');
            this.wireMarkerChannel();
          }
          await this.sendOffer(pc);
        }
        break;
      }
      case 'offer': {
        this.remoteId = sig.from;
        // Answerer side of a rejoin: our old pc is dead, so rebuild before
        // applying the fresh offer (re-adds our audio + any screen share).
        const rebuilt = this.peerDead();
        if (rebuilt) this.rebuildPc();
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
        // Rejoin recovery: if WE are sharing, the offer we just answered had no
        // video m-line (the rejoiner wasn't sharing), so our screen track can't
        // ride this answer. Renegotiate (send our own offer) to add it.
        if (rebuilt && this.screenStream) void this.renegotiate();
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
        // The other person left. Clear their screen if they were sharing, mark
        // the connection disconnected — but do NOT tear down our own call: you
        // stay in the huddle (mic on) until YOU leave (phone-call behaviour).
        this.opts.onRemoteScreen?.(null);
        this.opts.onConnectionState('disconnected');
        break;
      }
    }
  }
}
