/**
 * useCreateChannel — creates a free-standing (non-project) channel by name.
 * Calls the chat_create_channel RPC. The creator + all active resource
 * members are auto-joined by the chat_conversations insert trigger.
 *
 * Accepts a plain title (chat-v1 callers) or an object with isPrivate
 * (chat-v2 Create Channel modal).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type CreateChannelInput = string | { title: string; isPrivate?: boolean };

export function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateChannelInput): Promise<string> => {
      const title = typeof input === 'string' ? input : input.title;
      const isPrivate = typeof input === 'string' ? false : !!input.isPrivate;
      const { data, error } = await (supabase as any).rpc('chat_create_channel', {
        p_title: title,
        p_private: isPrivate,
      });
      if (error) throw error;
      if (!data) throw new Error('No conversation id');
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat', 'conversations'] }),
  });
}
