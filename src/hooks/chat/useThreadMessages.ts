/**
 * useThreadMessages — child messages of a parent_id (thread replies).
 * Mirrors useMessages but filtered to parent_id. Sends new replies with
 * parent_id set so they belong to the thread.
 */
import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ChatMessage } from '@/types/chat';

const db = supabase as unknown as { from: (table: string) => any };

async function fetchThread(conversationId: string, parentId: string): Promise<ChatMessage[]> {
  const { data: msgs, error } = await db
    .from('chat_messages')
    .select('id, conversation_id, parent_id, author_id, body_text, body_adf, created_at, edited_at, deleted_at')
    .eq('conversation_id', conversationId)
    .eq('parent_id', parentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error || !msgs) return [];

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
          .map((a) => [a.id, { name: a.full_name ?? '', avatar: a.avatar_url }]),
      );
    }
  }

  return (msgs as Array<any>).map((m) => ({
    id: m.id,
    conversationId: m.conversation_id,
    parentId: m.parent_id,
    authorId: m.author_id,
    authorName: authorMap.get(m.author_id)?.name ?? '',
    authorAvatarUrl: null,
    bodyText: m.body_text ?? '',
    bodyAdf: m.body_adf ?? null,
    createdAt: m.created_at,
    editedAt: m.edited_at,
    deletedAt: m.deleted_at,
    reactions: [],
    replyCount: 0,
    lastReplyAt: null,
    isAlsoInChannel: false,
  })) as ChatMessage[];
}

export function useThreadMessages(conversationId: string | null, parentId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['chat', 'thread', conversationId, parentId],
    enabled: !!conversationId && !!parentId,
    queryFn: () => fetchThread(conversationId!, parentId!),
  });

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
