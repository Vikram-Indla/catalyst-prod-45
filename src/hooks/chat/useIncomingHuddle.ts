// src/hooks/chat/useIncomingHuddle.ts
/**
 * Detects an INCOMING huddle for the current user — a huddle that is active in
 * one of their conversations, that they did NOT start and are NOT already in.
 * Drives the ringing popup. Realtime-refreshed via chat_huddles changes.
 *
 * RLS already scopes chat_huddles to the caller's conversations, so a plain
 * status='active' select only returns relevant huddles.
 */
import { useCallback, useEffect, useId } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHuddleStore } from '@/store/huddleStore';
import { useHuddleActions, liveCutoff } from '@/hooks/chat/useHuddleData';
import type { ChatConversation } from '@/types/chat';

const db = supabase as unknown as { from: (t: string) => any };

// Declined huddles — module-level + localStorage so a decline survives
// re-renders, remounts AND page refresh (Slack-like: once declined, never
// re-rings for that same huddle). A NEW huddle (new id) rings again.
const DECLINED_KEY = 'huddle-declined-ids';
const declined: Set<string> = (() => {
  try { return new Set<string>(JSON.parse(localStorage.getItem(DECLINED_KEY) || '[]')); }
  catch { return new Set<string>(); }
})();
function persistDeclined() {
  try { localStorage.setItem(DECLINED_KEY, JSON.stringify([...declined].slice(-200))); } catch { /* ignore */ }
}

// Snoozed huddles — { huddleId: expiryMs }. A snooze mutes the ring for 1 hour;
// after expiry the same huddle (if still active) rings again. Survives refresh.
const SNOOZE_KEY = 'huddle-snoozed';
const SNOOZE_MS = 60 * 60 * 1000; // 1 hour
const snoozed: Map<string, number> = (() => {
  try { return new Map<string, number>(Object.entries(JSON.parse(localStorage.getItem(SNOOZE_KEY) || '{}'))); }
  catch { return new Map<string, number>(); }
})();
function persistSnoozed() {
  try { localStorage.setItem(SNOOZE_KEY, JSON.stringify(Object.fromEntries(snoozed))); } catch { /* ignore */ }
}
function isSnoozed(id: string): boolean {
  const until = snoozed.get(id);
  if (until == null) return false;
  if (Date.now() >= until) { snoozed.delete(id); persistSnoozed(); return false; }
  return true;
}

// Answered-elsewhere — when the SAME user answers on ANOTHER tab, that tab
// broadcasts the huddle id so this tab's ring stops INSTANTLY, without waiting
// on Supabase realtime to deliver the participant-INSERT. Same origin + same
// account => BroadcastChannel is the reliable, low-latency cross-tab signal.
const ACCEPT_CHANNEL = 'huddle-accept';
const answeredElsewhere: Set<string> = new Set();
const acceptBus: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(ACCEPT_CHANNEL) : null;

// Cross-tab snooze — a snooze on one tab silences the others instantly (same
// browser). Cross-BROWSER/device silence rides on the huddle_snoozes DB table
// (read in the poll below), so both are covered.
const SNOOZE_CHANNEL = 'huddle-snooze';
const snoozeBus: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(SNOOZE_CHANNEL) : null;

interface HuddleRow { id: string; conversation_id: string; started_by: string }
interface PartRow { huddle_id: string }

export interface IncomingHuddle {
  huddleId: string;
  conversationId: string;
  conversationName: string;
  callerName: string;
  callerAvatarUrl: string | null;
  /** true when the user snoozed this (still-live) huddle — muted, not ringing. */
  snoozed: boolean;
}

