/**
 * useCreateChannel — creates a free-standing (non-project) channel by name.
 * Calls the chat_create_channel RPC. The creator + all active resource
 * members are auto-joined by the chat_conversations insert trigger.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (title: string): Promise<string> => {
      const { data, error } = await (supabase as any).rpc('chat_create_channel', {
        p_title: title,
      });
      if (error) throw error;
      if (!data) throw new Error('No conversation id');
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat', 'conversations'] }),
  });
}
