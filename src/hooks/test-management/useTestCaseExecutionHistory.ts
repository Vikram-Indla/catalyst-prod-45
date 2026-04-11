/**
 * Hook for fetching test case execution history from DB
 */
import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';

export interface ExecutionHistoryRecord {
  id: number;
  cycleId: string;
  cycleName: string;
  status: 'passed' | 'failed' | 'blocked' | 'not_run';
  executor: string;
  duration: string;
  timestamp: string;
}

export function useTestCaseExecutionHistory(caseId: string | undefined) {
  return useQuery({
    queryKey: ['tm-case-execution-history', caseId],
    queryFn: async (): Promise<ExecutionHistoryRecord[]> => {
      if (!caseId) return [];

      // Fetch executions for this test case
      const { data: executions, error } = await typedQuery('test_cycle_executions')
        .select(`
          id,
          status,
          executed_at,
          cycle:tm_test_cycles(id, cycle_key, name),
          executor:profiles!test_cycle_executions_executed_by_fkey(id, full_name)
        `)
        .eq('case_id', caseId)
        .order('executed_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching execution history:', error);
        return [];
      }

      // Map DB records to the expected format
      return (executions || []).map((exec: any, index: number) => {
        const cycle = exec.cycle as { id: string; cycle_key: string; name: string } | null;
        const executor = exec.executor as { id: string; full_name: string } | null;

        // Format timestamp
        let timestampStr = '—';
        if (exec.executed_at) {
          const execDate = new Date(exec.executed_at);
          const now = new Date();
          const diffMs = now.getTime() - execDate.getTime();
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          if (diffHours < 1) {
            timestampStr = 'Just now';
          } else if (diffHours < 24) {
            timestampStr = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
          } else if (diffDays < 7) {
            timestampStr = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
          } else {
            timestampStr = execDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
            });
          }
        }

        // Map status
        const statusMap: Record<string, 'passed' | 'failed' | 'blocked' | 'not_run'> = {
          'passed': 'passed',
          'failed': 'failed',
          'blocked': 'blocked',
          'not_run': 'not_run',
          'skipped': 'not_run',
          'in_progress': 'not_run',
        };

        return {
          id: index + 1,
          cycleId: cycle?.cycle_key || cycle?.id || '—',
          cycleName: cycle?.name || 'Unknown Cycle',
          status: statusMap[exec.status || ''] || 'not_run',
          executor: executor?.full_name || 'Unknown',
          duration: '—',
          timestamp: timestampStr,
        };
      });
    },
    enabled: !!caseId,
  });
}
