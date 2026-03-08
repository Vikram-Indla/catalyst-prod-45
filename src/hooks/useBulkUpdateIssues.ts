/**
 * Hook for bulk updating multiple ph_issues at once.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useBulkUpdateIssues(projectKey: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ issueKeys, fields }: { issueKeys: string[]; fields: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('ph_issues')
        .update({ ...fields, updated_at: new Date().toISOString() } as any)
        .in('issue_key', issueKeys);
      if (error) throw error;
      return issueKeys.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['jira-hierarchy', projectKey] });
      toast.success(`${count} item${count > 1 ? 's' : ''} updated`);
    },
    onError: () => {
      toast.error('Bulk update failed');
    },
  });
}

export function useBulkDeleteIssues(projectKey: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ issueKeys }: { issueKeys: string[] }) => {
      const { error } = await supabase
        .from('ph_issues')
        .delete()
        .in('issue_key', issueKeys);
      if (error) throw error;
      return issueKeys.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['jira-hierarchy', projectKey] });
      toast.success(`${count} item${count > 1 ? 's' : ''} deleted`);
    },
    onError: () => {
      toast.error('Bulk delete failed');
    },
  });
}
