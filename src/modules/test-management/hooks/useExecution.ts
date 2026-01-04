/**
 * Test Execution React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { executionsApi, type ListRunsParams } from '../api';
import type { TestRun, UpdateStepResultInput, BulkUpdateStepsInput, CompleteRunInput, ExecutionStatus } from '../api/types';
import { useToast } from '@/hooks/use-toast';
import { parseApiError } from '../api/client';
import { cycleKeys } from './useCycles';

// Query Keys
export const runKeys = {
  all: ['tm-runs'] as const,
  lists: () => [...runKeys.all, 'list'] as const,
  list: (params: ListRunsParams) => [...runKeys.lists(), params] as const,
  details: () => [...runKeys.all, 'detail'] as const,
  detail: (id: string) => [...runKeys.details(), id] as const,
  history: (scopeId: string) => [...runKeys.all, 'history', scopeId] as const,
};

/**
 * List test runs
 */
export function useTestRuns(params: ListRunsParams) {
  return useQuery({
    queryKey: runKeys.list(params),
    queryFn: () => executionsApi.list(params),
  });
}

/**
 * Get single test run with step results
 */
export function useTestRun(id: string | null) {
  return useQuery({
    queryKey: runKeys.detail(id || ''),
    queryFn: () => executionsApi.get(id!),
    enabled: !!id,
  });
}

/**
 * Get run history for a scope
 */
export function useRunHistory(scopeId: string | null) {
  return useQuery({
    queryKey: runKeys.history(scopeId || ''),
    queryFn: () => executionsApi.getHistory(scopeId!),
    enabled: !!scopeId,
  });
}

/**
 * Create a new test run
 */
export function useCreateRun() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (scopeId: string) => executionsApi.create({ scope_id: scopeId }),
    onSuccess: (newRun) => {
      queryClient.invalidateQueries({ queryKey: runKeys.lists() });
      queryClient.invalidateQueries({ queryKey: runKeys.history(newRun.scope_id) });
      // Also invalidate cycle data since scope status changes
      queryClient.invalidateQueries({ queryKey: cycleKeys.all });
      toast({ title: `Run #${newRun.run_number} started` });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to create run',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update a single step result with optimistic update
 */
export function useUpdateStepResult() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      runId,
      stepId,
      data,
    }: {
      runId: string;
      stepId: string;
      data: UpdateStepResultInput;
    }) => executionsApi.updateStep(runId, stepId, data),
    onMutate: async ({ runId, stepId, data }) => {
      await queryClient.cancelQueries({ queryKey: runKeys.detail(runId) });
      const previousRun = queryClient.getQueryData<TestRun>(runKeys.detail(runId));

      if (previousRun?.step_results) {
        queryClient.setQueryData(runKeys.detail(runId), {
          ...previousRun,
          step_results: previousRun.step_results.map((sr) =>
            sr.step_id === stepId ? { ...sr, ...data, executed_at: new Date().toISOString() } : sr
          ),
        });
      }

      return { previousRun };
    },
    onError: (error, { runId }, context) => {
      if (context?.previousRun) {
        queryClient.setQueryData(runKeys.detail(runId), context.previousRun);
      }
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to update step',
        description: apiError.message,
        variant: 'destructive',
      });
    },
    onSettled: (_, __, { runId }) => {
      queryClient.invalidateQueries({ queryKey: runKeys.detail(runId) });
      // Status percolation may have changed cycle stats
      queryClient.invalidateQueries({ queryKey: cycleKeys.all });
    },
  });
}

/**
 * Bulk update step results
 */
export function useBulkUpdateSteps() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ runId, updates }: { runId: string; updates: BulkUpdateStepsInput['updates'] }) =>
      executionsApi.bulkUpdateSteps(runId, { updates }),
    onSuccess: (_, { runId, updates }) => {
      queryClient.invalidateQueries({ queryKey: runKeys.detail(runId) });
      queryClient.invalidateQueries({ queryKey: cycleKeys.all });
      toast({ title: `${updates.length} step(s) updated` });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to update steps',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Complete a test run
 */
export function useCompleteRun() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ runId, data }: { runId: string; data?: CompleteRunInput }) =>
      executionsApi.complete(runId, data),
    onSuccess: (completedRun) => {
      queryClient.invalidateQueries({ queryKey: runKeys.detail(completedRun.id) });
      queryClient.invalidateQueries({ queryKey: runKeys.lists() });
      queryClient.invalidateQueries({ queryKey: cycleKeys.all });
      
      const statusLabel = completedRun.status.toUpperCase();
      toast({
        title: 'Run completed',
        description: `Final status: ${statusLabel}`,
      });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to complete run',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Re-run failed tests
 */
export function useRerunFailed() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ cycleId, scopeIds }: { cycleId: string; scopeIds?: string[] }) =>
      executionsApi.rerunFailed(cycleId, scopeIds),
    onSuccess: (result, { cycleId }) => {
      queryClient.invalidateQueries({ queryKey: cycleKeys.detail(cycleId) });
      queryClient.invalidateQueries({ queryKey: cycleKeys.stats(cycleId) });
      queryClient.invalidateQueries({ queryKey: runKeys.lists() });
      toast({
        title: 'Failed tests reset',
        description: `${result.reset_count} test(s) reset to Not Run`,
      });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to reset tests',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Quick action: Pass a step
 */
export function usePassStep() {
  const updateStep = useUpdateStepResult();

  return {
    ...updateStep,
    mutate: (runId: string, stepId: string, actualResult?: string) =>
      updateStep.mutate({
        runId,
        stepId,
        data: { status: 'passed' as ExecutionStatus, actual_result: actualResult },
      }),
    mutateAsync: (runId: string, stepId: string, actualResult?: string) =>
      updateStep.mutateAsync({
        runId,
        stepId,
        data: { status: 'passed' as ExecutionStatus, actual_result: actualResult },
      }),
  };
}

/**
 * Quick action: Fail a step
 */
export function useFailStep() {
  const updateStep = useUpdateStepResult();

  return {
    ...updateStep,
    mutate: (runId: string, stepId: string, actualResult?: string) =>
      updateStep.mutate({
        runId,
        stepId,
        data: { status: 'failed' as ExecutionStatus, actual_result: actualResult },
      }),
    mutateAsync: (runId: string, stepId: string, actualResult?: string) =>
      updateStep.mutateAsync({
        runId,
        stepId,
        data: { status: 'failed' as ExecutionStatus, actual_result: actualResult },
      }),
  };
}

/**
 * Quick action: Block a step
 */
export function useBlockStep() {
  const updateStep = useUpdateStepResult();

  return {
    ...updateStep,
    mutate: (runId: string, stepId: string, actualResult?: string) =>
      updateStep.mutate({
        runId,
        stepId,
        data: { status: 'blocked' as ExecutionStatus, actual_result: actualResult },
      }),
    mutateAsync: (runId: string, stepId: string, actualResult?: string) =>
      updateStep.mutateAsync({
        runId,
        stepId,
        data: { status: 'blocked' as ExecutionStatus, actual_result: actualResult },
      }),
  };
}
