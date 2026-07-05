// src/store/huddleStore.ts
import { create } from 'zustand';
import { HuddleMesh } from '@/lib/chat/huddle/HuddleMesh';
import { supabase } from '@/integrations/supabase/client';
const db = supabase as unknown as { from: (t: string) => any };

export interface ActiveHuddle {
  conversationId: string;
  huddleId: string;
  conversationName: string;
  /** chat_messages.id of the "Huddle is happening" event row. In-huddle messages
   *  thread under it as replies. Null until the row is created. */
  huddleEventId: string | null;
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

// Non-React module refs — the live mesh + remote audio elements must NOT live in
// store state (they are not serializable and must survive re-renders).
let mesh: HuddleMesh | null = null;
// Per-remote audio: one <audio> element + MediaStream per participant id.
const remoteAudioEls = new Map<string, HTMLAudioElement>();
const remoteStreams = new Map<string, MediaStream>();
// Per-remote connection state, used to aggregate an overall call state.
const remoteStates = new Map<string, RTCPeerConnectionState>();
// Which remote ids are currently sharing their screen.
const remoteSharingIds = new Set<string>();
let localScreenStream: MediaStream | null = null;
let remoteScreenStream: MediaStream | null = null;
let selfIdRef: string | null = null;
let huddleIdRef: string | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let huddleStartedAt: number | null = null;
let huddleEventIdRef: string | null = null;

/** chat_messages.id of the live huddle event row — read by HuddleWindow so it can
 *  thread in-huddle messages as replies. Module ref (changes outside React). */
export function getHuddleEventId(): string | null {
  return huddleEventIdRef;
}

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
 *  With a mesh there can be several; return the first (any) live remote. */
export function getHuddleRemoteStream(): MediaStream | null {
  const first = remoteStreams.values().next();
  return first.done ? null : first.value;
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
export function sendHuddleMarker(m: unknown): void { mesh?.sendMarker(m); }

/** Attach one remote's audio: create a dedicated <audio> element per peer id. */
function attachRemote(remoteId: string, stream: MediaStream) {
  remoteStreams.set(remoteId, stream);
  if (typeof document === 'undefined') return;
  let el = remoteAudioEls.get(remoteId);
  if (!el) {
    el = document.createElement('audio');
    el.autoplay = true;
    el.setAttribute('data-huddle-remote-audio', remoteId);
    document.body.appendChild(el);
    remoteAudioEls.set(remoteId, el);
  }
  el.srcObject = stream;
}

/** Detach ONE remote (they left/dropped). */
function detachRemote(remoteId: string) {
  remoteStreams.delete(remoteId);
  const el = remoteAudioEls.get(remoteId);
  if (el) { el.srcObject = null; el.remove(); remoteAudioEls.delete(remoteId); }
}

/** Detach ALL remotes (leaving the call). */
function detachAllRemotes() {
  remoteStreams.clear();
  remoteStates.clear();
  remoteSharingIds.clear();
  remoteAudioEls.forEach((el) => { el.srcObject = null; el.remove(); });
  remoteAudioEls.clear();
}

/** Aggregate the mesh into one call-level connection state for the UI. */
function aggregateState(): RTCPeerConnectionState {
  const states = [...remoteStates.values()];
  if (states.length === 0) return 'connecting';
  if (states.some((s) => s === 'connected' || s === 'completed')) return 'connected';
  if (states.some((s) => s === 'connecting' || s === 'new')) return 'connecting';
  if (states.some((s) => s === 'disconnected')) return 'disconnected';
  return states[0];
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

/** Post the live "Huddle is happening" event row at call start and return its id.
 *  In-huddle messages thread under this row as replies; on leave the same row is
 *  flipped to "A huddle happened". Idempotent: the partial unique index on
 *  (event_meta->>'huddle_id') rejects the second peer's insert — we then fetch the
 *  row the first peer created so both share one event id. */
async function postHuddleLive(
  conversationId: string | null, huddleId: string | null,
  authorId: string | null, withName: string,
): Promise<string | null> {
  if (!conversationId || !huddleId || !authorId) return null;
  try {
    const { data, error } = await db.from('chat_messages').insert({
      conversation_id: conversationId,
      author_id: authorId,
      body_text: 'Huddle is happening',
      event_type: 'huddle_live',
      event_meta: { huddle_id: huddleId, with_name: withName },
    }).select('id').single();
    if (!error && data?.id) return data.id as string;
    // Duplicate (other peer created it) or transient error: fetch the shared row.
    const { data: existing } = await db.from('chat_messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .in('event_type', ['huddle_live', 'huddle_summary'])
      .filter('event_meta->>huddle_id', 'eq', huddleId)
      .maybeSingle();
    return (existing?.id as string) ?? null;
  } catch {
    return null;
  }
}

/** Flip the live huddle event row to a "A huddle happened" summary with duration.
 *  Both peers run this on leave; updating by huddle_id is idempotent. */
async function finalizeHuddleSummary(
  conversationId: string | null, huddleId: string | null,
  withName: string, startedAt: number | null,
) {
  if (!conversationId || !huddleId) return;
  const durationSeconds = startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : 0;
  try {
    // Snapshot who actually joined + who started, so the event row can render
    // PER-VIEWER: participants see "You (and X) were in the huddle", non-joiners
    // see "You missed a huddle — {caller} was in the huddle for …".
    const [{ data: hud }, { data: parts }] = await Promise.all([
      db.from('chat_huddles').select('started_by').eq('id', huddleId).maybeSingle(),
      db.from('chat_huddle_participants').select('user_id').eq('huddle_id', huddleId),
    ]);
    const startedBy = (hud as { started_by: string } | null)?.started_by ?? null;
    const partIds = [...new Set(((parts ?? []) as { user_id: string }[]).map((p) => p.user_id))];
    let participants: { id: string; name: string }[] = [];
    let callerName = withName;
    if (partIds.length) {
      const { data: profs } = await db.from('profiles').select('id, full_name').in('id', partIds);
      const nameMap = Object.fromEntries(((profs ?? []) as { id: string; full_name: string | null }[])
        .map((p) => [p.id, p.full_name || 'Someone']));
      participants = partIds.map((id) => ({ id, name: nameMap[id] || 'Someone' }));
      if (startedBy && nameMap[startedBy]) callerName = nameMap[startedBy];
    }
    await db.from('chat_messages')
      .update({
        body_text: 'A huddle happened',
        event_type: 'huddle_summary',
        event_meta: {
          huddle_id: huddleId,
          duration_seconds: durationSeconds,
          with_name: withName,
          started_by: startedBy,
          caller_name: callerName,
          participants,
        },
      })
      .eq('conversation_id', conversationId)
      .eq('event_type', 'huddle_live')
      .filter('event_meta->>huddle_id', 'eq', huddleId);
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
    if (mesh) { mesh.close(); mesh = null; detachAllRemotes(); }
    mesh = new HuddleMesh({
      conversationId,
      selfId,
      onRemoteStream: (remoteId, stream) => attachRemote(remoteId, stream),
      onConnectionState: (remoteId, s) => {
        remoteStates.set(remoteId, s);
        get()._setConnectionState(aggregateState());
      },
      onPeerLeft: (remoteId) => {
        detachRemote(remoteId);
        remoteStates.delete(remoteId);
        remoteSharingIds.delete(remoteId);
        if (remoteSharingIds.size === 0) remoteScreenStream = null;
        const a = get().active;
        if (a) set({ active: { ...a, remoteSharing: remoteSharingIds.size > 0, connectionState: aggregateState() } });
      },
      onRemoteScreen: (remoteId, stream) => {
        if (stream) { remoteSharingIds.add(remoteId); remoteScreenStream = stream; }
        else { remoteSharingIds.delete(remoteId); if (remoteSharingIds.size === 0) remoteScreenStream = null; }
        const anySharing = remoteSharingIds.size > 0;
        const a = get().active;
        // When a remote share arrives, pop the window open (normal) so it's seen.
        if (a) set({
          active: { ...a, remoteSharing: anySharing },
          ...(stream ? { screenWindow: 'normal' as ScreenWindowMode } : {}),
          ...(stream && get().windowState === 'minimized' ? { windowState: 'open' as const } : {}),
        });
      },
      onLocalScreenEnded: () => {
        localScreenStream = null;
        const a = get().active;
        if (a) set({ active: { ...a, screenSharing: false } });
      },
      onMarker: (_remoteId, m) => { markerListeners.forEach((l) => l(m)); },
    });
    selfIdRef = selfId;
    huddleIdRef = huddleId;
    huddleStartedAt = Date.now();
    huddleEventIdRef = null;
    set({
      active: { conversationId, huddleId, conversationName, huddleEventId: null, micMuted: false, connectionState: 'new', screenSharing: false, remoteSharing: false },
      screenWindow: 'normal',
      ticketsWindow: 'closed',
      ticketsAutoOpened: false,
      markerPen: false,
      windowState: 'open',
      chatPanelOpen: false,
    });
    // Log "Huddle is happening" the moment the call starts so both sides see it
    // (independent of WebRTC negotiation, which can take a few seconds).
    void postHuddleLive(conversationId, huddleId, selfId, conversationName).then((eid) => {
      huddleEventIdRef = eid;
      const a = get().active;
      if (a && a.huddleId === huddleId) set({ active: { ...a, huddleEventId: eid } });
    });
    await mesh.start();
    void setOnCall(selfId, huddleId);
    // heartbeat: keep my participant row fresh so the huddle reads as live;
    // stopping (drop/leave) lets it go stale and clears the phantom Rejoin.
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    void beat(huddleId, selfId);
    heartbeatTimer = setInterval(() => void beat(huddleId, selfId), 5000);
  },

  leave: () => {
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
    mesh?.close();
    mesh = null;
    detachAllRemotes();
    localScreenStream = null;
    remoteScreenStream = null;
    const a = get().active;
    void markLeft(huddleIdRef, selfIdRef);
    void setOnCall(selfIdRef, null);
    void finalizeHuddleSummary(a?.conversationId ?? null, huddleIdRef, a?.conversationName ?? '', huddleStartedAt);
    selfIdRef = null;
    huddleIdRef = null;
    huddleStartedAt = null;
    huddleEventIdRef = null;
    set({ active: null, screenWindow: 'normal', windowState: 'open', chatPanelOpen: false, ticketsWindow: 'closed', ticketsAutoOpened: false, markerPen: false });
  },

  toggleMute: () => {
    const a = get().active;
    if (!a) return;
    const next = !a.micMuted;
    mesh?.setMicMuted(next);
    set({ active: { ...a, micMuted: next } });
  },

  startScreen: async () => {
    if (!mesh) return;
    try {
      localScreenStream = await mesh.startScreenShare();
      const a = get().active;
      if (a) set({ active: { ...a, screenSharing: true }, screenWindow: 'normal' });
    } catch { /* user cancelled the screen picker — no-op */ }
  },

  stopScreen: async () => {
    await mesh?.stopScreenShare();
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
