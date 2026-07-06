/**
 * Release test readiness gate (CAT-TESTHUB-V2 slice G3).
 *
 * tm_compute_ph_release_gate(release_id) — computed over the tm plane's native
 * ph_releases linkage (tm_test_cycles/executions/cases.release_id). The
 * rh_releases bridge (tm_compute_release_gate) serves the Release Ops cockpit.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ReleaseGateState = 'pass' | 'warn' | 'block';

export interface ReleaseTestGateTotals {
  scope: number;
  executed: number;
  passed: number;
  failed: number;
  blocked: number;
  open_blocker_defects: number;
  failed_blocked_with_evidence: number;
  failed_blocked_total: number;
  draft_cases: number;
  executions: number;
  executions_completed: number;
}

export interface ReleaseTestGate {
  release_id: string;
  gate: ReleaseGateState;
  reasons: string[];
  totals: ReleaseTestGateTotals;
  computed_at: string;
}

export function useReleaseTestGate(releaseId: string | undefined) {
  return useQuery({
    queryKey: ['tm-ph-release-gate', releaseId],
    queryFn: async (): Promise<ReleaseTestGate> => {
      const { data, error } = await supabase.rpc(
        'tm_compute_ph_release_gate' as never,
        { p_release_id: releaseId } as never,
      );
      if (error) throw error;
      return data as unknown as ReleaseTestGate;
    },
    enabled: !!releaseId,
    staleTime: 30_000,
  });
}
