// ============================================================================
// HOOK: useTestRuns
// File: /hooks/test-management/useTestRuns.ts
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TMRun, TMStepResult, RunStatus } from '@/types/test-management';
import { toast } from 'sonner';

// Status mapping (DB uses lowercase)
type DbExecutionStatus = 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'skipped';

const execStatusToDb = (status: RunStatus): DbExecutionStatus => {
  const map: Record<RunStatus, DbExecutionStatus> = {
    'NOT_RUN': 'not_run',
    'IN_PROGRESS': 'in_progress',
    'PASSED': 'passed',
    'FAILED': 'failed',
    'BLOCKED': 'blocked',
    'SKIPPED': 'skipped',
  };
  return map[status] || 'not_run';
};

const execStatusFromDb = (status: string | null): RunStatus => {
  const map: Record<string, RunStatus> = {
    'not_run': 'NOT_RUN',
    'in_progress': 'IN_PROGRESS',
    'passed': 'PASSED',
    'failed': 'FAILED',
    'blocked': 'BLOCKED',
    'skipped': 'SKIPPED',
  };
  return map[status || 'not_run'] || 'NOT_RUN';
};

// Partial test case for run display (subset of TMTestCase)
interface RunTestCaseInfo {
  id: string;
  key: string;
  title: string;
}

// Extended TMRun with partial test_case for list views
interface TMRunWithPartialCase extends Omit<TMRun, 'test_case'> {
  test_case?: RunTestCaseInfo;
}

// Helper to map DB row to TMRun
function mapDbRowToTMRun(row: any): TMRunWithPartialCase {
  return {
    id: row.id,
    cycle_id: row.cycle_scope?.cycle_id || '',
    scope_id: row.cycle_scope_id,
    case_id: row.cycle_scope?.test_case_id || '',
    run_number: row.run_number || 1,
    status: execStatusFromDb(row.status),
    executed_by: row.executed_by || '',
    started_at: row.started_at || '',
    completed_at: row.completed_at || undefined,
    duration_seconds: row.duration_seconds || undefined,
    notes: row.notes || undefined,
    environment: undefined,
    test_case: row.test_case,
    executor: row.executor,
    step_results: row.step_results,
  };
}

// Helper to map DB row to TMStepResult
function mapDbRowToTMStepResult(row: any): TMStepResult {
  return {
    id: row.id,
    run_id: row.test_run_id,
    step_id: row.test_step_id,
    step_number: row.step?.step_number || 0,
    status: execStatusFromDb(row.status),
    actual_result: row.actual_result || undefined,
    executed_at: row.executed_at || undefined,
    defect_id: row.defect_id || undefined,
    step: row.step,
    defect: row.defect,
  };
}

// ============================================================================
// FETCH RUNS FOR CYCLE
// ============================================================================

export function useTestRuns(cycleId: string | undefined) {
  return useQuery({
    queryKey: ['tm-runs', cycleId],
    queryFn: async (): Promise<TMRunWithPartialCase[]> => {
      if (!cycleId) return [];

      // First get the cycle scope items for this cycle
      const { data: scopeItems, error: scopeError } = await supabase
        .from('tm_cycle_scope')
        .select('id')
        .eq('cycle_id', cycleId);

      if (scopeError) throw scopeError;
      if (!scopeItems || scopeItems.length === 0) return [];

      const scopeIds = scopeItems.map(s => s.id);

      const { data, error } = await supabase
        .from('tm_test_runs')
        .select(`
          *,
          cycle_scope:tm_cycle_scope(
            id, cycle_id, test_case_id,
            test_case:tm_test_cases(id, case_key, title)
          ),
          executor:profiles(id, full_name, avatar_url)
        `)
        .in('cycle_scope_id', scopeIds)
        .order('started_at', { ascending: false });

      if (error) {
        console.error('Error fetching runs:', error);
        throw error;
      }

      return (data || []).map(row => ({
        ...mapDbRowToTMRun(row),
        test_case: row.cycle_scope?.test_case ? {
          id: row.cycle_scope.test_case.id,
          title: row.cycle_scope.test_case.title,
          key: row.cycle_scope.test_case.case_key,
        } : undefined,
      }));
    },
    enabled: !!cycleId,
  });
}

// ============================================================================
// FETCH SINGLE RUN WITH STEP RESULTS
// ============================================================================

