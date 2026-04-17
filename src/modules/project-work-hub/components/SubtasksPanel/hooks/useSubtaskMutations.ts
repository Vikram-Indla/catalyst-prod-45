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
  fix_versions?: unknown;
  jira_created_at?: string | null;
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

  const bulkUpdate = useMutation({
    mutationFn: async ({ ids, patch }: { ids: string[]; patch: UpdateArgs['patch'] }) => {
      if (!ids.length) return 0;
      const { error } = await supabase.from('ph_issues').update(patch).in('id', ids);
      if (error) throw error;
      return ids.length;
    },
    onMutate: async ({ ids, patch }) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<SubtaskRow[]>(queryKey);
      if (prev) {
        const idSet = new Set(ids);
        qc.setQueryData<SubtaskRow[]>(queryKey, prev.map(r => idSet.has(r.id) ? { ...r, ...patch } : r));
      }
      return { prev };
    },
    onSuccess: (n) => {
      if (n > 0) toast.success(`Updated ${n} subtask${n === 1 ? '' : 's'}`);
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error('Bulk update failed', { description: (err as Error).message });
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  const bulkRemove = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return 0;
      const { error } = await supabase
        .from('ph_issues')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
      return ids.length;
    },
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<SubtaskRow[]>(queryKey);
      if (prev) {
        const idSet = new Set(ids);
        qc.setQueryData<SubtaskRow[]>(queryKey, prev.filter(r => !idSet.has(r.id)));
      }
      return { prev };
    },
    onSuccess: (n) => {
      if (n > 0) toast.success(`Deleted ${n} subtask${n === 1 ? '' : 's'}`);
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error('Bulk delete failed', { description: (err as Error).message });
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  /**
   * Per-row position reassignment for rebalance-after-drag.
   * `bulkUpdate` applies one patch to many rows; we need distinct positions
   * per id, so we fan out individual UPDATEs in parallel.
   */
  const reorderPositions = useMutation({
    mutationFn: async (updates: Array<{ id: string; position: number }>) => {
      if (updates.length === 0) return 0;
      const results = await Promise.all(
        updates.map(u =>
          supabase.from('ph_issues').update({ position: u.position }).eq('id', u.id)
        )
      );
      const firstError = results.find(r => r.error)?.error;
      if (firstError) throw firstError;
      return updates.length;
    },
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<SubtaskRow[]>(queryKey);
      if (prev) {
        const posMap = new Map(updates.map(u => [u.id, u.position]));
        const patched = prev.map(r => posMap.has(r.id) ? { ...r, position: posMap.get(r.id)! } : r);
        patched.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        qc.setQueryData<SubtaskRow[]>(queryKey, patched);
      }
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error('Reorder failed', { description: (err as Error).message });
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  return { update, remove, bulkRemoveDone, bulkUpdate, bulkRemove, reorderPositions };
}
