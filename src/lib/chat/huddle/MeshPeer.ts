/**
 * MeshPeer — ONE RTCPeerConnection to ONE remote participant, used by HuddleMesh
 * to build an N-way (up to 4) audio + screen-share call as a full mesh.
 *
 * Unlike the old 1:1 HuddleConnection, a MeshPeer:
 *  - does NOT own the mic (the mesh acquires it once and shares the stream to
 *    every peer),
 *  - does NOT subscribe to signaling (the mesh routes signals to the right peer),
 *  - sends every offer/answer/ice TARGETED at its `remoteId` (via `to`).
 *
 * Offer-role tiebreak: the lexicographically smaller user id offers (glare
 * avoidance). Mid-call renegotiation (screen share) uses perfect-negotiation
 * collision handling so either side can renegotiate safely.
 */
import type { HuddleSignal } from './signaling';

export interface MeshPeerOpts {
  selfId: string;
  remoteId: string;
  localStream: MediaStream;
  iceServers: RTCIceServer[];
  /** Send a signal to the conversation channel. Mesh sets `to` already applied. */
  send: (sig: HuddleSignal) => void;
  onRemoteStream: (remoteId: string, stream: MediaStream) => void;
  onConnectionState: (remoteId: string, state: RTCPeerConnectionState) => void;
  onRemoteScreen: (remoteId: string, stream: MediaStream | null) => void;
  onMarker: (remoteId: string, m: unknown) => void;
}

export class MeshPeer {
  private pc: RTCPeerConnection | null = null;
  private screenSender: RTCRtpSender | null = null;
  private screenStream: MediaStream | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private remoteDescSet = false;
  private makingOffer = false;
  private markerChannel: RTCDataChannel | null = null;

  constructor(private opts: MeshPeerOpts) {}

  get connectionState(): RTCPeerConnectionState {
    return this.pc?.connectionState ?? 'new';
  }

  private get selfId() { return this.opts.selfId; }
  private get remoteId() { return this.opts.remoteId; }

  private amOfferer(): boolean {
    return this.selfId < this.remoteId;
  }

  private send(sig: HuddleSignal): void {
    this.opts.send(sig);
  }

  /** Called by the mesh right after construction. The smaller-id side offers. */
  maybeOffer(): void {
    if (!this.amOfferer()) return;
    const pc = this.ensurePc();
    if (typeof pc.createDataChannel === 'function') {
      this.markerChannel = pc.createDataChannel('huddle-markers');
      this.wireMarkerChannel();
    }
    void this.sendOffer(pc);
  }

  /** The peer dropped and is rejoining with a fresh pc — rebuild + re-offer. */
  handleRejoin(): void {
    if (!this.amOfferer()) return;
    const pc = this.rebuildPc();
    if (typeof pc.createDataChannel === 'function') {
      this.markerChannel = pc.createDataChannel('huddle-markers');
      this.wireMarkerChannel();
    }
    void this.sendOffer(pc);
  }

  peerDead(): boolean {
    const st = this.pc?.connectionState;
    return st === 'disconnected' || st === 'failed' || st === 'closed';
  }

  setMicMuted(muted: boolean): void {
    this.opts.localStream.getAudioTracks().forEach((t) => { t.enabled = !muted; });
  }

  isScreenSharing(): boolean {
    return !!this.screenStream;
  }

  /** Add a screen-share track to THIS peer and renegotiate. */
  async addScreen(track: MediaStreamTrack, stream: MediaStream): Promise<void> {
    const pc = this.ensurePc();
    this.screenStream = stream;
    this.screenSender = pc.addTrack(track, stream);
    await this.renegotiate();
  }

  /** Remove the screen-share track from THIS peer and renegotiate. */
  async removeScreen(): Promise<void> {
    this.screenStream = null;
    if (this.screenSender && this.pc) {
      try { this.pc.removeTrack(this.screenSender); } catch { /* ignore */ }
      this.screenSender = null;
      await this.renegotiate();
    }
  }

  sendMarker(data: unknown): void {
    if (this.markerChannel?.readyState === 'open') {
      try { this.markerChannel.send(JSON.stringify(data)); } catch { /* ignore */ }
    }
  }

