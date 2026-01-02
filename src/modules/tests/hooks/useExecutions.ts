/**
 * useExecutions Hook
 * CRUD operations for test executions with permission gating
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { usePermission } from '@/hooks/usePermission';
import { toast } from 'sonner';
import {
  listExecutions,
  getExecutionById,
  updateExecutionStatus,
  bulkUpdateExecutionStatus,
  assignExecution,
  getCycleExecutionStats,
  createDefectFromFailure,
  ExecutionFilters,
  ExecutionStatusUpdate,
  DefectFromFailureInput,
} from '../api/executions';

export interface ExecutionQueryState {
  filters: ExecutionFilters;
}

const defaultExecutionQueryState: ExecutionQueryState = {
  filters: {},
};

/**
 * Hook for listing executions with operations
 */
export function useExecutions(
  projectId: string | null,
  queryState: Partial<ExecutionQueryState> = {}
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const state = { ...defaultExecutionQueryState, ...queryState };

  // Permission checks
  const { hasPermission: canView } = usePermission('test_executions', 'view', 'program', projectId || undefined);
  const { hasPermission: canEdit } = usePermission('test_executions', 'edit', 'program', projectId || undefined);

  // List query
  const {
    data: executions,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['test-executions', projectId, state.filters],
    queryFn: async () => {
      if (!projectId) return [];
      return await listExecutions(projectId, state.filters);
    },
    enabled: !!user && !!projectId && canView,
    staleTime: 10000,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, update }: { id: string; update: ExecutionStatusUpdate }) => {
      if (!user) throw new Error('Not authorized');
      return await updateExecutionStatus(id, user.id, update);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-executions', projectId] });
      queryClient.invalidateQueries({ queryKey: ['test-kpis', projectId] });
      queryClient.invalidateQueries({ queryKey: ['test-cycles', projectId] });
      toast.success('Execution updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      if (!user) throw new Error('Not authorized');
      return await bulkUpdateExecutionStatus(ids, user.id, status);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['test-executions', projectId] });
      queryClient.invalidateQueries({ queryKey: ['test-kpis', projectId] });
      toast.success(`Updated ${result.count} executions`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: async ({ id, assigneeId }: { id: string; assigneeId: string }) => {
      return await assignExecution(id, assigneeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-executions', projectId] });
      toast.success('Execution assigned');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Create defect from failure mutation
  const createDefectMutation = useMutation({
    mutationFn: async ({ executionId, input }: { executionId: string; input: DefectFromFailureInput }) => {
      if (!user || !projectId) throw new Error('Not authorized');
      return await createDefectFromFailure(executionId, user.id, projectId, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-executions', projectId] });
      toast.success('Defect created from failure');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    // Data
    executions: executions || [],

    // Loading/Error
    isLoading,
    error: error as Error | null,
    refetch,

    // Mutations
    updateStatus: updateStatusMutation.mutateAsync,
    bulkUpdateStatus: bulkUpdateMutation.mutateAsync,
    assignExecution: assignMutation.mutateAsync,
    createDefectFromFailure: createDefectMutation.mutateAsync,
    isUpdating: updateStatusMutation.isPending,
    isBulkUpdating: bulkUpdateMutation.isPending,
    isAssigning: assignMutation.isPending,
    isCreatingDefect: createDefectMutation.isPending,

    // Permissions
    canView,
    canEdit,
  };
}

/**
 * Hook for fetching a single execution
 */
export function useExecution(id: string | null) {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['test-execution', id],
    queryFn: async () => {
      if (!id) return null;
      return await getExecutionById(id);
    },
    enabled: !!user && !!id,
    staleTime: 5000,
  });

  return {
    execution: data || null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook for cycle execution statistics
 */
export function useCycleExecutionStats(cycleId: string | null) {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['cycle-execution-stats', cycleId],
    queryFn: async () => {
      if (!cycleId) return null;
      return await getCycleExecutionStats(cycleId);
    },
    enabled: !!user && !!cycleId,
    staleTime: 10000,
  });

  return {
    stats: data || null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
