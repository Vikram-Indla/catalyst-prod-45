/**
 * Execution Session Hook - Fetches and manages test run data from Supabase
 * Replaces mock data with real database queries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useExecutionStore, StepDisplay, StepStatus } from '../stores/executionStore';
import { useEffect } from 'react';
import { toast } from 'sonner';

type DbExecutionStatus = 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'skipped';

const statusToDb = (status: StepStatus): DbExecutionStatus => {
  const map: Record<StepStatus, DbExecutionStatus> = {
    'pending': 'not_run',
    'passed': 'passed',
    'failed': 'failed',
    'blocked': 'blocked',
    'skipped': 'skipped',
  };
  return map[status] || 'not_run';
};

const statusFromDb = (status: string | null): StepStatus => {
  const map: Record<string, StepStatus> = {
    'not_run': 'pending',
    'in_progress': 'pending',
    'passed': 'passed',
    'failed': 'failed',
    'blocked': 'blocked',
    'skipped': 'skipped',
  };
  return map[status || 'not_run'] || 'pending';
};

export interface ExecutionSessionData {
  runId: string;
  testCaseId: string;
  testCaseKey: string;
  testCaseTitle: string;
  cycleId: string;
  cycleName: string;
  scopeId: string;
  steps: Array<{
    stepResultId: string;
    stepId: string;
    stepNumber: number;
    action: string;
    expectedResult: string;
    testData?: string;
    status: StepStatus;
    actualResult?: string;
    executedAt?: string;
  }>;
  executorName: string;
  startedAt: string;
}

/**
 * Fetches execution session data for a specific run
 */
export function useExecutionSession(runId: string | undefined) {
  const queryClient = useQueryClient();
  const { initSessionFromDb } = useExecutionStore();

  const query = useQuery({
    queryKey: ['execution-session', runId],
    queryFn: async (): Promise<ExecutionSessionData | null> => {
      if (!runId) return null;

      // Fetch the run with its cycle scope and test case
      const { data: run, error: runError } = await supabase
        .from('tm_test_runs')
        .select(`
          *,
          cycle_scope:tm_cycle_scope(
            id, cycle_id,
            test_case:tm_test_cases(id, case_key, title),
            cycle:tm_test_cycles(id, name, cycle_key)
          ),
          executor:profiles(id, full_name, avatar_url)
        `)
        .eq('id', runId)
        .maybeSingle();

      if (runError) throw runError;
      if (!run) return null;

      // Fetch step results with their step definitions
      const { data: stepResults, error: stepsError } = await supabase
        .from('tm_step_results')
        .select(`
          *,
          step:tm_test_steps(*)
        `)
        .eq('test_run_id', runId)
        .order('step->step_number', { ascending: true });

      if (stepsError) throw stepsError;

      const steps = (stepResults || [])
        .filter(sr => sr.step)
        .sort((a, b) => (a.step?.step_number || 0) - (b.step?.step_number || 0))
        .map(sr => ({
          stepResultId: sr.id,
          stepId: sr.test_step_id,
          stepNumber: sr.step?.step_number || 0,
          action: sr.step?.action || '',
          expectedResult: sr.step?.expected_result || '',
          testData: sr.step?.test_data || undefined,
          status: statusFromDb(sr.status),
          actualResult: sr.actual_result || undefined,
          executedAt: sr.executed_at || undefined,
        }));

      return {
        runId: run.id,
        testCaseId: run.cycle_scope?.test_case?.id || '',
        testCaseKey: run.cycle_scope?.test_case?.case_key || '',
        testCaseTitle: run.cycle_scope?.test_case?.title || '',
        cycleId: run.cycle_scope?.cycle_id || '',
        cycleName: run.cycle_scope?.cycle?.name || '',
        scopeId: run.cycle_scope?.id || '',
        steps,
        executorName: run.executor?.full_name || 'Unknown',
        startedAt: run.started_at || new Date().toISOString(),
      };
    },
    enabled: !!runId,
  });

  // Initialize store when data is loaded
  useEffect(() => {
    if (query.data) {
      const stepsDisplay: StepDisplay[] = query.data.steps.map(s => ({
        id: s.stepResultId, // Use step result ID as the display ID for easier updates
        number: s.stepNumber,
        title: `Step ${s.stepNumber}`,
        action: s.action,
        expected: s.expectedResult,
        status: s.status,
      }));

      initSessionFromDb(
        query.data.runId,
        query.data.testCaseId,
        query.data.testCaseKey,
        query.data.testCaseTitle,
        stepsDisplay,
        query.data.steps.map(s => ({
          stepResultId: s.stepResultId,
          stepId: s.stepId,
          status: s.status,
          actualResult: s.actualResult,
        }))
      );
    }
  }, [query.data, initSessionFromDb]);

  return {
    ...query,
    invalidate: () => queryClient.invalidateQueries({ queryKey: ['execution-session', runId] }),
  };
}

