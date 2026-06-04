/**
 * useCreateConversation — creates chat conversations (DMs and channels).
 *
 * A DB trigger auto-adds the conversation creator as a member on insert. For a
 * 'dm' both participants must be members, so createDM explicitly upserts both
 * rows (ON CONFLICT DO NOTHING) after the insert. createChannel relies on the
 * trigger's roster.
 *
 * On success the caller's conversations query (['chat','conversations',userId])
 * is invalidated so useConversations refetches the new row.
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// chat_* tables are created in parallel and are not in the generated Database
// types yet — cast to bypass typed-table inference (mirrors useConversations).
const db = supabase as unknown as {
  from: (table: string) => any;
};

export function useCreateConversation(): {
  createDM: (otherUserId: string) => Promise<string>;
  createChannel: (projectKey: string, title: string) => Promise<string>;
} {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['chat', 'conversations', userId] });
  }, [queryClient, userId]);

  const createDM = useCallback(
    async (otherUserId: string): Promise<string> => {
      if (!userId) throw new Error('Not authenticated');

      // Dedup: find an existing dm where BOTH users are members.
      const { data: mine } = await db
        .from('chat_conversation_members')
        .select('conversation_id, chat_conversations:conversation_id ( id, kind )')
        .eq('user_id', userId);

      const myDmIds: string[] = (mine ?? [])
        .filter((m: any) => {
          const conv = Array.isArray(m.chat_conversations)
            ? m.chat_conversations[0]
            : m.chat_conversations;
          return conv?.kind === 'dm';
        })
        .map((m: any) => m.conversation_id as string);

      if (myDmIds.length > 0) {
        const { data: shared } = await db
          .from('chat_conversation_members')
          .select('conversation_id')
          .eq('user_id', otherUserId)
          .in('conversation_id', myDmIds);
        const existingId = (shared ?? [])[0]?.conversation_id as string | undefined;
        if (existingId) return existingId;
      }

      const { data: created, error: insertErr } = await db
        .from('chat_conversations')
        .insert({ kind: 'dm', title: null })
        .select('id')
        .single();
      if (insertErr || !created?.id) {
        throw insertErr ?? new Error('Failed to create conversation');
      }
      const convId = created.id as string;

      await db
        .from('chat_conversation_members')
        .upsert(
          [
            { conversation_id: convId, user_id: userId, role: 'admin' },
            { conversation_id: convId, user_id: otherUserId, role: 'member' },
          ],
          { onConflict: 'conversation_id,user_id', ignoreDuplicates: true },
        );

      invalidate();
      return convId;
    },
    [userId, invalidate],
  );

  const createChannel = useCallback(
    async (projectKey: string, title: string): Promise<string> => {
      if (!userId) throw new Error('Not authenticated');

      const { data: created, error } = await db
        .from('chat_conversations')
        .insert({ kind: 'channel', project_key: projectKey, title })
        .select('id')
        .single();
      if (error || !created?.id) {
        throw error ?? new Error('Failed to create channel');
      }

      invalidate();
      return created.id as string;
    },
    [userId, invalidate],
  );

  return { createDM, createChannel };
}

export default useCreateConversation;
