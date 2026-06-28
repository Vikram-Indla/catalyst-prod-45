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
  /** Am I currently sharing my screen? */
  screenSharing: boolean;
  /** Is the remote peer sharing their screen? */
  remoteSharing: boolean;
}

interface EnterArgs {
  conversationId: string;
  huddleId: string;
  conversationName: string;
  selfId: string;
}

export type ScreenWindowMode = 'normal' | 'minimized' | 'maximized';
export type TicketsWindowMode = 'closed' | 'open' | 'collapsed';

interface HuddleStore {
  active: ActiveHuddle | null;
  /** Screen-share window display mode. */
  screenWindow: ScreenWindowMode;
  /** Common-tickets window display mode. */
  ticketsWindow: TicketsWindowMode;
  /** Whether the tickets window already auto-opened once (5s after connect). */
  ticketsAutoOpened: boolean;
  /** Is MY annotation pen enabled (lets me draw on the shared screen)? */
  markerPen: boolean;
  setMarkerPen: (on: boolean) => void;
  /** Big huddle-window display mode. 'minimized' shows the compact FAB instead. */
  windowState: 'open' | 'minimized' | 'maximized';
  setWindowState: (m: 'open' | 'minimized' | 'maximized') => void;
  /** Is the in-window Thread panel open? */
  chatPanelOpen: boolean;
  toggleChatPanel: () => void;
  enter: (args: EnterArgs) => Promise<void>;
  leave: () => void;
  toggleMute: () => void;
  startScreen: () => Promise<void>;
  stopScreen: () => Promise<void>;
  setScreenWindow: (m: ScreenWindowMode) => void;
  setTicketsWindow: (m: TicketsWindowMode) => void;
  markTicketsAutoOpened: () => void;
  _setConnectionState: (s: RTCPeerConnectionState) => void;
}

// Non-React module refs — the live peer + remote audio element must NOT live in
// store state (they are not serializable and must survive re-renders).
let connection: HuddleConnection | null = null;
let remoteAudioEl: HTMLAudioElement | null = null;
let remoteStream: MediaStream | null = null;
let localScreenStream: MediaStream | null = null;
let remoteScreenStream: MediaStream | null = null;
let selfIdRef: string | null = null;
let huddleIdRef: string | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let huddleStartedAt: number | null = null;

/** Bump my participant row so the huddle reads as live. A dropped client stops
 *  beating → its row goes stale → the UI stops showing a phantom "Rejoin". */
async function beat(huddleId: string | null, userId: string | null) {
  if (!huddleId || !userId) return;
  try {
    await db.from('chat_huddle_participants')
      .update({ is_connected: true })
      .eq('huddle_id', huddleId).eq('user_id', userId).is('left_at', null);
  } catch { /* best-effort */ }
}

/** Live remote MediaStream — used by HuddleFab to drive the audio-level equalizer.
 *  Kept as a module ref (not store state) since it changes outside React. */
export function getHuddleRemoteStream(): MediaStream | null {
  return remoteStream;
}
/** Screen-share streams (module refs — change outside React). */
export function getHuddleLocalScreen(): MediaStream | null { return localScreenStream; }
export function getHuddleRemoteScreen(): MediaStream | null { return remoteScreenStream; }

/** Screen-share markers — sent/received over the WebRTC data channel (P2P). */
const markerListeners = new Set<(m: unknown) => void>();
export function onHuddleMarker(cb: (m: unknown) => void): () => void {
  markerListeners.add(cb);
  return () => { markerListeners.delete(cb); };
}
export function sendHuddleMarker(m: unknown): void { connection?.sendMarker(m); }

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

