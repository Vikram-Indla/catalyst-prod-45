/**
 * useAddMembers — add people to an existing chat conversation.
 *
 * Calls the SECURITY DEFINER chat_add_members RPC (caller must already be a
 * member; RLS-guarded server-side). On success it invalidates the caller's
 * conversations + members/messages query keys so the roster and avatar stack
 * refetch. Mirrors the cast + invalidate pattern from useCreateConversation.
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// chat_* tables/rpcs are created in parallel and not in the generated Database
// types yet — cast to bypass typed inference (mirrors useCreateConversation).
const db = supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

export function useAddMembers(): {
  addMembers: (conversationId: string, userIds: string[]) => Promise<number>;
} {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const addMembers = useCallback(
    async (conversationId: string, userIds: string[]): Promise<number> => {
      if (!userId) throw new Error('Not authenticated');
      if (!conversationId || userIds.length === 0) return 0;

      const { data, error } = await db.rpc('chat_add_members', {
        p_conversation_id: conversationId,
        p_user_ids: userIds,
      });
      if (error) {
        throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations', userId] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'members', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });

      return typeof data === 'number' ? data : 0;
    },
    [userId, queryClient],
  );

  return { addMembers };
}

export default useAddMembers;