  close(): void {
    try { this.markerChannel?.close(); } catch { /* ignore */ }
    this.markerChannel = null;
    this.screenSender = null;
    this.screenStream = null;
    this.pc?.close();
    this.pc = null;
  }

  // ── internals ────────────────────────────────────────────────────────────

  private wireMarkerChannel(): void {
    const ch = this.markerChannel;
    if (!ch) return;
    ch.onmessage = (e) => {
      try { this.opts.onMarker(this.remoteId, JSON.parse(e.data as string)); } catch { /* ignore */ }
    };
  }

  private ensurePc(): RTCPeerConnection {
    if (this.pc) return this.pc;
    const forceRelay = typeof localStorage !== 'undefined' && localStorage.getItem('huddle-force-relay') === '1';
    const pc = new RTCPeerConnection({
      iceServers: this.opts.iceServers,
      ...(forceRelay ? { iceTransportPolicy: 'relay' as RTCIceTransportPolicy } : {}),
    });
    this.opts.localStream.getTracks().forEach((t) => pc.addTrack(t, this.opts.localStream));
    pc.ontrack = (e) => {
      if (e.track.kind === 'video') {
        const s = new MediaStream([e.track]);
        this.opts.onRemoteScreen(this.remoteId, s);
        e.track.onended = () => this.opts.onRemoteScreen(this.remoteId, null);
        e.track.onmute = () => this.opts.onRemoteScreen(this.remoteId, null);
      } else {
        const [stream] = e.streams;
        this.opts.onRemoteStream(this.remoteId, stream || new MediaStream([e.track]));
      }
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.send({ kind: 'ice-candidate', from: this.selfId, to: this.remoteId, candidate: e.candidate.toJSON() });
      }
    };
    pc.onconnectionstatechange = () => {
      this.opts.onConnectionState(this.remoteId, pc.connectionState);
    };
    pc.ondatachannel = (e) => { this.markerChannel = e.channel; this.wireMarkerChannel(); };
    this.pc = pc;
    return pc;
  }

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

  private async sendOffer(pc: RTCPeerConnection): Promise<void> {
    try {
      this.makingOffer = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.send({ kind: 'offer', from: this.selfId, to: this.remoteId, sdp: offer });
    } finally {
      this.makingOffer = false;
    }
  }

  private async renegotiate(): Promise<void> {
    if (this.pc) await this.sendOffer(this.pc);
  }

  private reconcileRemoteScreen(): void {
    if (!this.pc || typeof this.pc.getTransceivers !== 'function') return;
    const vt = this.pc.getTransceivers().find((t) => t.receiver?.track?.kind === 'video');
    const receiving = !!vt && (vt.currentDirection === 'sendrecv' || vt.currentDirection === 'recvonly');
    this.opts.onRemoteScreen(this.remoteId, receiving && vt!.receiver.track ? new MediaStream([vt!.receiver.track]) : null);
  }

  private drainCandidates(): void {
    for (const c of this.pendingCandidates) {
      void this.pc?.addIceCandidate(c).catch(() => { /* stale candidate */ });
    }
    this.pendingCandidates = [];
  }

  /** Route an offer/answer/ice signal already confirmed to be from this remote. */
  async handleSignal(sig: HuddleSignal): Promise<void> {
    switch (sig.kind) {
      case 'offer': {
        const rebuilt = this.peerDead();
        if (rebuilt) this.rebuildPc();
        const pc = this.ensurePc();
        const polite = this.selfId > sig.from;
        const collision = this.makingOffer || (pc.signalingState ?? 'stable') !== 'stable';
        if (collision && !polite) break;
        if (collision && polite) {
          try { await pc.setLocalDescription({ type: 'rollback' } as RTCLocalSessionDescriptionInit); } catch { /* ignore */ }
        }
        await pc.setRemoteDescription(sig.sdp);
        this.remoteDescSet = true;
        this.drainCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.send({ kind: 'answer', from: this.selfId, to: this.remoteId, sdp: answer });
        this.reconcileRemoteScreen();
        if (rebuilt && this.screenStream) void this.renegotiate();
        break;
      }
      case 'answer': {
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
      default:
        break;
    }
  }
}
