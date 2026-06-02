import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BackupSuggestion {
  user_id: string | null;
  name: string;
  reason: string;
}

export interface BackupSuggestionResult {
  suggested_backup: BackupSuggestion;
  coverage_insight: string;
}

interface SuggestArgs {
  assignee_user_id: string;
  viewer_user_id?: string;
  issue_summary?: string;
  issue_type?: string;
}

export function useBackupSuggestion() {
  const mutation = useMutation<BackupSuggestionResult, Error, SuggestArgs>({
    mutationFn: async ({ assignee_user_id, viewer_user_id, issue_summary, issue_type }: SuggestArgs) => {
      const { data, error } = await supabase.functions.invoke(
        'presence-backup-suggest',
        {
          body: { assignee_user_id, viewer_user_id, issue_summary, issue_type },
        }
      );

      if (error) throw error;
      if (!data?.suggested_backup || !data?.coverage_insight) {
        throw new Error('Unexpected response from presence-backup-suggest');
      }

      return data as BackupSuggestionResult;
    },
  });

  return {
    suggest:          mutation.mutateAsync,
    isPending:        mutation.isPending,
    data:             mutation.data ?? null,
    suggested_backup: mutation.data?.suggested_backup ?? null,
    coverage_insight: mutation.data?.coverage_insight ?? null,
    error:            mutation.error,
    reset:            mutation.reset,
  };
}
