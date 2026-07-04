/**
 * useSprintDod — Definition of Done for a sprint (CAT-SPRINTS-NATIVE-20260702-002 S2.1).
 *
 * Per-work-item-type "done" status, scoped to the types actually present in
 * the sprint (via ph_issues.sprint_id — D-002 FK membership). No hardcoded
 * default: real per-type status catalogs vary too much to guess safely
 * (verified live — Story's terminal status is "In Production", not "Done").
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SprintDodRow {
  id: string;
  sprint_id: string;
  work_item_type: string;
  done_status: string;
}

/** Work-item types currently present in this sprint (via the FK, D-002). */
export function useSprintItemTypes(sprintId: string) {
  return useQuery({
    queryKey: ['sprint-dod', sprintId, 'item-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select('issue_type')
        .eq('sprint_id', sprintId);
      if (error) throw new Error(error.message);
      return [...new Set((data ?? []).map((r: any) => r.issue_type).filter(Boolean))] as string[];
    },
    enabled: !!sprintId,
    staleTime: 30_000,
  });
}

export function useSprintDod(sprintId: string) {
  return useQuery({
    queryKey: ['sprint-dod', sprintId, 'rows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_sprint_dod')
        .select('id, sprint_id, work_item_type, done_status')
        .eq('sprint_id', sprintId);
      if (error) throw new Error(error.message);
      return (data ?? []) as SprintDodRow[];
    },
    enabled: !!sprintId,
    staleTime: 30_000,
  });
}

export function useSetSprintDod(sprintId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workItemType, doneStatus }: { workItemType: string; doneStatus: string }) => {
      const { error } = await supabase
        .from('ph_sprint_dod')
        .upsert(
          { sprint_id: sprintId, work_item_type: workItemType, done_status: doneStatus },
          { onConflict: 'sprint_id,work_item_type' },
        );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sprint-dod', sprintId, 'rows'] }),
  });
}

export function useRemoveSprintDod(sprintId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ph_sprint_dod').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sprint-dod', sprintId, 'rows'] }),
  });
}
