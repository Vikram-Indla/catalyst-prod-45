// src/hooks/chat/useHuddleData.ts
/**
 * Huddle data hooks. chat_huddles / chat_huddle_participants are not in the
 * generated types — use the same `db` cast as useConversations.
 */
import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHuddleStore } from '@/store/huddleStore';
import type { ChatConversation } from '@/types/chat';

const db = supabase as unknown as { from: (t: string) => any };
const HUDDLE_CAP = 2;

interface HuddleRow { id: string; conversation_id: string; status: string }
interface ParticipantRow { huddle_id: string; user_id: string; left_at: string | null }

async function fetchActiveHuddles(): Promise<HuddleRow[]> {
  try {
    const { data, error } = await db.from('chat_huddles').select('id, conversation_id, status').eq('status', 'active');
    if (error || !data) return [];
    return data as HuddleRow[];
  } catch { return []; }
}

/** Conversation ids that currently have an active huddle. Realtime-refreshed. */
export function useActiveHuddleIds(): Set<string> {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['chat', 'huddles', 'active'],
    queryFn: fetchActiveHuddles,
    staleTime: 10 * 1000,
  });
  useEffect(() => {
    const channel = supabase
      .channel('huddles-active-global')
      .on('postgres_changes' as 'system', { event: '*', schema: 'public', table: 'chat_huddles' } as never,
        () => qc.invalidateQueries({ queryKey: ['chat', 'huddles', 'active'] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
  return new Set((data ?? []).map((h) => h.conversation_id));
}

/** The active huddle (if any) for one conversation, with participants + full flag. */
export function useActiveHuddle(conversationId: string | null) {
  const qc = useQueryClient();
  const key = ['chat', 'huddle', conversationId];
  const { data, refetch } = useQuery({
    queryKey: key,
    enabled: !!conversationId,
    queryFn: async () => {
      if (!conversationId) return null;
      const { data: hud } = await db.from('chat_huddles')
        .select('id').eq('conversation_id', conversationId).eq('status', 'active').maybeSingle();
      if (!hud) return null;
      const { data: parts } = await db.from('chat_huddle_participants')
        .select('huddle_id, user_id, left_at').eq('huddle_id', (hud as HuddleRow).id).is('left_at', null);
      const participants = ((parts ?? []) as ParticipantRow[]).map((p) => ({ userId: p.user_id }));
      return { id: (hud as HuddleRow).id, participants, isFull: participants.length >= HUDDLE_CAP };
    },
  });
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`huddle:${conversationId}`)
      .on('postgres_changes' as 'system', { event: '*', schema: 'public', table: 'chat_huddles', filter: `conversation_id=eq.${conversationId}` } as never,
        () => qc.invalidateQueries({ queryKey: key }))
      .on('postgres_changes' as 'system', { event: '*', schema: 'public', table: 'chat_huddle_participants' } as never,
        () => qc.invalidateQueries({ queryKey: key }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);
  return { huddle: data ?? null, refetch };
}

/** Start a new huddle (or join the existing one), enforcing cap-2, then connect. */
export function useHuddleActions() {
  const { user } = useAuth();
  const enter = useHuddleStore((s) => s.enter);

  const startOrJoin = useCallback(async (conversation: ChatConversation) => {
    if (!user) return;
    const conversationId = conversation.id;
    // Find or create the active huddle row.
    let huddleId: string | null = null;
    const { data: existing } = await db.from('chat_huddles')
      .select('id').eq('conversation_id', conversationId).eq('status', 'active').maybeSingle();
    if (existing) {
      huddleId = (existing as HuddleRow).id;
      // cap-2 check on live participants
      const { data: parts } = await db.from('chat_huddle_participants')
        .select('user_id, left_at').eq('huddle_id', huddleId).is('left_at', null);
      const live = (parts ?? []) as ParticipantRow[];
      const alreadyIn = live.some((p) => p.user_id === user.id);
      if (!alreadyIn && live.length >= HUDDLE_CAP) {
        throw new Error('HUDDLE_FULL');
      }
    } else {
      const { data: created, error } = await db.from('chat_huddles')
        .insert({ conversation_id: conversationId, started_by: user.id })
        .select('id').single();
      if (error || !created) throw new Error('HUDDLE_START_FAILED');
      huddleId = (created as HuddleRow).id;
    }
    // Upsert my participant row (left_at = null = live).
    await db.from('chat_huddle_participants')
      .insert({ huddle_id: huddleId, user_id: user.id });
    await enter({
      conversationId,
      huddleId: huddleId as string,
      conversationName: conversation.title,
      selfId: user.id,
    });
  }, [user, enter]);

  return { startOrJoin };
}
