/**
 * CATALYST TESTS - Case Operations Hook
 * Centralized hook for all test case CRUD operations
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { caseManagementService } from '@/services/caseManagementService';
import { bulkOperationsService } from '@/services/bulkOperationsService';
import { toast } from 'sonner';
import type {
  CopyTestCaseRequest,
  MoveTestCaseRequest,
  ArchiveTestCaseRequest,
  DeleteTestCaseRequest,
  RestoreTestCaseRequest,
} from '@/types/caseManagement';
import type {
  BulkEditRequest,
  BulkDeleteRequest,
  BulkOperationResult,
} from '@/types/bulkOperations';

export function useCaseOperations() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Copy case mutation
  const copyMutation = useMutation({
    mutationFn: (request: CopyTestCaseRequest) =>
      caseManagementService.copyTestCase(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      toast.success('Test case copied successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to copy case: ${error.message}`);
    },
  });

  // Move cases mutation
  const moveMutation = useMutation({
    mutationFn: (request: MoveTestCaseRequest) =>
      caseManagementService.moveTestCases(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      toast.success(`${data.moved_count} case(s) moved successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to move cases: ${error.message}`);
    },
  });

  // Archive cases mutation
  const archiveMutation = useMutation({
    mutationFn: (request: ArchiveTestCaseRequest) =>
      caseManagementService.archiveTestCases(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      toast.success(`${data.archived_count} case(s) archived. View in Archived folder.`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive cases: ${error.message}`);
    },
  });

  // Restore cases mutation
  const restoreMutation = useMutation({
    mutationFn: (request: RestoreTestCaseRequest) =>
      caseManagementService.restoreTestCases(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      toast.success(`${data.restored_count} case(s) restored successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore cases: ${error.message}`);
    },
  });

  // Delete cases mutation
  const deleteMutation = useMutation({
    mutationFn: (request: DeleteTestCaseRequest) =>
      caseManagementService.deleteTestCases(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      toast.success(`${data.deleted_count} case(s) deleted successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete cases: ${error.message}`);
    },
  });

  // Bulk edit mutation
  const bulkEditMutation = useMutation<BulkOperationResult, Error, BulkEditRequest>({
    mutationFn: (request: BulkEditRequest) =>
      bulkOperationsService.bulkEditCases(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      toast.success(`${data.success_count} of ${data.total_count} case(s) updated successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to bulk edit cases: ${error.message}`);
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation<BulkOperationResult, Error, BulkDeleteRequest>({
    mutationFn: (request: BulkDeleteRequest) =>
      bulkOperationsService.bulkDeleteCases(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      toast.success(`${data.success_count} of ${data.total_count} case(s) deleted successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to bulk delete cases: ${error.message}`);
    },
  });

  return {
    // Operations
    copyCase: copyMutation.mutate,
    moveCases: moveMutation.mutate,
    archiveCases: archiveMutation.mutate,
    restoreCases: restoreMutation.mutate,
    deleteCases: deleteMutation.mutate,
    bulkEdit: bulkEditMutation.mutate,
    bulkDelete: bulkDeleteMutation.mutate,

    // Loading states
    isCopying: copyMutation.isPending,
    isMoving: moveMutation.isPending,
    isArchiving: archiveMutation.isPending,
    isRestoring: restoreMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBulkEditing: bulkEditMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
    isLoading,
  };
}
