/**
 * useArchiveConversation — manual archive / unarchive of a chat conversation
 * via the member-gated chat_set_archived RPC. Invalidates the conversations
 * query so the list (and its Archived section) refreshes.
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as unknown as {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

export function useArchiveConversation(): {
  setArchived: (conversationId: string, archived: boolean) => Promise<void>;
} {
  const queryClient = useQueryClient();

  const setArchived = useCallback(
    async (conversationId: string, archived: boolean) => {
      const { error } = await db.rpc('chat_set_archived', {
        p_conversation_id: conversationId,
        p_archived: archived,
      });
      if (error) throw error;
      // prefix-match invalidation (key is ['chat','conversations',userId])
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
    [queryClient],
  );

  return { setArchived };
}

export default useArchiveConversation;