/**
 * Mutation to update a step result in Supabase
 */
export function useUpdateStepResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      stepResultId: string;
      runId: string;
      status: StepStatus;
      actualResult?: string;
    }) => {
      const { data, error } = await supabase
        .from('tm_step_results')
        .update({
          status: statusToDb(input.status),
          actual_result: input.actualResult,
          executed_at: new Date().toISOString(),
        })
        .eq('id', input.stepResultId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['execution-session', variables.runId] });
      queryClient.invalidateQueries({ queryKey: ['tm-run', variables.runId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to save step: ${error.message}`);
    },
  });
}

/**
 * Mutation to complete a run
 */
export function useCompleteExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      runId: string;
      cycleId: string;
      scopeId: string;
      notes?: string;
    }) => {
      // Calculate final status from step results
      const { data: stepResults } = await supabase
        .from('tm_step_results')
        .select('status')
        .eq('test_run_id', input.runId);

      let finalStatus: DbExecutionStatus = 'passed';

      if (stepResults) {
        const hasStatus = (s: DbExecutionStatus) => stepResults.some(r => r.status === s);

        if (hasStatus('failed')) {
          finalStatus = 'failed';
        } else if (hasStatus('blocked')) {
          finalStatus = 'blocked';
        } else if (hasStatus('not_run') || hasStatus('in_progress')) {
          finalStatus = 'not_run';
        } else if (hasStatus('skipped') && !hasStatus('passed')) {
          finalStatus = 'skipped';
        }
      }

      // Get run start time for duration calculation
      const { data: run } = await supabase
        .from('tm_test_runs')
        .select('started_at')
        .eq('id', input.runId)
        .maybeSingle();

      const startedAt = run?.started_at ? new Date(run.started_at) : new Date();
      const durationSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);

      // Update run
      const { error: runError } = await supabase
        .from('tm_test_runs')
        .update({
          status: finalStatus,
          completed_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
          notes: input.notes,
        })
        .eq('id', input.runId);

      if (runError) throw runError;

      // Update cycle scope status
      await supabase
        .from('tm_cycle_scope')
        .update({ current_status: finalStatus })
        .eq('id', input.scopeId);

      return { status: finalStatus };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['execution-session', variables.runId] });
      queryClient.invalidateQueries({ queryKey: ['tm-run', variables.runId] });
      queryClient.invalidateQueries({ queryKey: ['tm-runs', variables.cycleId] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycle-scope', variables.cycleId] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycle', variables.cycleId] });
      toast.success('Execution completed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete: ${error.message}`);
    },
  });
}

/**
 * Mutation to save execution progress (pause/exit)
 */
export function useSaveExecutionProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      runId: string;
      cycleId: string;
      notes?: string;
      elapsedSeconds: number;
    }) => {
      const { error } = await supabase
        .from('tm_test_runs')
        .update({
          notes: input.notes,
          duration_seconds: input.elapsedSeconds,
        })
        .eq('id', input.runId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['execution-session', variables.runId] });
      queryClient.invalidateQueries({ queryKey: ['tm-run', variables.runId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to save progress: ${error.message}`);
    },
  });
}

/**
 * Fetches next test case in the cycle queue
 */
export function useNextTestInQueue(cycleId: string | undefined, currentScopeId: string | undefined) {
  return useQuery({
    queryKey: ['next-test-queue', cycleId, currentScopeId],
    queryFn: async () => {
      if (!cycleId) return null;

      // Get all scope items in the cycle that haven't been executed
      const { data, error } = await supabase
        .from('tm_cycle_scope')
        .select(`
          id,
          test_case:tm_test_cases(id, case_key, title)
        `)
        .eq('cycle_id', cycleId)
        .in('current_status', ['not_run'])
        .order('added_at', { ascending: true })
        .limit(5);

      if (error) throw error;

      // Filter out current scope
      const queue = (data || []).filter(item => item.id !== currentScopeId);

      return queue.length > 0 ? queue[0] : null;
    },
    enabled: !!cycleId,
  });
}
