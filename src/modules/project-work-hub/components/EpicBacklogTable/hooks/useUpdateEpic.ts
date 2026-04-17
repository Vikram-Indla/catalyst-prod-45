/**
 * useUpdateEpic — optimistic inline-edit mutation for Epic Backlog rows.
 *
 * Writes to ph_issues (the single source of truth for epics — see
 * useEpicBacklog). Optimistic update + rollback on error. Invalidates the
 * backlog query on success so other views re-sync.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { BacklogEpic } from '../../../types/backlog.types';

export type EpicUpdatePatch = Partial<{
  summary: string;
  status: string;
  status_category: string;
  priority: string;
  assignee_account_id: string | null;
  assignee_display_name: string | null;
  due_date: string | null;
}>;

interface UpdateArgs {
  id: string;
  patch: EpicUpdatePatch;
}

type BacklogCache = BacklogEpic[] | undefined;

export function useUpdateEpic(projectId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: UpdateArgs) => {
      const { error } = await supabase.from('ph_issues').update(patch).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      // Cancel any in-flight backlog queries so our optimistic patch isn't
      // immediately overwritten by a slower server round-trip.
      await qc.cancelQueries({ queryKey: ['backlog-epics', projectId] });
      const prevEntries = qc.getQueriesData<BacklogCache>({ queryKey: ['backlog-epics', projectId] });

      for (const [key, data] of prevEntries) {
        if (!data) continue;
        qc.setQueryData<BacklogCache>(
          key,
          data.map((epic) =>
            epic.id === id
              ? {
                  ...epic,
                  ...(patch.summary !== undefined ? { name: patch.summary } : {}),
                  ...(patch.status !== undefined ? { status: patch.status } : {}),
                  ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
                  ...(patch.assignee_display_name !== undefined ? { assignee_name: patch.assignee_display_name } : {}),
                  ...(patch.due_date !== undefined ? { end_date: patch.due_date } : {}),
                }
              : epic
          )
        );
      }
      return { prevEntries };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prevEntries) {
        for (const [key, data] of ctx.prevEntries) qc.setQueryData(key, data);
      }
      toast.error('Failed to update epic', { description: (err as Error).message });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['backlog-epics', projectId] });
    },
  });
}
