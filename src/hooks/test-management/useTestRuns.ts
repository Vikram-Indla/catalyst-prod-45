import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TMRun, TMStepResult, RunStatus } from '@/types/test-management';
import { toast } from 'sonner';

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

export function useTestRuns(cycleId: string | undefined) {
  return useQuery({
    queryKey: ['tm-runs', cycleId],
    queryFn: async (): Promise<TMRun[]> => {
      if (!cycleId) return [];

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
        id: row.id,
        cycle_id: row.cycle_scope?.cycle_id || cycleId,
        scope_id: row.cycle_scope_id,
        case_id: row.cycle_scope?.test_case_id || '',
        run_number: row.run_number || 1,
        status: execStatusFromDb(row.status),
        executed_by: row.executed_by || '',
        started_at: row.started_at || '',
        completed_at: row.completed_at || undefined,
        duration_seconds: row.duration_seconds || undefined,
        notes: row.notes || undefined,
        test_case: row.cycle_scope?.test_case ? {
          id: row.cycle_scope.test_case.id,
          key: row.cycle_scope.test_case.case_key,
          title: row.cycle_scope.test_case.title,
        } : undefined,
        executor: row.executor,
      })) as TMRun[];
    },
    enabled: !!cycleId,
  });
}

export function useTestRun(runId: string | undefined) {
  return useQuery({
    queryKey: ['tm-run', runId],
    queryFn: async (): Promise<TMRun | null> => {
      if (!runId) return null;

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

      const { data: stepResults, error: stepsError } = await supabase
        .from('tm_step_results')
        .select(`
          *,
          step:tm_test_steps(*)
        `)
        .eq('test_run_id', runId);

      if (stepsError) throw stepsError;

      const sortedResults = (stepResults || [])
        .map(s => ({
          id: s.id,
          run_id: s.test_run_id,
          step_id: s.test_step_id,
          step_number: s.step?.step_number || 0,
          status: execStatusFromDb(s.status),
          actual_result: s.actual_result || undefined,
          executed_at: s.executed_at || undefined,
          step: s.step ? {
            id: s.step.id,
            case_id: s.step.test_case_id,
            step_number: s.step.step_number,
            action: s.step.action,
            test_data: s.step.test_data || undefined,
            expected_result: s.step.expected_result || '',
            created_at: s.step.created_at || '',
            updated_at: s.step.updated_at || '',
          } : undefined,
        }))
        .sort((a, b) => a.step_number - b.step_number) as TMStepResult[];

      return {
        id: run.id,
        cycle_id: run.cycle_scope?.cycle_id || '',
        scope_id: run.cycle_scope_id,
        case_id: run.cycle_scope?.test_case_id || '',
        run_number: run.run_number || 1,
        status: execStatusFromDb(run.status),
        executed_by: run.executed_by || '',
        started_at: run.started_at || '',
        completed_at: run.completed_at || undefined,
        duration_seconds: run.duration_seconds || undefined,
        notes: run.notes || undefined,
        test_case: run.cycle_scope?.test_case ? {
          id: run.cycle_scope.test_case.id,
          key: run.cycle_scope.test_case.case_key,
          title: run.cycle_scope.test_case.title,
        } : undefined,
        executor: run.executor,
        step_results: sortedResults,
      } as TMRun;
    },
    enabled: !!runId,
  });
}

export function useCreateRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { cycle_id: string; scope_id: string; case_id: string }): Promise<TMRun> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { count } = await supabase
        .from('tm_test_runs')
        .select('*', { count: 'exact', head: true })
        .eq('cycle_scope_id', input.scope_id);

      const runNumber = (count || 0) + 1;

      const { data: run, error: runError } = await supabase
        .from('tm_test_runs')
        .insert({
          cycle_scope_id: input.scope_id,
          run_number: runNumber,
          status: 'in_progress' as DbExecutionStatus,
          executed_by: user.id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (runError) throw runError;

      const { data: steps, error: stepsError } = await supabase
        .from('tm_test_steps')
        .select('*')
        .eq('test_case_id', input.case_id)
        .order('step_number', { ascending: true });

      if (stepsError) throw stepsError;

      if (steps && steps.length > 0) {
        const stepResults = steps.map(step => ({
          test_run_id: run.id,
          test_step_id: step.id,
          status: 'not_run' as DbExecutionStatus,
        }));

        const { error: resultsError } = await supabase
          .from('tm_step_results')
          .insert(stepResults);

        if (resultsError) throw resultsError;
      }

      await supabase
        .from('tm_cycle_scope')
        .update({ current_status: 'in_progress' as DbExecutionStatus })
        .eq('id', input.scope_id);

      return {
        id: run.id,
        cycle_id: input.cycle_id,
        scope_id: input.scope_id,
        case_id: input.case_id,
        run_number: runNumber,
        status: 'IN_PROGRESS',
        executed_by: user.id,
        started_at: run.started_at,
      } as TMRun;
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

export function useUpdateStepResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { step_result_id: string; run_id: string; status: RunStatus; actual_result?: string }): Promise<TMStepResult> => {
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
      return {
        id: data.id,
        run_id: data.test_run_id,
        step_id: data.test_step_id,
        step_number: 0,
        status: execStatusFromDb(data.status),
        actual_result: data.actual_result || undefined,
        executed_at: data.executed_at || undefined,
      } as TMStepResult;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-run', variables.run_id] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update step: ${error.message}`);
    },
  });
}

