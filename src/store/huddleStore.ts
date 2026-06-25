// src/store/huddleStore.ts
import { create } from 'zustand';
import { HuddleConnection } from '@/lib/chat/huddle/HuddleConnection';

export interface ActiveHuddle {
  conversationId: string;
  huddleId: string;
  conversationName: string;
  micMuted: boolean;
  connectionState: RTCPeerConnectionState;
}

interface EnterArgs {
  conversationId: string;
  huddleId: string;
  conversationName: string;
  selfId: string;
}

interface HuddleStore {
  active: ActiveHuddle | null;
  enter: (args: EnterArgs) => Promise<void>;
  leave: () => void;
  toggleMute: () => void;
  _setConnectionState: (s: RTCPeerConnectionState) => void;
}

type HuddleOpts = ConstructorParameters<typeof HuddleConnection>[0];
type HuddleFactory = (opts: HuddleOpts) => HuddleConnection;

// Call via a factory alias so vi.fn().mockImplementation(() => ({...})) works in tests
// (vitest 4 arrow-function mocks are not constructable, but ARE callable as plain functions).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeConnection: HuddleFactory = (HuddleConnection as any);

// Non-React module refs — the live peer + remote audio element must NOT live in
// store state (they are not serializable and must survive re-renders).
let connection: HuddleConnection | null = null;
let remoteAudioEl: HTMLAudioElement | null = null;

function attachRemote(stream: MediaStream) {
  if (typeof document === 'undefined') return;
  if (!remoteAudioEl) {
    remoteAudioEl = document.createElement('audio');
    remoteAudioEl.autoplay = true;
    remoteAudioEl.setAttribute('data-huddle-remote-audio', 'true');
    document.body.appendChild(remoteAudioEl);
  }
  remoteAudioEl.srcObject = stream;
}

function detachRemote() {
  if (remoteAudioEl) {
    remoteAudioEl.srcObject = null;
    remoteAudioEl.remove();
    remoteAudioEl = null;
  }
}

export const useHuddleStore = create<HuddleStore>((set, get) => ({
  active: null,

  enter: async ({ conversationId, huddleId, conversationName, selfId }) => {
    // Tear down any existing call first (one huddle at a time).
    if (connection) { connection.close(); connection = null; detachRemote(); }
    connection = makeConnection({
      conversationId,
      selfId,
      onRemoteStream: attachRemote,
      onConnectionState: (s) => get()._setConnectionState(s),
    });
    set({
      active: { conversationId, huddleId, conversationName, micMuted: false, connectionState: 'new' },
    });
    await connection.start();
  },

  leave: () => {
    connection?.close();
    connection = null;
    detachRemote();
    set({ active: null });
  },

  toggleMute: () => {
    const a = get().active;
    if (!a) return;
    const next = !a.micMuted;
    connection?.setMicMuted(next);
    set({ active: { ...a, micMuted: next } });
  },

  _setConnectionState: (s) => {
    const a = get().active;
    if (!a) return;
    set({ active: { ...a, connectionState: s } });
  },
}));

// When the store's active field is externally reset to null (e.g. test beforeEach
// calling setState({ active: null })), also clear the module-level connection ref
// so the next enter() doesn't see a stale connection and call close() prematurely.
useHuddleStore.subscribe((state, prev) => {
  if (prev.active !== null && state.active === null) {
    connection = null;
    detachRemote();
  }
});
