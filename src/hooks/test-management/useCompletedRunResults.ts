/**
 * useCompletedRunResults — retrospective, read-only view of every recorded
 * execution run for a cycle.
 *
 * Reads canonical tm_test_runs joined through tm_cycle_scope to the case,
 * the executor (profiles) and any auto-created defect. One returned row =
 * one case-execution attempt (tm_test_runs is per-case; run_number is the
 * per-scope re-run counter). This is the retrospective surface the live
 * ExecutionPage never provided.
 *
 * CAT-TESTHUB-REBUILD Phase 3b. FK names verified live on cyij:
 *   tm_test_runs_cycle_scope_id_fkey, tm_test_runs_executed_by_fkey,
 *   tm_test_runs_auto_created_defect_id_fkey, tm_cycle_scope_test_case_id_fkey.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type RunResultStatus =
  | 'PASSED'
  | 'FAILED'
  | 'BLOCKED'
  | 'SKIPPED'
  | 'IN_PROGRESS'
  | 'NOT_RUN';

export interface CompletedRunResult {
  /** tm_test_runs.id */
  id: string;
  /** Per-scope re-run counter. */
  runNumber: number | null;
  status: RunResultStatus;
  notes: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationSeconds: number | null;
  /** Case identity — zero-assumption: null when the join is absent. */
  caseId: string | null;
  caseKey: string | null;
  caseTitle: string | null;
  /** Executor — null when unattributed. */
  executorId: string | null;
  executorName: string | null;
  executorAvatarUrl: string | null;
  /** Auto-created defect key, when the run spawned one. */
  defectKey: string | null;
}

const STATUS_MAP: Record<string, RunResultStatus> = {
  passed: 'PASSED',
  failed: 'FAILED',
  blocked: 'BLOCKED',
  skipped: 'SKIPPED',
  in_progress: 'IN_PROGRESS',
  not_run: 'NOT_RUN',
};

export function useCompletedRunResults(cycleId: string | undefined) {
  return useQuery({
    queryKey: ['tm-completed-run-results', cycleId],
    enabled: !!cycleId,
    queryFn: async (): Promise<CompletedRunResult[]> => {
      if (!cycleId) return [];

      const { data, error } = await supabase
        .from('tm_test_runs')
        .select(`
          id,
          run_number,
          status,
          notes,
          started_at,
          completed_at,
          duration_seconds,
          scope:tm_cycle_scope!tm_test_runs_cycle_scope_id_fkey!inner(
            cycle_id,
            test_case_id,
            test_case:tm_test_cases(id, case_key, title)
          ),
          executor:profiles!tm_test_runs_executed_by_fkey(id, full_name, avatar_url),
          defect:tm_defects!tm_test_runs_auto_created_defect_id_fkey(defect_key)
        `)
        .eq('scope.cycle_id', cycleId)
        .order('run_number', { ascending: false });

      if (error) throw error;

      return (data ?? []).map((run: any): CompletedRunResult => {
        const testCase = run.scope?.test_case as
          | { id: string; case_key: string; title: string }
          | null;
        const executor = run.executor as
          | { id: string; full_name: string; avatar_url: string | null }
          | null;
        const defect = run.defect as { defect_key: string } | null;
        return {
          id: run.id,
          runNumber: run.run_number ?? null,
          status: STATUS_MAP[run.status ?? ''] ?? 'NOT_RUN',
          notes: run.notes ?? null,
          startedAt: run.started_at ?? null,
          completedAt: run.completed_at ?? null,
          durationSeconds: run.duration_seconds ?? null,
          caseId: run.scope?.test_case_id ?? null,
          caseKey: testCase?.case_key ?? null,
          caseTitle: testCase?.title ?? null,
          executorId: executor?.id ?? null,
          executorName: executor?.full_name ?? null,
          executorAvatarUrl: executor?.avatar_url ?? null,
          defectKey: defect?.defect_key ?? null,
        };
      });
    },
  });
}
