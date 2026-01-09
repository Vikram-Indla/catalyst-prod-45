/**
 * Test Cases React Query Hooks
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { casesApi, foldersApi, type ListCasesParams } from '../api';
import type { TestCase, CreateTestCaseInput, UpdateTestCaseInput, Folder, CreateFolderInput, TestStep, PaginatedResponse } from '../api/types';
import { useToast } from '@/hooks/use-toast';
import { parseApiError } from '../api/client';

// Query Keys
export const caseKeys = {
  all: ['tm-cases'] as const,
  lists: () => [...caseKeys.all, 'list'] as const,
  list: (params: ListCasesParams) => [...caseKeys.lists(), params] as const,
  details: () => [...caseKeys.all, 'detail'] as const,
  detail: (id: string) => [...caseKeys.details(), id] as const,
  steps: (caseId: string) => [...caseKeys.all, 'steps', caseId] as const,
  templates: (projectId: string) => [...caseKeys.all, 'templates', projectId] as const,
};

export const folderKeys = {
  all: ['tm-folders'] as const,
  lists: () => [...folderKeys.all, 'list'] as const,
  list: (projectId: string, parentId?: string | null) => [...folderKeys.lists(), projectId, parentId] as const,
  tree: (projectId: string) => [...folderKeys.all, 'tree', projectId] as const,
  detail: (id: string) => [...folderKeys.all, 'detail', id] as const,
};

// ============ Test Cases Hooks ============

/**
 * List test cases with filtering and pagination
 */
export function useTestCases(params: ListCasesParams) {
  return useQuery({
    queryKey: caseKeys.list(params),
    queryFn: () => casesApi.list(params),
    staleTime: 30000,
  });
}

/**
 * Infinite scroll test cases
 */
export function useInfiniteTestCases(params: Omit<ListCasesParams, 'page'>) {
  return useInfiniteQuery({
    queryKey: [...caseKeys.list({ ...params, page: 0 }), 'infinite'],
    queryFn: ({ pageParam = 1 }) => casesApi.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });
}

/**
 * Get single test case
 */
export function useTestCase(id: string | null) {
  return useQuery({
    queryKey: caseKeys.detail(id || ''),
    queryFn: () => casesApi.get(id!),
    enabled: !!id,
  });
}

/**
 * Get test case steps
 */
export function useTestCaseSteps(caseId: string | null) {
  return useQuery({
    queryKey: caseKeys.steps(caseId || ''),
    queryFn: () => casesApi.getSteps(caseId!),
    enabled: !!caseId,
  });
}

/**
 * List template test cases
 */
export function useTemplates(projectId: string) {
  return useQuery({
    queryKey: caseKeys.templates(projectId),
    queryFn: () => casesApi.list({ project_id: projectId, is_template: true }),
    select: (data) => data.data,
  });
}

/**
 * Create test case mutation
 */
export function useCreateTestCase(options?: { silent?: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const silent = options?.silent ?? false;

  return useMutation({
    mutationFn: (data: CreateTestCaseInput) => casesApi.create(data),
    onSuccess: (newCase) => {
      queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
      if (!silent) {
        toast({
          title: 'Test case created',
          description: `${newCase.case_key} has been created successfully.`,
        });
      }
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to create test case',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update test case mutation with optimistic updates
 */
export function useUpdateTestCase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: UpdateTestCaseInput) => casesApi.update(data),
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: caseKeys.detail(newData.id) });

      // Snapshot previous value
      const previousCase = queryClient.getQueryData<TestCase>(caseKeys.detail(newData.id));

      // Optimistically update
      if (previousCase) {
        queryClient.setQueryData(caseKeys.detail(newData.id), {
          ...previousCase,
          ...newData,
        });
      }

      return { previousCase };
    },
    onError: (error, newData, context) => {
      // Rollback on error
      if (context?.previousCase) {
        queryClient.setQueryData(caseKeys.detail(newData.id), context.previousCase);
      }
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to update test case',
        description: apiError.message,
        variant: 'destructive',
      });
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: caseKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
    },
  });
}

/**
 * Delete test case mutation
 */
export function useDeleteTestCase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => casesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
      toast({ title: 'Test case deleted' });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to delete test case',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Bulk delete test cases
 */
export function useBulkDeleteTestCases() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (ids: string[]) => casesApi.bulkDelete(ids),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
      toast({ title: `${ids.length} test case(s) deleted` });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to delete test cases',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Duplicate test case
 */
export function useDuplicateTestCase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, targetFolderId }: { id: string; targetFolderId?: string }) =>
      casesApi.duplicate(id, targetFolderId),
    onSuccess: (newCase) => {
      queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
      toast({
        title: 'Test case duplicated',
        description: `Created ${newCase.case_key}`,
      });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to duplicate test case',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Move test cases to folder
 */
export function useMoveTestCases() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ ids, folderId }: { ids: string[]; folderId: string | null }) =>
      casesApi.move(ids, folderId),
    onSuccess: (_, { ids }) => {
      queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
      toast({ title: `${ids.length} case(s) moved` });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to move test cases',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update test case steps
 */
export function useUpdateTestCaseSteps() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      caseId,
      steps,
    }: {
      caseId: string;
      steps: Omit<TestStep, 'id' | 'case_id' | 'created_at' | 'updated_at'>[];
    }) => casesApi.updateSteps(caseId, steps),
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: caseKeys.steps(caseId) });
      queryClient.invalidateQueries({ queryKey: caseKeys.detail(caseId) });
      toast({ title: 'Steps updated' });
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

// ============ Folders Hooks ============

/**
 * Get folder tree
 */
export function useFolderTree(projectId: string) {
  return useQuery({
    queryKey: folderKeys.tree(projectId),
    queryFn: () => foldersApi.getTree(projectId),
    enabled: !!projectId,
    staleTime: 60000,
  });
}

/**
 * Get folders list
 */
export function useFolders(projectId: string, parentId?: string | null) {
  return useQuery({
    queryKey: folderKeys.list(projectId, parentId),
    queryFn: () => foldersApi.list({ project_id: projectId, parent_id: parentId }),
    enabled: !!projectId,
  });
}

/**
 * Create folder
 */
export function useCreateFolder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateFolderInput) => foldersApi.create(data),
    onSuccess: (newFolder, variables) => {
      queryClient.invalidateQueries({ queryKey: folderKeys.tree(variables.project_id) });
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
      toast({ title: `Folder "${newFolder.name}" created` });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to create folder',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update folder
 */
export function useUpdateFolder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      projectId,
      ...data
    }: { id: string; projectId: string } & Partial<Omit<CreateFolderInput, 'project_id'>>) =>
      foldersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: folderKeys.tree(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to update folder',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete folder
 */
export function useDeleteFolder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, moveCasesTo }: { id: string; moveCasesTo?: string | null }) =>
      foldersApi.delete(id, moveCasesTo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
      queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
      toast({ title: 'Folder deleted' });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to delete folder',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Move folder
 */
export function useMoveFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, newParentId }: { id: string; newParentId: string | null }) =>
      foldersApi.move(id, newParentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
    },
  });
}
