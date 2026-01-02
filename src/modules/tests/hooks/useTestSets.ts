/**
 * useTestSets Hook
 * CRUD operations for test sets with permission gating
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { usePermission } from '@/hooks/usePermission';
import { toast } from 'sonner';
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
  projectId: string | null,
  programId: string | null,
  queryState: Partial<SetQueryState> = {}
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const state = { ...defaultSetQueryState, ...queryState };

  // Permission checks
  const { hasPermission: canView } = usePermission('test_sets', 'view', 'program', projectId || undefined);
  const { hasPermission: canCreate } = usePermission('test_sets', 'create', 'program', projectId || undefined);
  const { hasPermission: canEdit } = usePermission('test_sets', 'edit', 'program', projectId || undefined);
  const { hasPermission: canDelete } = usePermission('test_sets', 'delete', 'program', projectId || undefined);

  // List query
  const {
    data: sets,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['test-sets', projectId, state.filters],
    queryFn: async () => {
      if (!projectId) return [];
      return await listTestSets(projectId, state.filters);
    },
    enabled: !!user && !!projectId && canView,
    staleTime: 15000,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (input: TestSetInput) => {
      if (!projectId || !programId || !user) throw new Error('Not authorized');
      return await createTestSet(projectId, programId, user.id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-sets', projectId] });
      toast.success('Test set created');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (patch: TestSetPatch) => {
      if (!user) throw new Error('Not authorized');
      return await updateTestSet(user.id, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-sets', projectId] });
      toast.success('Test set updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authorized');
      return await archiveTestSet(id, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-sets', projectId] });
      toast.success('Test set archived');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Add cases mutation
  const addCasesMutation = useMutation({
    mutationFn: async ({ setId, caseIds }: { setId: string; caseIds: string[] }) => {
      if (!user) throw new Error('Not authorized');
      return await addCasesToSet(setId, caseIds, user.id);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['test-sets', projectId] });
      queryClient.invalidateQueries({ queryKey: ['test-set'] });
      toast.success(`Added ${result.count} case(s) to set`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Remove cases mutation
  const removeCasesMutation = useMutation({
    mutationFn: async ({ setId, caseIds }: { setId: string; caseIds: string[] }) => {
      return await removeCasesFromSet(setId, caseIds);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['test-sets', projectId] });
      queryClient.invalidateQueries({ queryKey: ['test-set'] });
      toast.success(`Removed ${result.count} case(s) from set`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
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
