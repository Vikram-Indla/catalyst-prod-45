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

interface HuddleRow { id: string; conversation_id: string; started_by: string }
interface PartRow { huddle_id: string }

export interface IncomingHuddle {
  huddleId: string;
  conversationId: string;
  conversationName: string;
  callerName: string;
}

export function useIncomingHuddle(): {
  incoming: IncomingHuddle | null;
  accept: () => void;
  decline: () => void;
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
      const candidate = rows.find(
        (h) => h.started_by !== userId && !inIds.has(h.id) && !declined.has(h.id) && liveHuddleIds.has(h.id),
      );
      if (!candidate) return null;
      const [{ data: caller }, { data: conv }] = await Promise.all([
        db.from('profiles').select('full_name').eq('id', candidate.started_by).maybeSingle(),
        db.from('chat_conversations').select('title').eq('id', candidate.conversation_id).maybeSingle(),
      ]);
      const callerName = (caller as { full_name: string | null } | null)?.full_name || 'Someone';
      const convName = (conv as { title: string | null } | null)?.title || callerName;
      return {
        huddleId: candidate.id,
        conversationId: candidate.conversation_id,
        conversationName: convName,
        callerName,
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
    return () => { supabase.removeChannel(ch); };
  }, [userId, qc, instanceId]);

  const incoming = !activeInCall && data ? data : null;

  const decline = useCallback(() => {
    if (data) { declined.add(data.huddleId); persistDeclined(); }
    qc.invalidateQueries({ queryKey: ['chat', 'huddle', 'incoming', userId] });
  }, [data, qc, userId]);

  const accept = useCallback(() => {
    if (!data) return;
    const conv = { id: data.conversationId, title: data.conversationName } as ChatConversation;
    void startOrJoin(conv);
  }, [data, startOrJoin]);

  return { incoming, accept, decline };
}
