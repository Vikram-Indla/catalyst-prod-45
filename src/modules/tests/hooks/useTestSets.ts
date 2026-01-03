/**
 * useTestSets Hook
 * CRUD operations for test sets using action pipeline
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { usePermission } from '@/hooks/usePermission';
import {
  listTestSets,
  getTestSetById,
  createTestSet,
  updateTestSet,
  archiveTestSet,
  addCasesToSet,
  removeCasesFromSet,
  TestSetFilters,
  TestSetInput,
  TestSetPatch,
} from '../api/testSets';
import { createPipelineContext } from '../lib/actionPipeline';

export interface SetQueryState {
  filters: TestSetFilters;
}

const defaultSetQueryState: SetQueryState = {
  filters: {},
};

/**
 * Hook for listing test sets with CRUD operations
 */
export function useTestSets(
  scopeType: 'program' | 'project',
  scopeId: string | null,
  queryState: Partial<SetQueryState> = {}
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const state = { ...defaultSetQueryState, ...queryState };

  // Permission checks
  const { hasPermission: canView } = usePermission('test_sets', 'view', 'program', scopeId || undefined);
  const { hasPermission: canCreate } = usePermission('test_sets', 'create', 'program', scopeId || undefined);
  const { hasPermission: canEdit } = usePermission('test_sets', 'edit', 'program', scopeId || undefined);
  const { hasPermission: canDelete } = usePermission('test_sets', 'delete', 'program', scopeId || undefined);

  // List query
  const {
    data: sets,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['test-sets', scopeId, state.filters],
    queryFn: async () => {
      if (!scopeId) return [];
      return await listTestSets(scopeType, scopeId, state.filters);
    },
    enabled: !!user && !!scopeId && canView,
    staleTime: 15000,
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
    mutationFn: async (input: TestSetInput) => {
      const context = getContext();
      const result = await createTestSet({ input, context, queryClient });
      return result.data;
    },
    onError: () => {}, // Error toast handled by pipeline
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (patch: TestSetPatch) => {
      const context = getContext();
      const result = await updateTestSet({ patch, context, queryClient });
      return result.data;
    },
    onError: () => {}, // Error toast handled by pipeline
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const context = getContext();
      const result = await archiveTestSet({ id, context, queryClient });
      return result.data;
    },
    onError: () => {}, // Error toast handled by pipeline
  });

  // Add cases mutation
  const addCasesMutation = useMutation({
    mutationFn: async ({ setId, caseIds }: { setId: string; caseIds: string[] }) => {
      const context = getContext();
      const result = await addCasesToSet({ setId, caseIds, context, queryClient });
      return result.data;
    },
    onError: () => {}, // Error toast handled by pipeline
  });

  // Remove cases mutation
  const removeCasesMutation = useMutation({
    mutationFn: async ({ setId, caseIds }: { setId: string; caseIds: string[] }) => {
      const context = getContext();
      const result = await removeCasesFromSet({ setId, caseIds, context, queryClient });
      return result.data;
    },
    onError: () => {}, // Error toast handled by pipeline
  });

  return {
    // Data
    sets: sets || [],

    // Loading/Error
    isLoading,
    error: error as Error | null,
    refetch,

    // Mutations
    createSet: createMutation.mutateAsync,
    updateSet: updateMutation.mutateAsync,
    archiveSet: archiveMutation.mutateAsync,
    addCasesToSet: addCasesMutation.mutateAsync,
    removeCasesFromSet: removeCasesMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isArchiving: archiveMutation.isPending,
    isAddingCases: addCasesMutation.isPending,
    isRemovingCases: removeCasesMutation.isPending,

    // Permissions
    canView,
    canCreate,
    canEdit,
    canDelete,
  };
}

/**
 * Hook for fetching a single test set
 */
export function useTestSet(id: string | null) {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['test-set', id],
    queryFn: async () => {
      if (!id) return null;
      return await getTestSetById(id);
    },
    enabled: !!user && !!id,
    staleTime: 10000,
  });

  return {
    set: data || null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
