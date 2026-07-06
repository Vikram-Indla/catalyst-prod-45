/**
 * Sprint test health — sprint as quality control plane (CAT-TESTHUB-V2 slice B9).
 *
 * tm_compute_sprint_test_health(sprint_id) aggregates coverage, execution,
 * defect and draft-case state, writes a tm_sprint_test_health snapshot row,
 * and returns the gate (pass | warn | block) with reasons.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';

export type SprintGateState = 'pass' | 'warn' | 'block';

export interface SprintTestHealthTotals {
  stories: number;
  covered_stories: number;
  scope: number;
  executed: number;
  passed: number;
  failed: number;
  blocked: number;
  open_blocker_defects: number;
  draft_cases: number;
}

export interface SprintTestHealth {
  sprint_id: string;
  gate: SprintGateState;
  reasons: string[];
  totals: SprintTestHealthTotals;
  computed_at: string;
}

/** Latest stored health snapshot for a sprint (null when never computed). */
export function useSprintTestHealth(sprintId: string | undefined) {
  return useQuery({
    queryKey: ['tm-sprint-test-health', sprintId],
    queryFn: async (): Promise<SprintTestHealth | null> => {
      if (!sprintId) return null;
      const { data, error } = await typedQuery('tm_sprint_test_health')
        .select('sprint_id, gate_state, gate_reasons, totals, computed_at')
        .eq('sprint_id', sprintId)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as {
        sprint_id: string;
        gate_state: SprintGateState;
        gate_reasons: string[];
        totals: SprintTestHealthTotals;
        computed_at: string;
      };
      return {
        sprint_id: row.sprint_id,
        gate: row.gate_state,
        reasons: row.gate_reasons ?? [],
        totals: row.totals,
        computed_at: row.computed_at,
      };
    },
    enabled: !!sprintId,
  });
}

/** Recompute health now (writes a new snapshot row, returns the fresh gate). */
export function useComputeSprintTestHealth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sprintId: string): Promise<SprintTestHealth> => {
      const { data, error } = await supabase.rpc(
        'tm_compute_sprint_test_health' as never,
        { p_sprint_id: sprintId } as never,
      );
      if (error) throw error;
      return data as unknown as SprintTestHealth;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tm-sprint-test-health', result.sprint_id] });
    },
  });
}
