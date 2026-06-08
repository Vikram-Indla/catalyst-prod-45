/**
 * useStartProjectChannel — gets or creates the project channel.
 * Calls the chat_get_or_create_project_channel RPC. All ph_project_members
 * are auto-joined on creation.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useStartProjectChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectKey: string): Promise<string> => {
      const { data, error } = await (supabase as any).rpc('chat_get_or_create_project_channel', {
        p_project_key: projectKey,
      });
      if (error) throw error;
      if (!data) throw new Error('No conversation id');
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat', 'conversations'] }),
  });
}