export function useTestRun(runId: string | undefined) {
  return useQuery({
    queryKey: ['tm-run', runId],
    queryFn: async (): Promise<TMRunWithPartialCase | null> => {
      if (!runId) return null;

      // Fetch run
      const { data: run, error: runError } = await supabase
        .from('tm_test_runs')
        .select(`
          *,
          cycle_scope:tm_cycle_scope(
            id, cycle_id, test_case_id,
            test_case:tm_test_cases(id, case_key, title)
          ),
          executor:profiles(id, full_name, avatar_url)
        `)
        .eq('id', runId)
        .maybeSingle();

      if (runError) throw runError;
      if (!run) return null;

      // Fetch step results
      const { data: stepResults, error: stepsError } = await supabase
        .from('tm_step_results')
        .select(`
          *,
          step:tm_test_steps(*)
        `)
        .eq('test_run_id', runId);

      if (stepsError) throw stepsError;

      // Sort step results by step number
      const sortedResults = (stepResults || [])
        .map(mapDbRowToTMStepResult)
        .sort((a, b) => a.step_number - b.step_number);

      const mappedRun = mapDbRowToTMRun(run);
      
      return {
        ...mappedRun,
        test_case: run.cycle_scope?.test_case ? {
          id: run.cycle_scope.test_case.id,
          title: run.cycle_scope.test_case.title,
          key: run.cycle_scope.test_case.case_key,
        } : undefined,
        step_results: sortedResults,
      };
    },
    enabled: !!runId,
  });
}

// ============================================================================
// CREATE RUN (Start Execution)
// ============================================================================

export function useCreateRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      cycle_id: string;
      scope_id: string;
      case_id: string;
    }): Promise<TMRunWithPartialCase> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get next run number for this scope
      const { count } = await supabase
        .from('tm_test_runs')
        .select('*', { count: 'exact', head: true })
        .eq('cycle_scope_id', input.scope_id);

      const runNumber = (count || 0) + 1;

      // Create run
      const { data: run, error: runError } = await supabase
        .from('tm_test_runs')
        .insert({
          cycle_scope_id: input.scope_id,
          run_number: runNumber,
          status: 'in_progress',
          executed_by: user.id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (runError) throw runError;

      // Fetch case steps
      const { data: steps, error: stepsError } = await supabase
        .from('tm_test_steps')
        .select('*')
        .eq('test_case_id', input.case_id)
        .order('step_number', { ascending: true });

      if (stepsError) throw stepsError;

      // Create step results (all not_run)
      if (steps && steps.length > 0) {
        const stepResults = steps.map(step => ({
          test_run_id: run.id,
          test_step_id: step.id,
          status: 'not_run' as const,
        }));

        const { error: resultsError } = await supabase
          .from('tm_step_results')
          .insert(stepResults);

        if (resultsError) throw resultsError;
      }

      // Update scope status to in_progress
      await supabase
        .from('tm_cycle_scope')
        .update({ current_status: 'in_progress' })
        .eq('id', input.scope_id);

      return mapDbRowToTMRun({ ...run, cycle_scope: { cycle_id: input.cycle_id, test_case_id: input.case_id } });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-runs', variables.cycle_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycle-scope', variables.cycle_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycle', variables.cycle_id] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to start execution: ${error.message}`);
    },
  });
}

// ============================================================================
// UPDATE STEP RESULT
// ============================================================================

export function useUpdateStepResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      step_result_id: string;
      run_id: string;
      status: RunStatus;
      actual_result?: string;
    }): Promise<TMStepResult> => {
      const { data, error } = await supabase
        .from('tm_step_results')
        .update({
          status: execStatusToDb(input.status),
          actual_result: input.actual_result,
          executed_at: new Date().toISOString(),
        })
        .eq('id', input.step_result_id)
        .select()
        .single();

      if (error) throw error;
      return mapDbRowToTMStepResult(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-run', variables.run_id] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update step: ${error.message}`);
    },
  });
}

// ============================================================================
// BULK UPDATE STEPS
// ============================================================================

export function useBulkUpdateSteps() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      run_id: string;
      updates: Array<{
        step_result_id: string;
        status: RunStatus;
        actual_result?: string;
      }>;
    }): Promise<void> => {
      for (const update of input.updates) {
        await supabase
          .from('tm_step_results')
          .update({
            status: execStatusToDb(update.status),
            actual_result: update.actual_result,
            executed_at: new Date().toISOString(),
          })
          .eq('id', update.step_result_id);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-run', variables.run_id] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update steps: ${error.message}`);
    },
  });
}

// ============================================================================
// COMPLETE RUN (Finalize Execution)
// ============================================================================

