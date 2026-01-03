/**
 * useTestCases Hook
 * CRUD operations for test cases using action pipeline
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { usePermission } from '@/hooks/usePermission';
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
import { createPipelineContext } from '../lib/actionPipeline';

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
  scopeType: 'program' | 'project',
  scopeId: string | null,
  queryState: Partial<QueryState> = {}
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const state = { ...defaultQueryState, ...queryState };

  // Permission checks
  const { hasPermission: canView } = usePermission('test_cases', 'view', 'program', scopeId || undefined);
  const { hasPermission: canCreate } = usePermission('test_cases', 'create', 'program', scopeId || undefined);
  const { hasPermission: canEdit } = usePermission('test_cases', 'edit', 'program', scopeId || undefined);
  const { hasPermission: canDelete } = usePermission('test_cases', 'delete', 'program', scopeId || undefined);

  // List query
  const {
    data: listData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['test-cases', scopeId, state],
    queryFn: async () => {
      if (!scopeId) return { data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 };
      return await listTestCases(scopeType, scopeId, state.filters, state.pagination, state.sort);
    },
    enabled: !!user && !!scopeId && canView,
    staleTime: 15000,
  });

  // Components for filter
  const { data: components } = useQuery({
    queryKey: ['test-case-components', scopeId],
    queryFn: async () => {
      if (!scopeId) return [];
      return await getTestCaseComponents(scopeType, scopeId);
    },
    enabled: !!user && !!scopeId,
    staleTime: 60000,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (input: TestCaseInput) => {
      if (!scopeId || !user) throw new Error('Not authorized');
      const context = createPipelineContext(
        user.id,
        scopeType,
        scopeId,
        scopeType === 'program' ? scopeId : null,
        scopeType === 'project' ? scopeId : null
      );
      const result = await createTestCase({
        projectId: scopeType === 'project' ? scopeId : '',
        input,
        context,
        queryClient,
      });
      return result.data;
    },
    onError: () => {}, // Error toast handled by pipeline
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (patch: TestCasePatch) => {
      if (!user || !scopeId) throw new Error('Not authorized');
      const context = createPipelineContext(
        user.id,
        scopeType,
        scopeId,
        scopeType === 'program' ? scopeId : null,
        scopeType === 'project' ? scopeId : null
      );
      const result = await updateTestCase({
        patch,
        context,
        queryClient,
      });
      return result.data;
    },
    onError: () => {}, // Error toast handled by pipeline
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user || !scopeId) throw new Error('Not authorized');
      const context = createPipelineContext(
        user.id,
        scopeType,
        scopeId,
        scopeType === 'program' ? scopeId : null,
        scopeType === 'project' ? scopeId : null
      );
      const result = await archiveTestCase({
        id,
        context,
        queryClient,
      });
      return result.data;
    },
    onError: () => {}, // Error toast handled by pipeline
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
