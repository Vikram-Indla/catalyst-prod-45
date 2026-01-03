/**
 * useTestCycles Hook
 * CRUD operations for test cycles using action pipeline
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { usePermission } from '@/hooks/usePermission';
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
import { createPipelineContext } from '../lib/actionPipeline';

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
  scopeType: 'program' | 'project',
  scopeId: string | null,
  queryState: Partial<CycleQueryState> = {}
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const state = { ...defaultCycleQueryState, ...queryState };

  // Permission checks
  const { hasPermission: canView } = usePermission('test_cycles', 'view', 'program', scopeId || undefined);
  const { hasPermission: canCreate } = usePermission('test_cycles', 'create', 'program', scopeId || undefined);
  const { hasPermission: canEdit } = usePermission('test_cycles', 'edit', 'program', scopeId || undefined);
  const { hasPermission: canDelete } = usePermission('test_cycles', 'delete', 'program', scopeId || undefined);

  // List query
  const {
    data: cycles,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['test-cycles', scopeId, state.filters],
    queryFn: async () => {
      if (!scopeId) return [];
      return await listTestCycles(scopeType, scopeId, state.filters);
    },
    enabled: !!user && !!scopeId && canView,
    staleTime: 15000,
  });

  // Environments for filter
  const { data: environments } = useQuery({
    queryKey: ['test-cycle-environments', scopeId],
    queryFn: async () => {
      if (!scopeId) return [];
      return await getTestCycleEnvironments(scopeType, scopeId);
    },
    enabled: !!user && !!scopeId,
    staleTime: 60000,
  });

  // Create context helper
  const getContext = () => {
    if (!user || !scopeId) throw new Error('Not authorized');
    return createPipelineContext(
      user.id,
      scopeType,
      scopeId,
      scopeType === 'program' ? scopeId : null,
      scopeType === 'project' ? scopeId : null
    );
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (input: TestCycleInput) => {
      const context = getContext();
      const result = await createTestCycle({ input, context, queryClient });
      return result.data;
    },
    onError: () => {}, // Error toast handled by pipeline
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (patch: TestCyclePatch) => {
      const context = getContext();
      const result = await updateTestCycle({ patch, context, queryClient });
      return result.data;
    },
    onError: () => {}, // Error toast handled by pipeline
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const context = getContext();
      const result = await archiveTestCycle({ id, reason, context, queryClient });
      return result.data;
    },
    onError: () => {}, // Error toast handled by pipeline
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
