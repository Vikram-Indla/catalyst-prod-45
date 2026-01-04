/**
 * Test Cycles React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cyclesApi, type ListCyclesParams } from '../api';
import type { TestCycle, CreateCycleInput, UpdateCycleInput, CycleScope } from '../api/types';
import { useToast } from '@/hooks/use-toast';
import { parseApiError } from '../api/client';

// Query Keys
export const cycleKeys = {
  all: ['tm-cycles'] as const,
  lists: () => [...cycleKeys.all, 'list'] as const,
  list: (params: ListCyclesParams) => [...cycleKeys.lists(), params] as const,
  details: () => [...cycleKeys.all, 'detail'] as const,
  detail: (id: string) => [...cycleKeys.details(), id] as const,
  stats: (id: string) => [...cycleKeys.all, 'stats', id] as const,
};

/**
 * List test cycles
 */
export function useTestCycles(params: ListCyclesParams) {
  return useQuery({
    queryKey: cycleKeys.list(params),
    queryFn: () => cyclesApi.list(params),
    staleTime: 30000,
  });
}

/**
 * Get single test cycle with scope
 */
export function useTestCycle(id: string | null) {
  return useQuery({
    queryKey: cycleKeys.detail(id || ''),
    queryFn: () => cyclesApi.get(id!),
    enabled: !!id,
  });
}

/**
 * Get cycle statistics
 */
export function useCycleStats(id: string | null) {
  return useQuery({
    queryKey: cycleKeys.stats(id || ''),
    queryFn: () => cyclesApi.getStats(id!),
    enabled: !!id,
    refetchInterval: 30000, // Refresh stats every 30s for active cycles
  });
}

/**
 * Create test cycle
 */
export function useCreateTestCycle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateCycleInput) => cyclesApi.create(data),
    onSuccess: (newCycle) => {
      queryClient.invalidateQueries({ queryKey: cycleKeys.lists() });
      toast({
        title: 'Test cycle created',
        description: `${newCycle.cycle_key} has been created with ${newCycle.scope?.length || 0} test cases.`,
      });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to create test cycle',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update test cycle with optimistic updates
 */
export function useUpdateTestCycle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: UpdateCycleInput) => cyclesApi.update(data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: cycleKeys.detail(newData.id) });
      const previousCycle = queryClient.getQueryData<TestCycle>(cycleKeys.detail(newData.id));

      if (previousCycle) {
        queryClient.setQueryData(cycleKeys.detail(newData.id), {
          ...previousCycle,
          ...newData,
        });
      }

      return { previousCycle };
    },
    onError: (error, newData, context) => {
      if (context?.previousCycle) {
        queryClient.setQueryData(cycleKeys.detail(newData.id), context.previousCycle);
      }
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to update test cycle',
        description: apiError.message,
        variant: 'destructive',
      });
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: cycleKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: cycleKeys.lists() });
    },
  });
}

/**
 * Delete test cycle
 */
export function useDeleteTestCycle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => cyclesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cycleKeys.lists() });
      toast({ title: 'Test cycle deleted' });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to delete test cycle',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Add cases to cycle scope
 */
export function useAddCasesToCycle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      cycleId,
      caseIds,
      assignments,
    }: {
      cycleId: string;
      caseIds: string[];
      assignments?: { case_id: string; assigned_to: string }[];
    }) => cyclesApi.addCases(cycleId, caseIds, assignments),
    onSuccess: (_, { cycleId, caseIds }) => {
      queryClient.invalidateQueries({ queryKey: cycleKeys.detail(cycleId) });
      queryClient.invalidateQueries({ queryKey: cycleKeys.stats(cycleId) });
      toast({ title: `${caseIds.length} case(s) added to cycle` });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to add cases',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Remove cases from cycle scope
 */
export function useRemoveCasesFromCycle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ cycleId, scopeIds }: { cycleId: string; scopeIds: string[] }) =>
      cyclesApi.removeCases(cycleId, scopeIds),
    onSuccess: (_, { cycleId, scopeIds }) => {
      queryClient.invalidateQueries({ queryKey: cycleKeys.detail(cycleId) });
      queryClient.invalidateQueries({ queryKey: cycleKeys.stats(cycleId) });
      toast({ title: `${scopeIds.length} case(s) removed from cycle` });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to remove cases',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Assign tester to scope item
 */
export function useAssignTester() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      cycleId,
      scopeId,
      userId,
    }: {
      cycleId: string;
      scopeId: string;
      userId: string;
    }) => cyclesApi.assignTester(cycleId, scopeId, userId),
    onMutate: async ({ cycleId, scopeId, userId }) => {
      await queryClient.cancelQueries({ queryKey: cycleKeys.detail(cycleId) });
      const previousCycle = queryClient.getQueryData<TestCycle>(cycleKeys.detail(cycleId));

      if (previousCycle?.scope) {
        queryClient.setQueryData(cycleKeys.detail(cycleId), {
          ...previousCycle,
          scope: previousCycle.scope.map((s) =>
            s.id === scopeId ? { ...s, assigned_to: userId } : s
          ),
        });
      }

      return { previousCycle };
    },
    onError: (_, { cycleId }, context) => {
      if (context?.previousCycle) {
        queryClient.setQueryData(cycleKeys.detail(cycleId), context.previousCycle);
      }
    },
    onSettled: (_, __, { cycleId }) => {
      queryClient.invalidateQueries({ queryKey: cycleKeys.detail(cycleId) });
    },
  });
}

/**
 * Start a test cycle
 */
export function useStartCycle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => cyclesApi.start(id),
    onSuccess: (cycle) => {
      queryClient.invalidateQueries({ queryKey: cycleKeys.detail(cycle.id) });
      queryClient.invalidateQueries({ queryKey: cycleKeys.lists() });
      toast({ title: 'Test cycle started' });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to start cycle',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Complete a test cycle
 */
export function useCompleteCycle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => cyclesApi.complete(id),
    onSuccess: (cycle) => {
      queryClient.invalidateQueries({ queryKey: cycleKeys.detail(cycle.id) });
      queryClient.invalidateQueries({ queryKey: cycleKeys.lists() });
      toast({ title: 'Test cycle completed' });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to complete cycle',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Duplicate a test cycle
 */
export function useDuplicateCycle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, newTitle }: { id: string; newTitle?: string }) =>
      cyclesApi.duplicate(id, newTitle),
    onSuccess: (newCycle) => {
      queryClient.invalidateQueries({ queryKey: cycleKeys.lists() });
      toast({
        title: 'Cycle duplicated',
        description: `Created ${newCycle.cycle_key}`,
      });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to duplicate cycle',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}
