import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SubtaskRow {
  id: string;
  issue_key: string;
  summary: string;
  status: string;
  status_category: string;
  issue_type: string;
  assignee_display_name: string | null;
  assignee_account_id: string | null;
  priority: string;
  position: number;
  deleted_at: string | null;
}

interface UpdateArgs {
  id: string;
  patch: Partial<Pick<SubtaskRow,
    'summary' | 'status' | 'status_category' | 'priority' |
    'assignee_display_name' | 'assignee_account_id' | 'issue_type' | 'position'
  >>;
}

export function useSubtaskMutations(parentKey: string) {
  const qc = useQueryClient();
  const queryKey = ['childIssues', parentKey];

  const update = useMutation({
    mutationFn: async ({ id, patch }: UpdateArgs) => {
      const { error } = await supabase.from('ph_issues').update(patch).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<SubtaskRow[]>(queryKey);
      if (prev) {
        qc.setQueryData<SubtaskRow[]>(queryKey, prev.map(r => r.id === id ? { ...r, ...patch } : r));
      }
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error('Failed to update subtask', { description: (err as Error).message });
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ph_issues')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<SubtaskRow[]>(queryKey);
      if (prev) qc.setQueryData<SubtaskRow[]>(queryKey, prev.filter(r => r.id !== id));
      return { prev };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error('Failed to delete subtask', { description: (err as Error).message });
    },
    onSuccess: () => toast.success('Subtask deleted'),
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  const bulkRemoveDone = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return 0;
      const { error } = await supabase
        .from('ph_issues')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (n) => {
      if (n > 0) toast.success(`Cleared ${n} completed subtask${n === 1 ? '' : 's'}`);
    },
    onError: (err) => toast.error('Failed to clear completed', { description: (err as Error).message }),
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  return { update, remove, bulkRemoveDone };
}