/** Global on-call flag so a DM list elsewhere can show "X is on a huddle". */
async function setOnCall(userId: string | null, huddleId: string | null) {
  if (!userId) return;
  try {
    await db.from('user_presence').upsert(
      { user_id: userId, active_huddle_id: huddleId, last_seen_at: new Date().toISOString(), state: 'onsite' },
      { onConflict: 'user_id' },
    );
  } catch { /* best-effort */ }
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

/** Post one "A huddle happened" event row into the conversation thread.
 *  Idempotent: the partial unique index on (event_meta->>'huddle_id') rejects a
 *  duplicate from the other peer — we swallow that error. */
async function postHuddleSummary(
  conversationId: string | null, huddleId: string | null,
  authorId: string | null, withName: string, startedAt: number | null,
) {
  if (!conversationId || !huddleId || !authorId) return;
  const durationSeconds = startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : 0;
  try {
    const { error } = await db.from('chat_messages').insert({
      conversation_id: conversationId,
      author_id: authorId,
      body_text: 'A huddle happened',
      event_type: 'huddle_summary',
      event_meta: { huddle_id: huddleId, duration_seconds: durationSeconds, with_name: withName },
    });
    void error; // duplicate summary from the other peer is expected & ignored
  } catch {
    // best-effort — swallow transport-level errors same as markLeft/beat
  }
}

export const useHuddleStore = create<HuddleStore>((set, get) => ({
  active: null,
  screenWindow: 'normal',
  setScreenWindow: (m) => set({ screenWindow: m }),
  ticketsWindow: 'closed',
  ticketsAutoOpened: false,
  setTicketsWindow: (m) => set({ ticketsWindow: m }),
  markTicketsAutoOpened: () => set({ ticketsAutoOpened: true }),
  markerPen: false,
  setMarkerPen: (on) => set({ markerPen: on }),
  windowState: 'open',
  setWindowState: (m) => set({ windowState: m }),
  chatPanelOpen: false,
  toggleChatPanel: () => set((s) => ({ chatPanelOpen: !s.chatPanelOpen })),

  enter: async ({ conversationId, huddleId, conversationName, selfId }) => {
    // Tear down any existing call first (one huddle at a time).
    if (connection) { connection.close(); connection = null; detachRemote(); }
    connection = new HuddleConnection({
      conversationId,
      selfId,
      onRemoteStream: attachRemote,
      onConnectionState: (s) => get()._setConnectionState(s),
      onRemoteScreen: (stream) => {
        remoteScreenStream = stream;
        const a = get().active;
        // When a remote share arrives, pop the window open (normal) so it's seen.
        if (a) set({
          active: { ...a, remoteSharing: !!stream },
          ...(stream ? { screenWindow: 'normal' as ScreenWindowMode } : {}),
          ...(stream && get().windowState === 'minimized' ? { windowState: 'open' as const } : {}),
        });
      },
      onLocalScreenEnded: () => {
        localScreenStream = null;
        const a = get().active;
        if (a) set({ active: { ...a, screenSharing: false } });
      },
      onMarker: (m) => { markerListeners.forEach((l) => l(m)); },
    });
    selfIdRef = selfId;
    huddleIdRef = huddleId;
    huddleStartedAt = Date.now();
    set({
      active: { conversationId, huddleId, conversationName, micMuted: false, connectionState: 'new', screenSharing: false, remoteSharing: false },
      screenWindow: 'normal',
      ticketsWindow: 'closed',
      ticketsAutoOpened: false,
      markerPen: false,
      windowState: 'open',
      chatPanelOpen: false,
    });
    await connection.start();
    void setOnCall(selfId, huddleId);
    // heartbeat: keep my participant row fresh so the huddle reads as live;
    // stopping (drop/leave) lets it go stale and clears the phantom Rejoin.
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    void beat(huddleId, selfId);
    heartbeatTimer = setInterval(() => void beat(huddleId, selfId), 5000);
  },

  leave: () => {
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
    connection?.close();
    connection = null;
    detachRemote();
    localScreenStream = null;
    remoteScreenStream = null;
    const a = get().active;
    void markLeft(huddleIdRef, selfIdRef);
    void setOnCall(selfIdRef, null);
    void postHuddleSummary(a?.conversationId ?? null, huddleIdRef, selfIdRef, a?.conversationName ?? '', huddleStartedAt);
    selfIdRef = null;
    huddleIdRef = null;
    huddleStartedAt = null;
    set({ active: null, screenWindow: 'normal', windowState: 'open', chatPanelOpen: false, ticketsWindow: 'closed', ticketsAutoOpened: false, markerPen: false });
  },

  toggleMute: () => {
    const a = get().active;
    if (!a) return;
    const next = !a.micMuted;
    connection?.setMicMuted(next);
    set({ active: { ...a, micMuted: next } });
  },

  startScreen: async () => {
    if (!connection) return;
    try {
      localScreenStream = await connection.startScreenShare();
      const a = get().active;
      if (a) set({ active: { ...a, screenSharing: true }, screenWindow: 'normal' });
    } catch { /* user cancelled the screen picker — no-op */ }
  },

  stopScreen: async () => {
    await connection?.stopScreenShare();
    localScreenStream = null;
    const a = get().active;
    if (a) set({ active: { ...a, screenSharing: false } });
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
