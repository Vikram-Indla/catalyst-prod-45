/**
 * useTestCases Hook
 * CRUD operations for test cases with permission gating
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { usePermission } from '@/hooks/usePermission';
import { toast } from 'sonner';
import {
  listTestCases,
  getTestCaseById,
  createTestCase,
  updateTestCase,
  archiveTestCase,
  getTestCaseComponents,
  TestCaseFilters,
  PaginationParams,
  SortParams,
  TestCaseInput,
  TestCasePatch,
} from '../api/testCases';

export interface QueryState {
  filters: TestCaseFilters;
  pagination: PaginationParams;
  sort: SortParams;
}

const defaultQueryState: QueryState = {
  filters: {},
  pagination: { page: 1, pageSize: 50 },
  sort: { field: 'created_at', direction: 'desc' },
};

/**
 * Hook for listing test cases with CRUD operations
 */
export function useTestCases(
  projectId: string | null,
  queryState: Partial<QueryState> = {}
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const state = { ...defaultQueryState, ...queryState };

  // Permission checks
  const { hasPermission: canView } = usePermission('test_cases', 'view', 'program', projectId || undefined);
  const { hasPermission: canCreate } = usePermission('test_cases', 'create', 'program', projectId || undefined);
  const { hasPermission: canEdit } = usePermission('test_cases', 'edit', 'program', projectId || undefined);
  const { hasPermission: canDelete } = usePermission('test_cases', 'delete', 'program', projectId || undefined);

  // List query
  const {
    data: listData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['test-cases', projectId, state],
    queryFn: async () => {
      if (!projectId) return { data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 };
      return await listTestCases(projectId, state.filters, state.pagination, state.sort);
    },
    enabled: !!user && !!projectId && canView,
    staleTime: 15000,
  });

  // Components for filter
  const { data: components } = useQuery({
    queryKey: ['test-case-components', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      return await getTestCaseComponents(projectId);
    },
    enabled: !!user && !!projectId,
    staleTime: 60000,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (input: TestCaseInput) => {
      if (!projectId || !user) throw new Error('Not authorized');
      return await createTestCase(projectId, user.id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', projectId] });
      queryClient.invalidateQueries({ queryKey: ['test-kpis', projectId] });
      toast.success('Test case created');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (patch: TestCasePatch) => {
      if (!user) throw new Error('Not authorized');
      return await updateTestCase(user.id, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', projectId] });
      toast.success('Test case updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authorized');
      return await archiveTestCase(id, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', projectId] });
      queryClient.invalidateQueries({ queryKey: ['test-kpis', projectId] });
      toast.success('Test case archived');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    // Data
    testCases: listData?.data || [],
    total: listData?.total || 0,
    page: listData?.page || 1,
    pageSize: listData?.pageSize || 50,
    totalPages: listData?.totalPages || 0,
    components: components || [],

    // Loading/Error
    isLoading,
    error: error as Error | null,
    refetch,

    // Mutations
    createTestCase: createMutation.mutateAsync,
    updateTestCase: updateMutation.mutateAsync,
    archiveTestCase: archiveMutation.mutateAsync,
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
 * Hook for fetching a single test case
 */
export function useTestCase(id: string | null) {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['test-case', id],
    queryFn: async () => {
      if (!id) return null;
      return await getTestCaseById(id);
    },
    enabled: !!user && !!id,
    staleTime: 10000,
  });

  return {
    testCase: data || null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
