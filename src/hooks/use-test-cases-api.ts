/**
 * Test Cases API Hook
 * Provides React Query integration for test cases with fallback to mock data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { casesApi } from '@/modules/test-management/api';
import type { ListCasesParams } from '@/modules/test-management/api/cases';
import type { TestCase as ApiTestCase, CreateTestCaseInput } from '@/modules/test-management/api/types';
import { testCasesData, type TestCase as UITestCase } from '@/data/testCasesData';
import { apiToUITestCases, apiToUITestCase } from '@/components/releases/test-cases/utils/testCaseAdapter';
import { parseApiError } from '@/modules/test-management/api/client';
import { toast } from 'sonner';

// Query keys
export const testCasesKeys = {
  all: ['test-cases'] as const,
  list: (params: Partial<ListCasesParams>) => [...testCasesKeys.all, 'list', params] as const,
  detail: (id: string) => [...testCasesKeys.all, 'detail', id] as const,
};

export interface UseTestCasesOptions {
  projectId: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  type?: string;
  folderId?: string;
  enabled?: boolean;
  useMockFallback?: boolean;
}

export interface UseTestCasesResult {
  testCases: UITestCase[];
  total: number;
  totalPages: number;
  currentPage: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isMockData: boolean;
}

/**
 * Hook to fetch test cases with optional mock data fallback
 */
export function useTestCasesApi(options: UseTestCasesOptions): UseTestCasesResult {
  const {
    projectId,
    page = 1,
    limit = 15,
    search,
    status,
    priority,
    type,
    folderId,
    enabled = true,
    useMockFallback = true,
  } = options;

  const queryResult = useQuery({
    queryKey: testCasesKeys.list({ project_id: projectId, page, limit }),
    queryFn: async () => {
      const params: ListCasesParams = {
        project_id: projectId,
        page,
        limit,
        search: search || undefined,
        status: (status as 'draft' | 'ready' | 'approved' | 'needs_update' | 'deprecated') || undefined,
        folder_id: folderId,
      };
      return casesApi.list(params);
    },
    enabled: enabled && !!projectId,
    staleTime: 30000,
    retry: 1,
  });

  // Determine if we should use mock data
  const useMock = useMockFallback && (queryResult.isError || !projectId);

  // Apply client-side filtering to mock data if needed
  const filteredMockData = useMock
    ? testCasesData.filter(tc => {
        if (search) {
          const q = search.toLowerCase();
          if (!tc.id.toLowerCase().includes(q) && !tc.title.toLowerCase().includes(q)) {
            return false;
          }
        }
        if (status && tc.status !== status) return false;
        if (priority && tc.priority !== priority) return false;
        if (type && tc.type !== type) return false;
        return true;
      })
    : [];

  // Transform API data or use mock
  const testCases: UITestCase[] = useMock
    ? filteredMockData.slice((page - 1) * limit, page * limit)
    : queryResult.data
      ? apiToUITestCases(queryResult.data.data)
      : [];

  const total = useMock
    ? filteredMockData.length
    : queryResult.data?.pagination.total ?? 0;

  const totalPages = useMock
    ? Math.ceil(filteredMockData.length / limit)
    : queryResult.data?.pagination.totalPages ?? 1;

  return {
    testCases,
    total,
    totalPages,
    currentPage: page,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError && !useMockFallback,
    error: queryResult.error as Error | null,
    refetch: queryResult.refetch,
    isMockData: useMock,
  };
}

/**
 * Hook to create a new test case
 */
export function useCreateTestCaseApi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTestCaseInput) => {
      return casesApi.create(data);
    },
    onSuccess: (newCase) => {
      queryClient.invalidateQueries({ queryKey: testCasesKeys.all });
      toast.success(`Test case ${newCase.case_key} created`);
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast.error('Failed to create test case', {
        description: apiError.message,
      });
    },
  });
}

/**
 * Hook to delete test cases
 */
export function useDeleteTestCasesApi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      return casesApi.bulkDelete(ids);
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: testCasesKeys.all });
      toast.success(`${ids.length} test case(s) deleted`);
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast.error('Failed to delete test cases', {
        description: apiError.message,
      });
    },
  });
}

/**
 * Hook to duplicate a test case
 */
export function useDuplicateTestCaseApi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, targetFolderId }: { id: string; targetFolderId?: string }) => {
      return casesApi.duplicate(id, targetFolderId);
    },
    onSuccess: (newCase) => {
      queryClient.invalidateQueries({ queryKey: testCasesKeys.all });
      toast.success(`Duplicated as ${newCase.case_key}`);
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast.error('Failed to duplicate test case', {
        description: apiError.message,
      });
    },
  });
}

/**
 * Hook to get a single test case detail
 */
export function useTestCaseDetail(id: string | undefined) {
  return useQuery({
    queryKey: testCasesKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('No ID provided');
      const testCase = await casesApi.get(id);
      return apiToUITestCase(testCase);
    },
    enabled: !!id,
    staleTime: 30000,
  });
}

/**
 * Hook to update a test case
 */
export function useUpdateTestCaseApi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      title?: string;
      description?: string;
      preconditions?: string;
      status?: 'draft' | 'ready' | 'approved' | 'deprecated';
      priority_id?: string;
      type_id?: string;
      tags?: string[];
      steps?: { step_number: number; action: string; expected_result: string; test_data?: string }[];
    }) => {
      return casesApi.update(data);
    },
    onSuccess: (updatedCase) => {
      queryClient.invalidateQueries({ queryKey: testCasesKeys.all });
      queryClient.invalidateQueries({ queryKey: testCasesKeys.detail(updatedCase.id) });
      toast.success(`Test case ${updatedCase.case_key} updated`);
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast.error('Failed to update test case', {
        description: apiError.message,
      });
    },
  });
}

/**
 * Hook to execute a test case (start a new run)
 */
export function useExecuteTestCaseApi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ caseId, cycleId }: { caseId: string; cycleId?: string }) => {
      // For now, just toast - full execution will be implemented with test runs
      return { caseId, cycleId };
    },
    onSuccess: ({ caseId }) => {
      queryClient.invalidateQueries({ queryKey: testCasesKeys.all });
      toast.success(`Starting execution for test case...`);
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast.error('Failed to start execution', {
        description: apiError.message,
      });
    },
  });
}
