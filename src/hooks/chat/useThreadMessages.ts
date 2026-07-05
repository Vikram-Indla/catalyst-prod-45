/**
 * useThreadMessages — child messages of a parent_id (thread replies).
 * Mirrors useMessages but filtered to parent_id. Sends new replies with
 * parent_id set so they belong to the thread.
 */
import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { chatRealtime } from '@/lib/chat/ChatRealtimeManager';
import { resolveAvatarUrl } from '@/lib/avatars';
import type { ChatMessage, ChatReaction } from '@/types/chat';

const db = supabase as unknown as { from: (table: string) => any };

interface ReactionRow {
  message_id: string;
  emoji: string;
  user_id: string;
}

// Mirrors useMessages.ts's aggregateReactions — not exported from there to
// avoid coupling the two hooks; the shape is small enough to keep local.
function aggregateReactions(rows: ReactionRow[], myId: string | null): Map<string, ChatReaction[]> {
  const byMessage = new Map<string, Map<string, { count: number; mine: boolean }>>();
  for (const r of rows) {
    let emojis = byMessage.get(r.message_id);
    if (!emojis) {
      emojis = new Map();
      byMessage.set(r.message_id, emojis);
    }
    const e = emojis.get(r.emoji) ?? { count: 0, mine: false };
    e.count += 1;
    if (myId && r.user_id === myId) e.mine = true;
    emojis.set(r.emoji, e);
  }
  const out = new Map<string, ChatReaction[]>();
  byMessage.forEach((emojis, messageId) => {
    out.set(
      messageId,
      Array.from(emojis.entries()).map(([emoji, v]) => ({
        emoji,
        count: v.count,
        reactedByMe: v.mine,
      })),
    );
  });
  return out;
}

async function fetchThread(conversationId: string, parentId: string, myId: string | null): Promise<ChatMessage[]> {
  const { data: msgs, error } = await db
    .from('chat_messages')
    .select('id, conversation_id, parent_id, author_id, body_text, body_adf, created_at, edited_at, deleted_at')
    .eq('conversation_id', conversationId)
    .eq('parent_id', parentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error || !msgs) return [];

  const ids = (msgs as Array<{ id: string }>).map((m) => m.id);
  let reactionsByMessage = new Map<string, ChatReaction[]>();
  if (ids.length > 0) {
    const { data: reactions } = await db
      .from('chat_message_reactions')
      .select('message_id, emoji, user_id')
      .in('message_id', ids);
    if (reactions) reactionsByMessage = aggregateReactions(reactions as ReactionRow[], myId);
  }

  const authorIds = Array.from(new Set((msgs as Array<{ author_id: string }>).map((m) => m.author_id).filter(Boolean)));
  let authorMap = new Map<string, { name: string; avatar: string | null }>();
  if (authorIds.length > 0) {
    const { data: authors } = await db
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', authorIds);
    if (authors) {
      authorMap = new Map(
        (authors as Array<{ id: string; full_name: string | null; avatar_url: string | null }>)
          .map((a) => [a.id, { name: a.full_name ?? '', avatar: resolveAvatarUrl(a.full_name ?? null) ?? a.avatar_url }]),
      );
    }
  }

  return (msgs as Array<any>).map((m) => ({
    id: m.id,
    conversationId: m.conversation_id,
    parentId: m.parent_id,
    authorId: m.author_id,
    authorName: authorMap.get(m.author_id)?.name ?? '',
    authorAvatarUrl: authorMap.get(m.author_id)?.avatar ?? null,
    bodyText: m.body_text ?? '',
    bodyAdf: m.body_adf ?? null,
    createdAt: m.created_at,
    editedAt: m.edited_at,
    deletedAt: m.deleted_at,
    reactions: reactionsByMessage.get(m.id) ?? [],
    replyCount: 0,
    lastReplyAt: null,
    isAlsoInChannel: false,
  })) as ChatMessage[];
}

export function useThreadMessages(conversationId: string | null, parentId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const myId = user?.id ?? null;
  const query = useQuery({
    queryKey: ['chat', 'thread', conversationId, parentId],
    enabled: !!conversationId && !!parentId,
    queryFn: () => fetchThread(conversationId!, parentId!, myId),
  });

  // Realtime: refresh the thread when any message in the conversation changes so
  // replies from the other participant (e.g. in-huddle messages) appear live.
  useEffect(() => {
    if (!conversationId || !parentId) return;
    const unsubscribe = chatRealtime.subscribeMessages(conversationId, () => {
      qc.invalidateQueries({ queryKey: ['chat', 'thread', conversationId, parentId] });
    });
    return unsubscribe;
  }, [conversationId, parentId, qc]);

  // Realtime: reactions live in their own table (no chat_messages row change),
  // so the message channel misses them. Only refetch when the reacted message
  // is the thread parent or one of its cached replies.
  useEffect(() => {
    if (!conversationId || !parentId) return;
    const unsubscribe = chatRealtime.subscribeReactions((payload) => {
      const p = payload as { new?: { message_id?: string }; old?: { message_id?: string } };
      const messageId = p?.new?.message_id ?? p?.old?.message_id;
      if (!messageId) return;
      const cached = qc.getQueryData<Array<{ id: string }>>(
        ['chat', 'thread', conversationId, parentId],
      );
      const inThread = messageId === parentId || !!cached?.some((r) => r.id === messageId);
      if (inThread) {
        qc.invalidateQueries({ queryKey: ['chat', 'thread', conversationId, parentId] });
      }
    });
    return unsubscribe;
  }, [conversationId, parentId, qc]);

  const reply = useMutation({
    mutationFn: async (text: string) => {
      if (!conversationId || !parentId || !user) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      const { error } = await db.from('chat_messages').insert({
        conversation_id: conversationId,
        parent_id: parentId,
        body_text: trimmed,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat', 'thread', conversationId, parentId] });
      qc.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
    },
  });

  const sendReply = useCallback((text: string) => reply.mutateAsync(text), [reply]);

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
    sendReply,
  };
}
