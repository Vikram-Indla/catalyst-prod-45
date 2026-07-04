// src/hooks/chat/useMissedCalls.ts
/**
 * useMissedCalls — huddles that rang the current user and ENDED without them
 * joining (a "missed call", phone-style). Derived from chat_huddles (RLS scopes
 * them to my conversations) minus the ones I was a participant of. Dismissed
 * ids are kept in localStorage so the list can be cleared per browser.
 */
import { useCallback, useEffect, useId, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const db = supabase as unknown as { from: (t: string) => any };

const DISMISSED_KEY = 'huddle-missed-dismissed';
const dismissed: Set<string> = (() => {
  try { return new Set<string>(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]')); }
  catch { return new Set<string>(); }
})();
function persistDismissed() {
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed].slice(-200))); } catch { /* ignore */ }
}

export interface MissedCall {
  huddleId: string;
  conversationId: string;
  callerName: string;
  callerAvatarUrl: string | null;
  endedAt: string | null;
}

interface EndedRow { id: string; conversation_id: string; started_by: string; ended_at: string | null }
interface PartRow { huddle_id: string }

export function useMissedCalls(): { missed: MissedCall[]; dismiss: (id: string) => void; dismissAll: () => void } {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();
  const instanceId = useId();
  const [, force] = useState(0);

  const { data } = useQuery<MissedCall[]>({
    queryKey: ['chat', 'huddle', 'missed', userId],
    enabled: !!userId,
    refetchInterval: 30_000,
    queryFn: async () => {
      if (!userId) return [];
      const { data: ended } = await db.from('chat_huddles')
        .select('id, conversation_id, started_by, ended_at')
        .eq('status', 'ended')
        .order('ended_at', { ascending: false })
        .limit(40);
      const rows = ((ended ?? []) as EndedRow[]).filter((h) => h.started_by !== userId);
      if (!rows.length) return [];
      // Exclude huddles I actually joined (a participant row of mine exists).
      const { data: mine } = await db.from('chat_huddle_participants')
        .select('huddle_id').eq('user_id', userId)
        .in('huddle_id', rows.map((h) => h.id));
      const joined = new Set(((mine ?? []) as PartRow[]).map((p) => p.huddle_id));
      const candidates = rows.filter((h) => !joined.has(h.id) && !dismissed.has(h.id)).slice(0, 15);
      if (!candidates.length) return [];
      const callerIds = [...new Set(candidates.map((h) => h.started_by))];
      const { data: profs } = await db.from('profiles').select('id, full_name, avatar_url').in('id', callerIds);
      const nameMap: Record<string, { name: string; avatar: string | null }> = {};
      ((profs ?? []) as { id: string; full_name: string | null; avatar_url: string | null }[])
        .forEach((p) => { nameMap[p.id] = { name: p.full_name || 'Someone', avatar: p.avatar_url ?? null }; });
      return candidates.map((h) => ({
        huddleId: h.id,
        conversationId: h.conversation_id,
        callerName: nameMap[h.started_by]?.name || 'Someone',
        callerAvatarUrl: nameMap[h.started_by]?.avatar ?? null,
        endedAt: h.ended_at,
      }));
    },
  });

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`huddle-missed:${instanceId}`)
      .on('postgres_changes' as 'system', { event: '*', schema: 'public', table: 'chat_huddles' } as never,
        () => qc.invalidateQueries({ queryKey: ['chat', 'huddle', 'missed', userId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, qc, instanceId]);

  const dismiss = useCallback((id: string) => {
    dismissed.add(id); persistDismissed();
    qc.invalidateQueries({ queryKey: ['chat', 'huddle', 'missed', userId] });
    force((n) => n + 1);
  }, [qc, userId]);

  const dismissAll = useCallback(() => {
    (data ?? []).forEach((m) => dismissed.add(m.huddleId));
    persistDismissed();
    qc.invalidateQueries({ queryKey: ['chat', 'huddle', 'missed', userId] });
    force((n) => n + 1);
  }, [data, qc, userId]);

  return { missed: data ?? [], dismiss, dismissAll };
}