export function useIncomingHuddle(): {
  /** a live huddle ringing right now (not snoozed) */
  incoming: IncomingHuddle | null;
  /** a live huddle the user snoozed — surfaced so they can still answer it */
  snoozedCall: IncomingHuddle | null;
  accept: () => void;
  decline: () => void;
  snooze: () => void;
  unsnooze: () => void;
} {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();
  const instanceId = useId();
  const activeInCall = useHuddleStore((s) => s.active?.huddleId ?? null);
  const { startOrJoin } = useHuddleActions();

  const { data } = useQuery<IncomingHuddle | null>({
    queryKey: ['chat', 'huddle', 'incoming', userId],
    enabled: !!userId,
    // Poll so a stale (all-dropped) huddle stops ringing even without a DB event.
    refetchInterval: 10_000,
    queryFn: async () => {
      if (!userId) return null;
      const { data: huds } = await db.from('chat_huddles')
        .select('id, conversation_id, started_by').eq('status', 'active');
      const rows = (huds ?? []) as HuddleRow[];
      if (!rows.length) return null;
      // huddles I've EVER joined (live or already left) — exclude so a call I'm
      // in, or one I already left, never re-rings me (Slack behaviour).
      const { data: mine } = await db.from('chat_huddle_participants')
        .select('huddle_id').eq('user_id', userId);
      const inIds = new Set(((mine ?? []) as PartRow[]).map((p) => p.huddle_id));
      // Only ring for huddles that still have a LIVE caller (fresh heartbeat).
      // A huddle whose participants all dropped is stale — don't ring for it.
      const { data: fresh } = await db.from('chat_huddle_participants')
        .select('huddle_id')
        .in('huddle_id', rows.map((h) => h.id))
        .is('left_at', null)
        .gt('last_seen_at', liveCutoff());
      const liveHuddleIds = new Set(((fresh ?? []) as PartRow[]).map((p) => p.huddle_id));
      // A snoozed huddle is NOT excluded here — we still surface it (as snoozed)
      // so the user can answer it; the `snoozed` flag drives the muted UI.
      const candidate = rows.find(
        (h) => h.started_by !== userId && !inIds.has(h.id) && !declined.has(h.id)
          && !answeredElsewhere.has(h.id) && liveHuddleIds.has(h.id),
      );
      if (!candidate) return null;
      const [{ data: caller }, { data: conv }] = await Promise.all([
        db.from('profiles').select('full_name, avatar_url').eq('id', candidate.started_by).maybeSingle(),
        db.from('chat_conversations').select('title').eq('id', candidate.conversation_id).maybeSingle(),
      ]);
      const callerName = (caller as { full_name: string | null } | null)?.full_name || 'Someone';
      const callerAvatarUrl = (caller as { avatar_url: string | null } | null)?.avatar_url ?? null;
      const convName = (conv as { title: string | null } | null)?.title || callerName;
      // Snoozed if EITHER the local cache OR the DB row (any device) is unexpired.
      // Isolated + guarded so a snooze-read failure can NEVER suppress the ring.
      let dbSnoozed = false;
      try {
        const { data: snz } = await db.from('huddle_snoozes')
          .select('until_at').eq('user_id', userId).eq('huddle_id', candidate.id).maybeSingle();
        const dbUntil = (snz as { until_at: string } | null)?.until_at;
        dbSnoozed = !!dbUntil && new Date(dbUntil).getTime() > Date.now();
      } catch { /* ignore — treat as not snoozed */ }
      return {
        huddleId: candidate.id,
        conversationId: candidate.conversation_id,
        conversationName: convName,
        callerName,
        callerAvatarUrl,
        snoozed: isSnoozed(candidate.id) || dbSnoozed,
      };
    },
  });

  // realtime: any huddle/participant change re-evaluates the incoming state
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`huddle-incoming:${instanceId}`)
      .on('postgres_changes' as 'system', { event: '*', schema: 'public', table: 'chat_huddles' } as never,
        () => qc.invalidateQueries({ queryKey: ['chat', 'huddle', 'incoming', userId] }))
      .on('postgres_changes' as 'system', { event: '*', schema: 'public', table: 'chat_huddle_participants' } as never,
        () => qc.invalidateQueries({ queryKey: ['chat', 'huddle', 'incoming', userId] }))
      .subscribe();
    // Snooze realtime lives on its OWN channel so a failure here can never break
    // the critical huddle ring channel above. A snooze on another device lands
    // here → re-evaluate + go silent.
    const snoozeCh = supabase
      .channel(`huddle-snooze-rt:${instanceId}`)
      .on('postgres_changes' as 'system', { event: '*', schema: 'public', table: 'huddle_snoozes', filter: `user_id=eq.${userId}` } as never,
        () => qc.invalidateQueries({ queryKey: ['chat', 'huddle', 'incoming', userId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); supabase.removeChannel(snoozeCh); };
  }, [userId, qc, instanceId]);

  // cross-tab: another tab of the same account answered — stop ringing here now.
  useEffect(() => {
    if (!acceptBus) return;
    const onMsg = (e: MessageEvent) => {
      const id = (e.data as { huddleId?: string } | null)?.huddleId;
      if (!id) return;
      answeredElsewhere.add(id);
      qc.invalidateQueries({ queryKey: ['chat', 'huddle', 'incoming', userId] });
    };
    acceptBus.addEventListener('message', onMsg);
    return () => acceptBus.removeEventListener('message', onMsg);
  }, [qc, userId]);

  // cross-tab: another tab snoozed — silence here instantly (before the DB poll).
  useEffect(() => {
    if (!snoozeBus) return;
    const onMsg = (e: MessageEvent) => {
      const id = (e.data as { huddleId?: string } | null)?.huddleId;
      if (!id) return;
      snoozed.set(id, Date.now() + SNOOZE_MS);
      persistSnoozed();
      qc.invalidateQueries({ queryKey: ['chat', 'huddle', 'incoming', userId] });
    };
    snoozeBus.addEventListener('message', onMsg);
    return () => snoozeBus.removeEventListener('message', onMsg);
  }, [qc, userId]);

  const base = !activeInCall && data ? data : null;
  const incoming = base && !base.snoozed ? base : null;
  const snoozedCall = base && base.snoozed ? base : null;

  const decline = useCallback(() => {
    // A decline is just a "miss" — the per-viewer huddle_summary event row shows
    // "You missed a huddle" for the decliner, so no separate message is posted.
    if (data) { declined.add(data.huddleId); snoozed.delete(data.huddleId); persistDeclined(); persistSnoozed(); }
    qc.invalidateQueries({ queryKey: ['chat', 'huddle', 'incoming', userId] });
  }, [data, qc, userId]);

  const snooze = useCallback(() => {
    if (data) {
      snoozed.set(data.huddleId, Date.now() + SNOOZE_MS); persistSnoozed();
      snoozeBus?.postMessage({ huddleId: data.huddleId }); // instant cross-tab
      // cross-browser/device: persist so every other session silences too.
      void db.from('huddle_snoozes').upsert(
        { user_id: userId, huddle_id: data.huddleId, until_at: new Date(Date.now() + SNOOZE_MS).toISOString() },
        { onConflict: 'user_id,huddle_id' },
      );
    }
    qc.invalidateQueries({ queryKey: ['chat', 'huddle', 'incoming', userId] });
  }, [data, qc, userId]);

  const unsnooze = useCallback(() => {
    if (data) {
      snoozed.delete(data.huddleId); persistSnoozed();
      void db.from('huddle_snoozes').delete().eq('user_id', userId).eq('huddle_id', data.huddleId);
    }
    qc.invalidateQueries({ queryKey: ['chat', 'huddle', 'incoming', userId] });
  }, [data, qc, userId]);

  const accept = useCallback(() => {
    if (!data) return;
    if (snoozed.has(data.huddleId)) { snoozed.delete(data.huddleId); persistSnoozed(); }
    // Tell my other tabs to stop ringing immediately (before realtime catches up).
    answeredElsewhere.add(data.huddleId);
    acceptBus?.postMessage({ huddleId: data.huddleId });
    const conv = { id: data.conversationId, title: data.conversationName } as ChatConversation;
    void startOrJoin(conv);
  }, [data, startOrJoin]);

  return { incoming, snoozedCall, accept, decline, snooze, unsnooze };
}
