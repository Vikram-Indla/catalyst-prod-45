/**
 * useSprintEfficiency — D-008's per-sprint efficiency score (40% completion +
 * 25% flow-efficiency + 20% scope-stability + 15% approval-timeliness),
 * computed server-side via the compute_sprint_efficiency RPC
 * (CAT-SPRINTS-NATIVE-20260702-002 Phase 3 Slice 4b).
 *
 * Every component is null when its source data is absent — the caller must
 * not fabricate a score for a missing component.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SprintEfficiencyResult {
  completion: number | null;
  flow_efficiency: number | null;
  scope_stability: number | null;
  approval_timeliness: number | null;
  overall: number | null;
  missing: string[];
}

export function useSprintEfficiency(sprintId: string | undefined) {
  return useQuery({
    queryKey: ['sprint-efficiency', sprintId],
    queryFn: async (): Promise<SprintEfficiencyResult> => {
      const { data, error } = await supabase.rpc('compute_sprint_efficiency', {
        p_sprint_id: sprintId as string,
      });
      if (error) throw new Error(error.message);
      return data as unknown as SprintEfficiencyResult;
    },
    enabled: !!sprintId,
  });
}
