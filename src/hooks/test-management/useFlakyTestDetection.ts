import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FlakyTestInfo {
  id: string;
  case_key: string;
  title: string;
  total_runs: number;
  failed_runs: number;
  failure_rate: string; // percentage, e.g. "25.5"
}

/**
 * Detects flaky tests from tm_test_runs history.
 * Returns test cases with >20% failure rate in last 7 days.
 * Sorted by failure rate (highest first).
 */
export function useFlakyTestDetection() {
  return useQuery({
    queryKey: ['testops-flaky-tests'],
    staleTime: 60_000,
    queryFn: async (): Promise<FlakyTestInfo[]> => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Query runs from last 7 days, joining with cycle_scope to get test_case_id
      const { data, error } = await supabase
        .from('tm_test_runs')
        .select('status, created_at, cycle_scope(test_case_id)')
        .gte('created_at', sevenDaysAgo);

      if (error) throw error;

      // Group by test_case_id and compute stats
      const stats: Record<string, { total: number; failed: number }> = {};
      (data ?? []).forEach((run: any) => {
        const testCaseId = run.cycle_scope?.test_case_id;
        if (!testCaseId) return;

        if (!stats[testCaseId]) {
          stats[testCaseId] = { total: 0, failed: 0 };
        }
        stats[testCaseId].total++;
        if (run.status !== 'PASSED') {
          stats[testCaseId].failed++;
        }
      });

      // Filter flaky tests (>20% failure rate)
      const flakyIds = Object.entries(stats)
        .filter(([_, s]) => (s.failed / s.total) > 0.2)
        .map(([id]) => id);

      if (flakyIds.length === 0) return [];

      // Fetch test case details
      const { data: cases, error: caseError } = await supabase
        .from('tm_test_cases')
        .select('id, case_key, title')
        .in('id', flakyIds);

      if (caseError) throw caseError;

      // Merge stats with case details
      return (cases ?? [])
        .map((c: any) => {
          const s = stats[c.id];
          return {
            id: c.id,
            case_key: c.case_key,
            title: c.title,
            total_runs: s.total,
            failed_runs: s.failed,
            failure_rate: ((s.failed / s.total) * 100).toFixed(1),
          };
        })
        .sort((a, b) => parseFloat(b.failure_rate) - parseFloat(a.failure_rate));
    },
  });
}
