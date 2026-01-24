/**
 * useDataRowResults — Aggregates execution results per data row
 * Returns latest run status per row + summary stats for DDT results view
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type RowResultStatus = 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked';

export interface DataRowLatestResult {
  rowId: string;
  rowOrder: number;
  rowData: Record<string, any>;
  latestRunId?: string;
  latestRunNumber?: number;
  latestStatus: RowResultStatus;
  startedAt?: string;
  completedAt?: string;
}

export interface DataRowResultsSummary {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  in_progress: number;
  not_run: number;
  passRate: number;
}

interface UseDataRowResultsParams {
  testCaseId: string | undefined;
  scopeId?: string;
  cycleId?: string;
}

export function useDataRowResults({ testCaseId, scopeId }: UseDataRowResultsParams) {
  // Fetch parameters for column ordering
  const parametersQuery = useQuery({
    queryKey: ['test-data-parameters', testCaseId],
    queryFn: async () => {
      if (!testCaseId) return [];
      
      const { data, error } = await supabase
        .from('test_data_parameters')
        .select('parameter_name, column_order')
        .eq('test_case_id', testCaseId)
        .order('column_order', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!testCaseId,
  });

  // Fetch data rows
  const rowsQuery = useQuery({
    queryKey: ['test-data-rows', testCaseId],
    queryFn: async () => {
      if (!testCaseId) return [];
      
      const { data, error } = await supabase
        .from('test_data_rows')
        .select('id, row_data, row_order')
        .eq('test_case_id', testCaseId)
        .order('row_order', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!testCaseId,
  });

  // Fetch runs for this scope with data row links
  const runsQuery = useQuery({
    queryKey: ['tm-runs-by-scope', scopeId],
    queryFn: async () => {
      if (!scopeId) return [];
      
      const { data, error } = await supabase
        .from('tm_test_runs')
        .select('id, run_number, status, test_data_row_id, started_at, completed_at, created_at')
        .eq('cycle_scope_id', scopeId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!scopeId,
  });

  // Compute aggregated results
  const results = useQuery({
    queryKey: ['data-row-results', testCaseId, scopeId],
    queryFn: async (): Promise<{
      rows: DataRowLatestResult[];
      summary: DataRowResultsSummary;
      columnOrder: string[];
    }> => {
      const rows = rowsQuery.data || [];
      const runs = runsQuery.data || [];
      const parameters = parametersQuery.data || [];
      
      // Column order from parameters
      const columnOrder = parameters.map(p => p.parameter_name);
      
      // Group runs by data_row_id, pick latest per row
      const latestByRowId = new Map<string, typeof runs[0]>();
      
      for (const run of runs) {
        if (!run.test_data_row_id) continue;
        
        const existing = latestByRowId.get(run.test_data_row_id);
        if (!existing || new Date(run.created_at) > new Date(existing.created_at)) {
          latestByRowId.set(run.test_data_row_id, run);
        }
      }
      
      // Map rows to results
      const rowResults: DataRowLatestResult[] = rows.map(row => {
        const latestRun = latestByRowId.get(row.id);
        
        let status: RowResultStatus = 'not_run';
        if (latestRun) {
          status = normalizeStatus(latestRun.status);
        }
        
        return {
          rowId: row.id,
          rowOrder: row.row_order,
          rowData: row.row_data as Record<string, any>,
          latestRunId: latestRun?.id,
          latestRunNumber: latestRun?.run_number,
          latestStatus: status,
          startedAt: latestRun?.started_at ?? undefined,
          completedAt: latestRun?.completed_at ?? undefined,
        };
      });
      
      // Compute summary
      const summary: DataRowResultsSummary = {
        total: rowResults.length,
        passed: rowResults.filter(r => r.latestStatus === 'passed').length,
        failed: rowResults.filter(r => r.latestStatus === 'failed').length,
        blocked: rowResults.filter(r => r.latestStatus === 'blocked').length,
        in_progress: rowResults.filter(r => r.latestStatus === 'in_progress').length,
        not_run: rowResults.filter(r => r.latestStatus === 'not_run').length,
        passRate: 0,
      };
      
      const completed = summary.passed + summary.failed + summary.blocked;
      summary.passRate = completed > 0 ? Math.round((summary.passed / completed) * 100) : 0;
      
      return { rows: rowResults, summary, columnOrder };
    },
    enabled: !!testCaseId && !!rowsQuery.data && !!runsQuery.data,
  });

  return {
    data: results.data,
    isLoading: parametersQuery.isLoading || rowsQuery.isLoading || runsQuery.isLoading || results.isLoading,
    error: parametersQuery.error || rowsQuery.error || runsQuery.error || results.error,
    refetch: () => {
      parametersQuery.refetch();
      rowsQuery.refetch();
      runsQuery.refetch();
      results.refetch();
    },
  };
}

// Normalize status to our limited set
function normalizeStatus(status: string | null): RowResultStatus {
  if (!status) return 'not_run';
  
  switch (status) {
    case 'passed':
      return 'passed';
    case 'failed':
      return 'failed';
    case 'blocked':
      return 'blocked';
    case 'in_progress':
      return 'in_progress';
    case 'skipped':
      return 'not_run'; // Treat skipped as not_run for summary
    default:
      return 'not_run';
  }
}