export function useBulkUpdateSteps() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { run_id: string; updates: Array<{ step_result_id: string; status: RunStatus; actual_result?: string }> }): Promise<void> => {
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

export function useCompleteRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { run_id: string; cycle_id: string; scope_id: string }): Promise<TMRun> => {
      const { data: stepResults } = await supabase
        .from('tm_step_results')
        .select('status')
        .eq('test_run_id', input.run_id);

      let finalStatus: DbExecutionStatus = 'passed';
      
      if (stepResults) {
        const hasStatus = (status: DbExecutionStatus) => stepResults.some(r => r.status === status);
        
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

      const { data: run } = await supabase
        .from('tm_test_runs')
        .select('started_at')
        .eq('id', input.run_id)
        .maybeSingle();

      const startedAt = run?.started_at ? new Date(run.started_at) : new Date();
      const durationSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);

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

      await supabase
        .from('tm_cycle_scope')
        .update({ current_status: finalStatus })
        .eq('id', input.scope_id);

      return {
        id: updatedRun.id,
        cycle_id: input.cycle_id,
        scope_id: input.scope_id,
        case_id: '',
        run_number: updatedRun.run_number || 1,
        status: execStatusFromDb(updatedRun.status),
        executed_by: updatedRun.executed_by || '',
        started_at: updatedRun.started_at || '',
        completed_at: updatedRun.completed_at || undefined,
        duration_seconds: updatedRun.duration_seconds || undefined,
      } as TMRun;
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

export function useAbortRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { run_id: string; cycle_id: string; scope_id: string }): Promise<void> => {
      await supabase
        .from('tm_test_runs')
        .update({
          status: 'not_run' as DbExecutionStatus,
          completed_at: new Date().toISOString(),
          notes: 'Execution aborted',
        })
        .eq('id', input.run_id);

      await supabase
        .from('tm_cycle_scope')
        .update({ current_status: 'not_run' as DbExecutionStatus })
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

export function useLinkDefectToStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { step_result_id: string; defect_id: string; run_id: string }): Promise<void> => {
      // Note: This assumes defect_id column exists in tm_step_results
      // If not, a linking table would be needed
      console.log('Linking defect', input.defect_id, 'to step result', input.step_result_id);
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

export function useRerunFailed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { cycle_id: string }): Promise<number> => {
      const { data: failedScope, error } = await supabase
        .from('tm_cycle_scope')
        .select('id')
        .eq('cycle_id', input.cycle_id)
        .in('current_status', ['failed', 'blocked']);

      if (error) throw error;

      if (failedScope && failedScope.length > 0) {
        const ids = failedScope.map(s => s.id);
        await supabase
          .from('tm_cycle_scope')
          .update({ current_status: 'not_run' as DbExecutionStatus })
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

export function useMyWork(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tm-my-work', projectId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { assigned: [], recent: [] };

      const { data: assigned, error: assignedError } = await supabase
        .from('tm_cycle_scope')
        .select(`
          *,
          test_case:tm_test_cases(id, case_key, title, priority:tm_case_priorities(*)),
          cycle:tm_test_cycles(id, cycle_key, name, status, project_id)
        `)
        .eq('assigned_to', user.id)
        .in('current_status', ['not_run', 'in_progress', 'blocked'])
        .order('added_at', { ascending: false })
        .limit(20);

      if (assignedError) {
        console.error('Error fetching assigned work:', assignedError);
      }

      const { data: recent, error: recentError } = await supabase
        .from('tm_test_runs')
        .select(`
          *,
          cycle_scope:tm_cycle_scope(
            cycle_id, test_case_id,
            test_case:tm_test_cases(id, case_key, title),
            cycle:tm_test_cycles(id, cycle_key, name, project_id)
          )
        `)
        .eq('executed_by', user.id)
        .order('started_at', { ascending: false })
        .limit(10);

      if (recentError) {
        console.error('Error fetching recent runs:', recentError);
      }

      let filteredAssigned = (assigned || []).map(a => ({
        ...a,
        test_case: a.test_case ? { ...a.test_case, key: a.test_case.case_key } : undefined,
        cycle: a.cycle ? { ...a.cycle, key: a.cycle.cycle_key } : undefined,
        status: execStatusFromDb(a.current_status),
      }));

      if (projectId) {
        filteredAssigned = filteredAssigned.filter(a => a.cycle?.project_id === projectId);
      }

      const mappedRecent = (recent || []).map(r => ({
        ...r,
        status: execStatusFromDb(r.status),
        test_case: r.cycle_scope?.test_case ? { 
          ...r.cycle_scope.test_case, 
          key: r.cycle_scope.test_case.case_key 
        } : undefined,
        cycle: r.cycle_scope?.cycle ? { 
          ...r.cycle_scope.cycle, 
          key: r.cycle_scope.cycle.cycle_key 
        } : undefined,
      }));

      return {
        assigned: filteredAssigned.filter(a => a.cycle),
        recent: mappedRecent,
      };
    },
    enabled: true,
  });
}
