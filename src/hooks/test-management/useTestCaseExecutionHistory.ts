/**
 * Hook for fetching test case execution history from DB.
 * Reads canonical tm_test_runs via tm_cycle_scope (the legacy
 * test_cycle_executions family is dead — 0 rows, never written).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ExecutionHistoryRecord {
  id: number;
  cycleId: string;
  cycleName: string;
  status: 'passed' | 'failed' | 'blocked' | 'not_run';
  executor: string;
  duration: string;
  timestamp: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  const execDate = new Date(iso);
  const diffMs = Date.now() - execDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return execDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const STATUS_MAP: Record<string, ExecutionHistoryRecord['status']> = {
  passed: 'passed',
  failed: 'failed',
  blocked: 'blocked',
  not_run: 'not_run',
  skipped: 'not_run',
  in_progress: 'not_run',
};

export function useTestCaseExecutionHistory(caseId: string | undefined) {
  return useQuery({
    queryKey: ['tm-case-execution-history', caseId],
    queryFn: async (): Promise<ExecutionHistoryRecord[]> => {
      if (!caseId) return [];

      const { data, error } = await supabase
        .from('tm_test_runs')
        .select(`
          id,
          status,
          duration_seconds,
          started_at,
          completed_at,
          scope:tm_cycle_scope!tm_test_runs_cycle_scope_id_fkey!inner(
            case_id,
            cycle:tm_test_cycles(id, cycle_key, name)
          ),
          executor:profiles!tm_test_runs_executed_by_fkey(id, full_name)
        `)
        .eq('scope.case_id', caseId)
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data ?? []).map((run: any, index: number) => {
        const cycle = run.scope?.cycle as { id: string; cycle_key: string; name: string } | null;
        const executor = run.executor as { id: string; full_name: string } | null;
        return {
          id: index + 1,
          cycleId: cycle?.cycle_key || cycle?.id || '—',
          cycleName: cycle?.name || '—',
          status: STATUS_MAP[run.status || ''] || 'not_run',
          executor: executor?.full_name || '—',
          duration: formatDuration(run.duration_seconds),
          timestamp: formatTimestamp(run.completed_at ?? run.started_at),
        };
      });
    },
    enabled: !!caseId,
  });
}
