// src/hooks/chat/useHuddleData.ts
/**
 * Huddle data hooks. chat_huddles / chat_huddle_participants are not in the
 * generated types — use the same `db` cast as useConversations.
 */
import { useEffect, useCallback, useId } from 'react';
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
  // Unique per mount — this hook runs in BOTH the sidebar and every message
  // panel; a shared channel name makes Supabase throw "cannot add
  // postgres_changes callbacks ... already subscribed" on the second mount.
  const instanceId = useId();
  const { data } = useQuery({
    queryKey: ['chat', 'huddles', 'active'],
    queryFn: fetchActiveHuddles,
    staleTime: 10 * 1000,
  });
  useEffect(() => {
    const channel = supabase
      .channel(`huddles-active-global-${instanceId}`)
      .on('postgres_changes' as 'system', { event: '*', schema: 'public', table: 'chat_huddles' } as never,
        () => qc.invalidateQueries({ queryKey: ['chat', 'huddles', 'active'] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc, instanceId]);
  return new Set((data ?? []).map((h) => h.conversation_id));
}

/** User ids currently in ANY huddle (global via user_presence.active_huddle_id).
 *  Drives the DM-list "on a call" indicator. */
export function useUsersOnCall(): Set<string> {
  const qc = useQueryClient();
  const instanceId = useId();
  const { data } = useQuery({
    queryKey: ['chat', 'users-on-call'],
    staleTime: 10 * 1000,
    queryFn: async () => {
      try {
        const { data } = await db.from('user_presence').select('user_id').not('active_huddle_id', 'is', null);
        return ((data ?? []) as { user_id: string }[]).map((r) => r.user_id);
      } catch { return []; }
    },
  });
  useEffect(() => {
    const ch = supabase
      .channel(`users-on-call-${instanceId}`)
      .on('postgres_changes' as 'system', { event: '*', schema: 'public', table: 'user_presence' } as never,
        () => qc.invalidateQueries({ queryKey: ['chat', 'users-on-call'] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, instanceId]);
  return new Set(data ?? []);
}

/** The active huddle (if any) for one conversation, with participants + full flag. */
export function useActiveHuddle(conversationId: string | null) {
  const qc = useQueryClient();
  const instanceId = useId();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const key = ['chat', 'huddle', conversationId, userId];
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
      const ids = ((parts ?? []) as ParticipantRow[]).map((p) => p.user_id);
      let nameMap: Record<string, string> = {};
      let avatarMap: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await db.from('profiles').select('id, full_name, avatar_url').in('id', ids);
        const rows = (profs ?? []) as { id: string; full_name: string | null; avatar_url: string | null }[];
        nameMap = Object.fromEntries(rows.map((r) => [r.id, r.full_name ?? '']));
        avatarMap = Object.fromEntries(rows.map((r) => [r.id, r.avatar_url ?? '']));
      }
      const participants = ids.map((uid) => ({ userId: uid, name: nameMap[uid] || '', avatarUrl: avatarMap[uid] || '' }));
      return {
        id: (hud as HuddleRow).id,
        participants,
        isFull: participants.length >= HUDDLE_CAP,
        // Am I (the current user) already a live participant? Then I can always
        // reclaim my slot ("Rejoin") even if the huddle reads as full — e.g. a
        // stale row left after an unclean disconnect.
        iAmParticipant: !!userId && ids.includes(userId),
      };
    },
  });
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`huddle:${conversationId}:${instanceId}`)
      .on('postgres_changes' as 'system', { event: '*', schema: 'public', table: 'chat_huddles', filter: `conversation_id=eq.${conversationId}` } as never,
        () => qc.invalidateQueries({ queryKey: key }))
      .on('postgres_changes' as 'system', { event: '*', schema: 'public', table: 'chat_huddle_participants' } as never,
        () => qc.invalidateQueries({ queryKey: key }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, instanceId]);
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
      if (alreadyIn) {
        // Already a live participant — re-enter without inserting a duplicate row.
        await enter({
          conversationId,
          huddleId: huddleId as string,
          conversationName: conversation.title,
          selfId: user.id,
        });
        return;
      }
      if (live.length >= HUDDLE_CAP) {
        throw new Error('HUDDLE_FULL');
      }
    } else {
      const { data: created, error } = await db.from('chat_huddles')
        .insert({ conversation_id: conversationId, started_by: user.id })
        .select('id').single();
      if (error || !created) {
        throw new Error(`HUDDLE_START_FAILED: ${error?.message ?? 'no row returned'}${error?.code ? ` [${error.code}]` : ''}`);
      }
      huddleId = (created as HuddleRow).id;
    }
    // Insert participant row (left_at = null = live). Only reached when not already in.
    const { error: partErr } = await db.from('chat_huddle_participants')
      .insert({ huddle_id: huddleId, user_id: user.id });
    if (partErr) {
      throw new Error(`HUDDLE_JOIN_FAILED: ${partErr.message}${partErr.code ? ` [${partErr.code}]` : ''}`);
    }
    await enter({
      conversationId,
      huddleId: huddleId as string,
      conversationName: conversation.title,
      selfId: user.id,
    });
  }, [user, enter]);

  return { startOrJoin };
}
