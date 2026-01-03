/**
 * Test Case Bulk Operations Hook
 * Handles bulk move, copy, archive, delete with audit logging
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { logAuditEntry } from '@/lib/auditLogger';
import { toast } from 'sonner';

const supabase = supabaseClient as any;

export type BulkOperationType = 
  | 'bulk_move'
  | 'bulk_copy'
  | 'bulk_archive'
  | 'bulk_delete'
  | 'bulk_status_change'
  | 'bulk_label_add'
  | 'bulk_label_remove';

export interface BulkOperationResult {
  operationId: string;
  successCount: number;
  failureCount: number;
  errors: string[];
}

interface BulkMoveInput {
  caseIds: string[];
  targetFolderId: string | null;
}

interface BulkCopyInput {
  caseIds: string[];
  targetFolderId: string | null;
  targetProgramId?: string;
}

interface BulkArchiveInput {
  caseIds: string[];
}

interface BulkDeleteInput {
  caseIds: string[];
}

type TestCaseStatusType = 'draft' | 'under_review' | 'approved' | 'published' | 'deprecated';

interface BulkStatusChangeInput {
  caseIds: string[];
  newStatus: TestCaseStatusType;
}

interface BulkLabelInput {
  caseIds: string[];
  labels: string[];
}

async function createBulkOperation(
  operationType: BulkOperationType,
  caseIds: string[],
  executedBy: string,
  operationData?: Record<string, unknown>
): Promise<string> {
  const { data, error } = await supabase
    .from('test_case_bulk_operations')
    .insert([{
      operation_type: operationType,
      case_ids: caseIds,
      executed_by: executedBy,
      operation_data: operationData ? JSON.parse(JSON.stringify(operationData)) : null,
      status: 'in_progress',
    }])
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

async function updateBulkOperation(
  operationId: string,
  successCount: number,
  failureCount: number,
  errorMessages: string[]
): Promise<void> {
  await supabase
    .from('test_case_bulk_operations')
    .update({
      status: failureCount > 0 ? 'partial' : 'completed',
      success_count: successCount,
      failure_count: failureCount,
      error_messages: errorMessages,
    })
    .eq('id', operationId);
}

export function useTestCaseBulkOperations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Bulk Move
  const bulkMoveMutation = useMutation({
    mutationFn: async (input: BulkMoveInput): Promise<BulkOperationResult> => {
      if (!user) throw new Error('Not authenticated');

      const operationId = await createBulkOperation(
        'bulk_move',
        input.caseIds,
        user.id,
        { targetFolderId: input.targetFolderId }
      );

      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];

      for (const caseId of input.caseIds) {
        try {
          const { error } = await supabase
            .from('test_cases')
            .update({ folder_id: input.targetFolderId })
            .eq('id', caseId);

          if (error) throw error;

          await logAuditEntry({
            entityType: 'test_cases',
            entityId: caseId,
            action: 'updated',
            afterData: { folder_id: input.targetFolderId },
          });

          successCount++;
        } catch (err) {
          failureCount++;
          errors.push(`Failed to move case ${caseId}: ${(err as Error).message}`);
        }
      }

      await updateBulkOperation(operationId, successCount, failureCount, errors);

      return { operationId, successCount, failureCount, errors };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      toast.success(`Moved ${result.successCount} test case(s)`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Bulk Copy
  const bulkCopyMutation = useMutation({
    mutationFn: async (input: BulkCopyInput): Promise<BulkOperationResult> => {
      if (!user) throw new Error('Not authenticated');

      const operationId = await createBulkOperation(
        'bulk_copy',
        input.caseIds,
        user.id,
        { targetFolderId: input.targetFolderId, targetProgramId: input.targetProgramId }
      );

      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];

      for (const caseId of input.caseIds) {
        try {
          // Fetch original case
          const { data: original, error: fetchError } = await supabase
            .from('test_cases')
            .select('*')
            .eq('id', caseId)
            .single();

          if (fetchError || !original) throw new Error('Original case not found');

          // Create copy
          const { data: copy, error: insertError } = await supabase
            .from('test_cases')
            .insert([{
              title: `${original.title} (Copy)`,
              description: original.description,
              preconditions: original.preconditions,
              expected_result: original.expected_result,
              test_type: original.test_type,
              priority: original.priority,
              status: 'draft',
              folder_id: input.targetFolderId ?? original.folder_id,
              program_id: input.targetProgramId ?? original.program_id,
              objective: original.objective,
              component: original.component,
              labels: original.labels,
              created_by: user.id,
              version: 1,
            }])
            .select()
            .single();

          if (insertError || !copy) throw new Error('Failed to create copy');

          // Copy steps
          const { data: steps } = await supabase
            .from('test_case_steps')
            .select('*')
            .eq('case_id', caseId)
            .order('step_number');

          if (steps && steps.length > 0) {
            const stepsCopy = steps.map(step => ({
              case_id: copy.id,
              step_number: step.step_number,
              step_type: step.step_type,
              description: step.description,
              expected_result: step.expected_result,
              test_data: step.test_data,
              is_bdd: step.is_bdd,
              bdd_keyword: step.bdd_keyword,
            }));

            await supabase.from('test_case_steps').insert(stepsCopy);
          }

          await logAuditEntry({
            entityType: 'test_cases',
            entityId: copy.id,
            action: 'created',
            afterData: { source_id: caseId, copied: true },
          });

          successCount++;
        } catch (err) {
          failureCount++;
          errors.push(`Failed to copy case ${caseId}: ${(err as Error).message}`);
        }
      }

      await updateBulkOperation(operationId, successCount, failureCount, errors);

      return { operationId, successCount, failureCount, errors };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      toast.success(`Copied ${result.successCount} test case(s)`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Bulk Archive
  const bulkArchiveMutation = useMutation({
    mutationFn: async (input: BulkArchiveInput): Promise<BulkOperationResult> => {
      if (!user) throw new Error('Not authenticated');

      const operationId = await createBulkOperation(
        'bulk_archive',
        input.caseIds,
        user.id
      );

      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];

      for (const caseId of input.caseIds) {
        try {
          const { error } = await supabase
            .from('test_cases')
            .update({ 
              is_archived: true,
              status: 'deprecated',
            })
            .eq('id', caseId);

          if (error) throw error;

          await logAuditEntry({
            entityType: 'test_cases',
            entityId: caseId,
            action: 'updated',
            afterData: { is_archived: true, status: 'deprecated' },
          });

          successCount++;
        } catch (err) {
          failureCount++;
          errors.push(`Failed to archive case ${caseId}: ${(err as Error).message}`);
        }
      }

      await updateBulkOperation(operationId, successCount, failureCount, errors);

      return { operationId, successCount, failureCount, errors };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      toast.success(`Archived ${result.successCount} test case(s)`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Bulk Delete (soft delete)
  const bulkDeleteMutation = useMutation({
    mutationFn: async (input: BulkDeleteInput): Promise<BulkOperationResult> => {
      if (!user) throw new Error('Not authenticated');

      const operationId = await createBulkOperation(
        'bulk_delete',
        input.caseIds,
        user.id
      );

      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];

      for (const caseId of input.caseIds) {
        try {
          const { error } = await supabase
            .from('test_cases')
            .update({ 
              deleted_at: new Date().toISOString(),
              deleted_by: user.id,
            })
            .eq('id', caseId);

          if (error) throw error;

          await logAuditEntry({
            entityType: 'test_cases',
            entityId: caseId,
            action: 'deleted',
          });

          successCount++;
        } catch (err) {
          failureCount++;
          errors.push(`Failed to delete case ${caseId}: ${(err as Error).message}`);
        }
      }

      await updateBulkOperation(operationId, successCount, failureCount, errors);

      return { operationId, successCount, failureCount, errors };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      toast.success(`Deleted ${result.successCount} test case(s)`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Bulk Status Change
  const bulkStatusChangeMutation = useMutation({
    mutationFn: async (input: BulkStatusChangeInput): Promise<BulkOperationResult> => {
      if (!user) throw new Error('Not authenticated');

      const operationId = await createBulkOperation(
        'bulk_status_change',
        input.caseIds,
        user.id,
        { newStatus: input.newStatus }
      );

      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];

      for (const caseId of input.caseIds) {
        try {
          const { error } = await supabase
            .from('test_cases')
            .update({ status: input.newStatus })
            .eq('id', caseId);

          if (error) throw error;

          await logAuditEntry({
            entityType: 'test_cases',
            entityId: caseId,
            action: 'status_changed',
            afterData: { status: input.newStatus },
          });

          successCount++;
        } catch (err) {
          failureCount++;
          errors.push(`Failed to update case ${caseId}: ${(err as Error).message}`);
        }
      }

      await updateBulkOperation(operationId, successCount, failureCount, errors);

      return { operationId, successCount, failureCount, errors };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      toast.success(`Updated ${result.successCount} test case(s)`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Bulk Add Labels
  const bulkAddLabelsMutation = useMutation({
    mutationFn: async (input: BulkLabelInput): Promise<BulkOperationResult> => {
      if (!user) throw new Error('Not authenticated');

      const operationId = await createBulkOperation(
        'bulk_label_add',
        input.caseIds,
        user.id,
        { labels: input.labels }
      );

      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];

      for (const caseId of input.caseIds) {
        try {
          // Get current labels
          const { data: current } = await supabase
            .from('test_cases')
            .select('labels')
            .eq('id', caseId)
            .single();

          const existingLabels = current?.labels || [];
          const mergedLabels = [...new Set([...existingLabels, ...input.labels])];

          const { error } = await supabase
            .from('test_cases')
            .update({ labels: mergedLabels })
            .eq('id', caseId);

          if (error) throw error;

          successCount++;
        } catch (err) {
          failureCount++;
          errors.push(`Failed to add labels to case ${caseId}: ${(err as Error).message}`);
        }
      }

      await updateBulkOperation(operationId, successCount, failureCount, errors);

      return { operationId, successCount, failureCount, errors };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      toast.success(`Added labels to ${result.successCount} test case(s)`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    bulkMove: bulkMoveMutation.mutateAsync,
    bulkCopy: bulkCopyMutation.mutateAsync,
    bulkArchive: bulkArchiveMutation.mutateAsync,
    bulkDelete: bulkDeleteMutation.mutateAsync,
    bulkStatusChange: bulkStatusChangeMutation.mutateAsync,
    bulkAddLabels: bulkAddLabelsMutation.mutateAsync,
    isMoving: bulkMoveMutation.isPending,
    isCopying: bulkCopyMutation.isPending,
    isArchiving: bulkArchiveMutation.isPending,
    isDeleting: bulkDeleteMutation.isPending,
    isChangingStatus: bulkStatusChangeMutation.isPending,
    isAddingLabels: bulkAddLabelsMutation.isPending,
  };
}
