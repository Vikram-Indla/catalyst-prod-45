import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useUpdateIssueStatus(projectKey: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ issueKey, newStatus }: { issueKey: string; newStatus: string }) => {
      const { error } = await supabase
        .from('ph_issues')
        .update({ status: newStatus, updated_at: new Date().toISOString() } as any)
        .eq('issue_key', issueKey);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jira-hierarchy', projectKey] });
      toast.success('Status updated');
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });
}