export function useCompleteRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      run_id: string;
      cycle_id: string;
      scope_id: string;
    }): Promise<TMRunWithPartialCase> => {
      // Calculate final status from step results
      const { data: stepResults } = await supabase
        .from('tm_step_results')
        .select('status')
        .eq('test_run_id', input.run_id);

      // Status percolation: failed > blocked > passed > skipped > not_run
      let finalStatus: DbExecutionStatus = 'passed';
      
      if (stepResults) {
        const hasStatus = (status: DbExecutionStatus) => stepResults.some(r => r.status === status);
        
        if (hasStatus('failed')) {
          finalStatus = 'failed';
        } else if (hasStatus('blocked')) {
          finalStatus = 'blocked';
        } else if (hasStatus('not_run') || hasStatus('in_progress')) {
          finalStatus = 'not_run'; // Incomplete
        } else if (hasStatus('skipped') && !hasStatus('passed')) {
          finalStatus = 'skipped';
        }
      }

      // Get run start time to calculate duration
      const { data: run } = await supabase
        .from('tm_test_runs')
        .select('started_at')
        .eq('id', input.run_id)
        .single();

      const startedAt = run?.started_at ? new Date(run.started_at) : new Date();
      const durationSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);

      // Update run
      const { data: updatedRun, error: runError } = await supabase
        .from('tm_test_runs')
        .update({
          status: finalStatus,
          completed_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq('id', input.run_id)
        .select()
        .single();

      if (runError) throw runError;

      // Update scope with final status
      await supabase
        .from('tm_cycle_scope')
        .update({ current_status: finalStatus })
        .eq('id', input.scope_id);

      return mapDbRowToTMRun(updatedRun);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-run', variables.run_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-runs', variables.cycle_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycle-scope', variables.cycle_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycle', variables.cycle_id] });
      toast.success('Execution completed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete execution: ${error.message}`);
    },
  });
}

// ============================================================================
// ABORT RUN
// ============================================================================

export function useAbortRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      run_id: string;
      cycle_id: string;
      scope_id: string;
    }): Promise<void> => {
      // Update run to indicate it was aborted
      await supabase
        .from('tm_test_runs')
        .update({
          status: 'not_run',
          completed_at: new Date().toISOString(),
          notes: 'Execution aborted',
        })
        .eq('id', input.run_id);

      // Revert scope status
      await supabase
        .from('tm_cycle_scope')
        .update({ current_status: 'not_run' })
        .eq('id', input.scope_id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-run', variables.run_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-runs', variables.cycle_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycle-scope', variables.cycle_id] });
      toast.info('Execution aborted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to abort: ${error.message}`);
    },
  });
}

// ============================================================================
// LINK DEFECT TO STEP RESULT
// ============================================================================

export function useLinkDefectToStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      step_result_id: string;
      defect_id: string;
      run_id: string;
    }): Promise<void> => {
      // Note: defect_id column may not exist in tm_step_results
      // This would need to be handled via a linking table if not present
      console.warn('Link defect to step - check if defect_id column exists in tm_step_results');
      
      // For now, we can create a defect link record if such table exists
      // or update the step result if the column exists
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-run', variables.run_id] });
      toast.success('Defect linked to step');
    },
    onError: (error: Error) => {
      toast.error(`Failed to link defect: ${error.message}`);
    },
  });
}

// ============================================================================
// RE-RUN FAILED TESTS
// ============================================================================

export function useRerunFailed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { cycle_id: string }): Promise<number> => {
      // Get all failed/blocked scope items
      const { data: failedScope, error } = await supabase
        .from('tm_cycle_scope')
        .select('id')
        .eq('cycle_id', input.cycle_id)
        .in('current_status', ['failed', 'blocked']);

      if (error) throw error;

      // Reset their status to not_run
      if (failedScope && failedScope.length > 0) {
        const ids = failedScope.map(s => s.id);
        await supabase
          .from('tm_cycle_scope')
          .update({ current_status: 'not_run' })
          .in('id', ids);
      }

      return failedScope?.length || 0;
    },
    onSuccess: (count, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cycle-scope', variables.cycle_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycle', variables.cycle_id] });
      toast.success(`Reset ${count} failed test(s) for re-run`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to reset: ${error.message}`);
    },
  });
}

// ============================================================================
// GET MY ASSIGNED WORK
// ============================================================================

export function useMyWork(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tm-my-work', projectId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { assigned: [], recent: [] };

      // Get assigned scope items using the view
      // Filter by status in application logic to avoid type instantiation issues
      const { data: allAssigned, error: assignedError } = await supabase
        .from('v_tm_my_work')
        .select('*')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false })
        .limit(50);

      if (assignedError) {
        console.error('Error fetching assigned work:', assignedError);
      }

      // Filter for active statuses (v_tm_my_work uses 'status' not 'current_status')
      const assigned = (allAssigned || []).filter(
        item => ['not_run', 'in_progress', 'blocked'].includes(item.status || '')
      ).slice(0, 20);

      // Get recent runs by this user
      const { data: recent, error: recentError } = await supabase
        .from('tm_test_runs')
        .select(`
          *,
          cycle_scope:tm_cycle_scope(
            id, cycle_id,
            test_case:tm_test_cases(id, case_key, title),
            cycle:tm_test_cycles(id, cycle_key, name)
          )
        `)
        .eq('executed_by', user.id)
        .order('started_at', { ascending: false })
        .limit(10);

      if (recentError) {
        console.error('Error fetching recent runs:', recentError);
      }

      return {
        assigned: assigned || [],
        recent: (recent || []).map(r => ({
          ...mapDbRowToTMRun(r),
          test_case: r.cycle_scope?.test_case ? {
            ...r.cycle_scope.test_case,
            key: r.cycle_scope.test_case.case_key,
          } : undefined,
        })),
      };
    },
    enabled: true,
  });
}
