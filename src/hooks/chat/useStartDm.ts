/**
 * useStartDm — wraps the `chat_get_or_create_dm` Supabase RPC.
 * Given a target profile UUID, resolves an existing 2-person DM or creates one,
 * then invalidates the conversations list so the new row shows immediately.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useStartDm() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (targetUserId: string): Promise<string> => {
      const { data, error } = await (supabase as any).rpc('chat_get_or_create_dm', {
        target_user_id: targetUserId,
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
