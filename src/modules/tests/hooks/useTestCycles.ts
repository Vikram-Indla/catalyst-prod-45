/**
 * useTestCycles Hook
 * CRUD operations for test cycles with permission gating
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { usePermission } from '@/hooks/usePermission';
import { toast } from 'sonner';
import {
  listTestCycles,
  getTestCycleById,
  createTestCycle,
  updateTestCycle,
  archiveTestCycle,
  getTestCycleEnvironments,
  TestCycleFilters,
  TestCycleInput,
  TestCyclePatch,
} from '../api/testCycles';

export interface CycleQueryState {
  filters: TestCycleFilters;
}

const defaultCycleQueryState: CycleQueryState = {
  filters: {},
};

/**
 * Hook for listing test cycles with CRUD operations
 */
export function useTestCycles(
  projectId: string | null,
  queryState: Partial<CycleQueryState> = {}
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const state = { ...defaultCycleQueryState, ...queryState };

  // Permission checks
  const { hasPermission: canView } = usePermission('test_cycles', 'view', 'program', projectId || undefined);
  const { hasPermission: canCreate } = usePermission('test_cycles', 'create', 'program', projectId || undefined);
  const { hasPermission: canEdit } = usePermission('test_cycles', 'edit', 'program', projectId || undefined);
  const { hasPermission: canDelete } = usePermission('test_cycles', 'delete', 'program', projectId || undefined);

  // List query
  const {
    data: cycles,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['test-cycles', projectId, state.filters],
    queryFn: async () => {
      if (!projectId) return [];
      return await listTestCycles(projectId, state.filters);
    },
    enabled: !!user && !!projectId && canView,
    staleTime: 15000,
  });

  // Environments for filter
  const { data: environments } = useQuery({
    queryKey: ['test-cycle-environments', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      return await getTestCycleEnvironments(projectId);
    },
    enabled: !!user && !!projectId,
    staleTime: 60000,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (input: TestCycleInput) => {
      if (!projectId || !user) throw new Error('Not authorized');
      return await createTestCycle(projectId, user.id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cycles', projectId] });
      queryClient.invalidateQueries({ queryKey: ['test-kpis', projectId] });
      toast.success('Test cycle created');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (patch: TestCyclePatch) => {
      if (!user) throw new Error('Not authorized');
      return await updateTestCycle(user.id, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cycles', projectId] });
      toast.success('Test cycle updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      if (!user) throw new Error('Not authorized');
      return await archiveTestCycle(id, user.id, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cycles', projectId] });
      queryClient.invalidateQueries({ queryKey: ['test-kpis', projectId] });
      toast.success('Test cycle archived');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    // Data
    cycles: cycles || [],
    environments: environments || [],

    // Loading/Error
    isLoading,
    error: error as Error | null,
    refetch,

    // Mutations
    createCycle: createMutation.mutateAsync,
    updateCycle: updateMutation.mutateAsync,
    archiveCycle: archiveMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isArchiving: archiveMutation.isPending,

    // Permissions
    canView,
    canCreate,
    canEdit,
    canDelete,
  };
}

/**
 * Hook for fetching a single test cycle
 */
export function useTestCycle(id: string | null) {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['test-cycle', id],
    queryFn: async () => {
      if (!id) return null;
      return await getTestCycleById(id);
    },
    enabled: !!user && !!id,
    staleTime: 10000,
  });

  return {
    cycle: data || null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
