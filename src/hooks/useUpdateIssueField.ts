/**
 * Generic hook to update any field on ph_issues by issue_key.
 * Provides optimistic cache update + toast feedback.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

export function useUpdateIssueField(projectKey: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ issueKey, fields }: { issueKey: string; fields: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('ph_issues')
        .update({ ...fields, updated_at: new Date().toISOString() } as any)
        .eq('issue_key', issueKey);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['jira-hierarchy', projectKey] });
      // Silent for most updates per platform policy — caller can toast if needed
    },
    onError: () => {
      catalystToast.error('Failed to update');
    },
  });
}
