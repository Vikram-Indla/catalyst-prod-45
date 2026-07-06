/**
 * Case variance — snapshot vs repository drift (CAT-TESTHUB-V2 slice B9).
 *
 * V2 rule: repository edits never silently mutate active cycles. A scope row
 * whose locked_version trails the master case version is "in variance"; the
 * only ways out are explicit: pull latest (tm_pull_latest_into_scope RPC),
 * accept snapshot, or clone. Closed cycles never resolve — they stay immutable.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';

export interface ScopeVariance {
  scopeId: string;
  testCaseId: string;
  caseKey: string;
  caseTitle: string;
  lockedVersion: number;
  latestVersion: number;
}

/** Live variance detection for a cycle: scope rows whose snapshot trails the master case. */
export function useCycleVariance(cycleId: string | undefined) {
  return useQuery({
    queryKey: ['tm-cycle-variance', cycleId],
    queryFn: async (): Promise<ScopeVariance[]> => {
      if (!cycleId) return [];
      const { data, error } = await supabase
        .from('tm_cycle_scope')
        .select('id, test_case_id, locked_version, tm_test_cases!inner(id, case_key, title, version)')
        .eq('cycle_id', cycleId);
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        id: string;
        test_case_id: string;
        locked_version: number | null;
        tm_test_cases: { id: string; case_key: string; title: string; version: number };
      }>;
      return rows
        .filter((r) => r.locked_version != null && r.tm_test_cases.version > r.locked_version)
        .map((r) => ({
          scopeId: r.id,
          testCaseId: r.test_case_id,
          caseKey: r.tm_test_cases.case_key,
          caseTitle: r.tm_test_cases.title,
          lockedVersion: r.locked_version as number,
          latestVersion: r.tm_test_cases.version,
        }));
    },
    enabled: !!cycleId,
  });
}

/** Explicit pull-latest (V2: user action only; the RPC rejects closed cycles). */
export function usePullLatestIntoScope(cycleId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (scopeId: string) => {
      const { data, error } = await supabase.rpc(
        'tm_pull_latest_into_scope' as never,
        { p_scope_id: scopeId } as never,
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-cycle-variance', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycle-scope', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['cycle-details', cycleId] });
    },
  });
}

/** Record an accept-snapshot decision (variance acknowledged, snapshot kept). */
export function useAcceptSnapshotVariance(cycleId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { scopeId: string; projectId: string; testCaseId: string; lockedVersion: number; latestVersion: number }) => {
      const { error } = await typedQuery('tm_case_variance').upsert(
        {
          project_id: input.projectId,
          cycle_scope_id: input.scopeId,
          test_case_id: input.testCaseId,
          locked_version: input.lockedVersion,
          latest_version: input.latestVersion,
          resolved_at: new Date().toISOString(),
          resolution: 'accepted_snapshot',
        },
        { onConflict: 'cycle_scope_id,latest_version' },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-cycle-variance', cycleId] });
    },
  });
}
