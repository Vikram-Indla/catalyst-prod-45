/**
 * useStartTicketThread — gets or creates a ticket-anchored chat thread.
 * Calls the chat_get_or_create_ticket_thread RPC. Auto-joins assignee + reporter
 * (resolved via profiles.jira_account_id).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useStartTicketThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (issueKey: string): Promise<string> => {
      const { data, error } = await (supabase as any).rpc('chat_get_or_create_ticket_thread', {
        p_issue_key: issueKey,
      });
      if (error) throw error;
      if (!data) throw new Error('No conversation id');
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat', 'conversations'] }),
  });
}
