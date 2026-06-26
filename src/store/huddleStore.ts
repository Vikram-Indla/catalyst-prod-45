// src/store/huddleStore.ts
import { create } from 'zustand';
import { HuddleConnection } from '@/lib/chat/huddle/HuddleConnection';
import { supabase } from '@/integrations/supabase/client';
const db = supabase as unknown as { from: (t: string) => any };

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

// Non-React module refs — the live peer + remote audio element must NOT live in
// store state (they are not serializable and must survive re-renders).
let connection: HuddleConnection | null = null;
let remoteAudioEl: HTMLAudioElement | null = null;
let remoteStream: MediaStream | null = null;
let selfIdRef: string | null = null;
let huddleIdRef: string | null = null;

/** Live remote MediaStream — used by HuddleFab to drive the audio-level equalizer.
 *  Kept as a module ref (not store state) since it changes outside React. */
export function getHuddleRemoteStream(): MediaStream | null {
  return remoteStream;
}

function attachRemote(stream: MediaStream) {
  remoteStream = stream;
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
  remoteStream = null;
  if (remoteAudioEl) {
    remoteAudioEl.srcObject = null;
    remoteAudioEl.remove();
    remoteAudioEl = null;
  }
}

async function markLeft(huddleId: string | null, userId: string | null) {
  if (!huddleId || !userId) return;
  try {
    await db.from('chat_huddle_participants')
      .update({ left_at: new Date().toISOString(), is_connected: false })
      .eq('huddle_id', huddleId).eq('user_id', userId);
    // If no live participants remain, end the huddle.
    const { data: live } = await db.from('chat_huddle_participants')
      .select('id').eq('huddle_id', huddleId).is('left_at', null);
    if (!live || (live as unknown[]).length === 0) {
      await db.from('chat_huddles')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', huddleId);
    }
  } catch { /* best-effort */ }
}

export const useHuddleStore = create<HuddleStore>((set, get) => ({
  active: null,

  enter: async ({ conversationId, huddleId, conversationName, selfId }) => {
    // Tear down any existing call first (one huddle at a time).
    if (connection) { connection.close(); connection = null; detachRemote(); }
    connection = new HuddleConnection({
      conversationId,
      selfId,
      onRemoteStream: attachRemote,
      onConnectionState: (s) => get()._setConnectionState(s),
    });
    selfIdRef = selfId;
    huddleIdRef = huddleId;
    set({
      active: { conversationId, huddleId, conversationName, micMuted: false, connectionState: 'new' },
    });
    await connection.start();
  },

  leave: () => {
    connection?.close();
    connection = null;
    detachRemote();
    void markLeft(huddleIdRef, selfIdRef);
    selfIdRef = null;
    huddleIdRef = null;
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

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const a = useHuddleStore.getState().active;
    if (a) {
      // synchronous best-effort: stop tracks + fire the leave signal/DB write
      useHuddleStore.getState().leave();
    }
  });
}
