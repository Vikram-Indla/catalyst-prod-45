/**
 * useStartGroupDm — wraps the chat_get_or_create_group_dm RPC.
 * Caller is always included server-side; pass 2–7 OTHER profile ids
 * (server caps the group at 8 total members).
 * Resolves an existing group with the same exact member set or creates one.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useStartGroupDm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (otherUserIds: string[]): Promise<string> => {
      if (!Array.isArray(otherUserIds) || otherUserIds.length < 2) {
        throw new Error('group DM needs at least 2 other people');
      }
      if (otherUserIds.length > 7) {
        throw new Error('group DM capped at 8 members (you + 7)');
      }
      const { data, error } = await (supabase as any).rpc('chat_get_or_create_group_dm', {
        p_user_ids: otherUserIds,
      });
      if (error) throw error;
      if (!data) throw new Error('No conversation id returned');
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
}
