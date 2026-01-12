/**
 * Bulk Operations Hook
 * Handles bulk updates, moves, copies, and deletes for test cases
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { casesApi } from '../api';
import type { CaseStatus } from '../api/types';
import { toast } from 'sonner';
import { caseKeys, folderKeys } from './useCases';

interface BulkMoveInput {
  caseIds: string[];
  folderId: string;
}

interface BulkCopyInput {
  caseIds: string[];
  folderId: string;
}

interface BulkUpdateStatusInput {
  caseIds: string[];
  status: CaseStatus;
}

interface BulkUpdatePriorityInput {
  caseIds: string[];
  priorityId: string;
}

interface BulkAddTagsInput {
  caseIds: string[];
  tags: string[];
}

interface BulkDeleteInput {
  caseIds: string[];
}

/**
 * Bulk move test cases to a different folder
 */
export function useBulkMoveCases() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ caseIds, folderId }: BulkMoveInput) => {
      // Use the API's move method
      return casesApi.move(caseIds, folderId);
    },
    onSuccess: (_, { caseIds }) => {
      queryClient.invalidateQueries({ queryKey: caseKeys.all });
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
      toast.success(`Moved ${caseIds.length} test case(s)`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to move: ${error.message}`);
    },
  });
}

/**
 * Bulk copy test cases to a different folder
 */
export function useBulkCopyCases() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ caseIds, folderId }: BulkCopyInput) => {
      // Duplicate each case to the target folder
      const copies = caseIds.map((id) =>
        casesApi.duplicate(id, folderId)
      );
      return Promise.all(copies);
    },
    onSuccess: (results, { caseIds }) => {
      queryClient.invalidateQueries({ queryKey: caseKeys.all });
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
      toast.success(`Copied ${results.length} test case(s)`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to copy: ${error.message}`);
    },
  });
}

/**
 * Bulk update test case status
 */
export function useBulkUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ caseIds, status }: BulkUpdateStatusInput) => {
      const updates = caseIds.map((id) =>
        casesApi.update({ id, status })
      );
      return Promise.all(updates);
    },
    onSuccess: (_, { caseIds, status }) => {
      queryClient.invalidateQueries({ queryKey: caseKeys.all });
      toast.success(`Updated ${caseIds.length} case(s) to ${status}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}

/**
 * Bulk update test case priority
 */
export function useBulkUpdatePriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ caseIds, priorityId }: BulkUpdatePriorityInput) => {
      const updates = caseIds.map((id) =>
        casesApi.update({ id, priority_id: priorityId })
      );
      return Promise.all(updates);
    },
    onSuccess: (_, { caseIds }) => {
      queryClient.invalidateQueries({ queryKey: caseKeys.all });
      toast.success(`Updated priority for ${caseIds.length} case(s)`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update priority: ${error.message}`);
    },
  });
}

/**
 * Bulk add tags to test cases
 */
export function useBulkAddTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ caseIds, tags }: BulkAddTagsInput) => {
      // For each case, get current tags and merge with new ones
      const updates = caseIds.map(async (id) => {
        const currentCase = await casesApi.get(id);
        const existingTags = currentCase.tags || [];
        const mergedTags = [...new Set([...existingTags, ...tags])];
        return casesApi.update({ id, tags: mergedTags });
      });
      return Promise.all(updates);
    },
    onSuccess: (_, { caseIds, tags }) => {
      queryClient.invalidateQueries({ queryKey: caseKeys.all });
      toast.success(`Added ${tags.length} tag(s) to ${caseIds.length} case(s)`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add tags: ${error.message}`);
    },
  });
}

/**
 * Bulk delete (deprecate) test cases
 */
export function useBulkDeleteCases() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ caseIds }: BulkDeleteInput) => {
      // Use the bulk delete API
      return casesApi.bulkDelete(caseIds);
    },
    onSuccess: (_, { caseIds }) => {
      queryClient.invalidateQueries({ queryKey: caseKeys.all });
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
      toast.success(`Deleted ${caseIds.length} test case(s)`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}

/**
 * Combined hook for all bulk operations
 */
export function useBulkOperations() {
  const moveCases = useBulkMoveCases();
  const copyCases = useBulkCopyCases();
  const updateStatus = useBulkUpdateStatus();
  const updatePriority = useBulkUpdatePriority();
  const addTags = useBulkAddTags();
  const deleteCases = useBulkDeleteCases();

  const isLoading =
    moveCases.isPending ||
    copyCases.isPending ||
    updateStatus.isPending ||
    updatePriority.isPending ||
    addTags.isPending ||
    deleteCases.isPending;

  return {
    moveCases,
    copyCases,
    updateStatus,
    updatePriority,
    addTags,
    deleteCases,
    isLoading,
  };
}
