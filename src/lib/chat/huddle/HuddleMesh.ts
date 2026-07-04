/**
 * HuddleMesh — an N-way (up to 4) audio + screen-share call built as a full
 * mesh of MeshPeer connections. Replaces the 1:1 HuddleConnection.
 *
 * Responsibilities:
 *  - acquire the mic ONCE and share the stream to every peer,
 *  - subscribe to the conversation signaling channel ONCE and route each signal
 *    to the right MeshPeer,
 *  - discover peers via broadcast `join` (directed `join` reply to newcomers),
 *  - fan screen-share / marker / mute out to all peers.
 */
import { chatRealtime } from '../ChatRealtimeManager';
import type { HuddleSignal } from './signaling';
import { getIceServers, fetchIceServers } from './iceConfig';
import { MeshPeer } from './MeshPeer';

export interface HuddleMeshOpts {
  conversationId: string;
  selfId: string;
  onRemoteStream: (remoteId: string, stream: MediaStream) => void;
  onConnectionState: (remoteId: string, state: RTCPeerConnectionState) => void;
  onRemoteScreen: (remoteId: string, stream: MediaStream | null) => void;
  /** A peer left / dropped — drop their audio + tile screen. */
  onPeerLeft: (remoteId: string) => void;
  /** Our own screen share ended (user hit the browser "Stop sharing" bar). */
  onLocalScreenEnded?: () => void;
  onMarker?: (remoteId: string, m: unknown) => void;
}

export class HuddleMesh {
  private peers = new Map<string, MeshPeer>();
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private iceServers: RTCIceServer[] = getIceServers();
  private unsub: (() => void) | null = null;
  private joinTimer: ReturnType<typeof setInterval> | null = null;
  private joinAttempts = 0;
  private closed = false;

  constructor(private opts: HuddleMeshOpts) {}

  async start(): Promise<void> {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.iceServers = await fetchIceServers();
    this.unsub = chatRealtime.subscribeHuddleSignal(this.opts.conversationId, (sig) =>
      void this.onSignal(sig),
    );
    this.announceJoin();
    this.joinTimer = setInterval(() => {
      this.joinAttempts += 1;
      if (this.joinAttempts > 14) { this.stopAnnounce(); return; }
      this.announceJoin();
    }, 1500);
  }

  private announceJoin(to?: string): void {
    chatRealtime.sendHuddleSignal(this.opts.conversationId, { kind: 'join', from: this.opts.selfId, ...(to ? { to } : {}) });
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

  async startScreenShare(): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    this.screenStream = stream;
    const track = stream.getVideoTracks()[0];
    track.onended = () => { void this.stopScreenShare(); };
    await Promise.all([...this.peers.values()].map((p) => p.addScreen(track, stream).catch(() => { /* ignore */ })));
    return stream;
  }

  async stopScreenShare(): Promise<void> {
    const had = !!this.screenStream;
    this.screenStream?.getTracks().forEach((t) => t.stop());
    this.screenStream = null;
    await Promise.all([...this.peers.values()].map((p) => p.removeScreen().catch(() => { /* ignore */ })));
    if (had) this.opts.onLocalScreenEnded?.();
  }

  sendMarker(data: unknown): void {
    this.peers.forEach((p) => p.sendMarker(data));
  }

  close(): void {
    this.closed = true;
    this.stopAnnounce();
    chatRealtime.sendHuddleSignal(this.opts.conversationId, { kind: 'leave', from: this.opts.selfId });
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.screenStream?.getTracks().forEach((t) => t.stop());
    this.screenStream = null;
    this.peers.forEach((p) => p.close());
    this.peers.clear();
    this.unsub?.();
    this.unsub = null;
  }

  // ── signaling ──────────────────────────────────────────────────────────────

  private makePeer(remoteId: string): MeshPeer {
    const peer = new MeshPeer({
      selfId: this.opts.selfId,
      remoteId,
      localStream: this.localStream as MediaStream,
      iceServers: this.iceServers,
      send: (sig) => chatRealtime.sendHuddleSignal(this.opts.conversationId, sig),
      onRemoteStream: this.opts.onRemoteStream,
      onConnectionState: this.opts.onConnectionState,
      onRemoteScreen: this.opts.onRemoteScreen,
      onMarker: (rid, m) => this.opts.onMarker?.(rid, m),
    });
    // If we're already screen-sharing, share to the newcomer too.
    if (this.screenStream) {
      const track = this.screenStream.getVideoTracks()[0];
      if (track) void peer.addScreen(track, this.screenStream).catch(() => { /* ignore */ });
    }
    this.peers.set(remoteId, peer);
    return peer;
  }

  private async onSignal(sig: HuddleSignal): Promise<void> {
    if (this.closed || sig.from === this.opts.selfId) return;

    // Targeted messages (offer/answer/ice) not addressed to us are ignored.
    if ((sig.kind === 'offer' || sig.kind === 'answer' || sig.kind === 'ice-candidate') && sig.to !== this.opts.selfId) {
      return;
    }

    switch (sig.kind) {
      case 'join': {
        // Directed join is a reply meant for a specific newcomer — ignore unless
        // it's for us.
        if (sig.to && sig.to !== this.opts.selfId) break;
        const existing = this.peers.get(sig.from);
        if (existing) {
          // Repeated announce = normal; but if our link to them is dead they
          // dropped and are rejoining with a fresh pc — rebuild + re-offer.
          if (existing.peerDead()) existing.handleRejoin();
          break;
        }
        const peer = this.makePeer(sig.from);
        // Let them learn us (directed reply), then the smaller-id side offers.
        this.announceJoin(sig.from);
        peer.maybeOffer();
        break;
      }
      case 'leave': {
        const peer = this.peers.get(sig.from);
        if (peer) {
          peer.close();
          this.peers.delete(sig.from);
          this.opts.onRemoteScreen(sig.from, null);
          this.opts.onPeerLeft(sig.from);
        }
        break;
      }
      case 'offer': {
        // An offer may arrive before we saw their join (discovery race) — create.
        let peer = this.peers.get(sig.from);
        if (!peer) peer = this.makePeer(sig.from);
        await peer.handleSignal(sig);
        break;
      }
      case 'answer':
      case 'ice-candidate': {
        const peer = this.peers.get(sig.from);
        if (peer) await peer.handleSignal(sig);
        break;
      }
    }
  }
}
