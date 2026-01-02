/**
 * Test Set Bulk Operations Hook
 * Handles bulk move, copy, archive, delete, and add to cycle
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { logAuditEntry } from '@/lib/auditLogger';
import { toast } from 'sonner';

export type BulkOperationType = 'move' | 'copy' | 'archive' | 'delete' | 'add_to_cycle';

export interface BulkOperationResult {
  success: boolean;
  operationId: string;
  affectedCount: number;
  errors?: string[];
}

async function logBulkActivity(
  userId: string | undefined,
  operationType: string,
  setIds: string[],
  description: string
) {
  try {
    await supabase.from('test_activity_log').insert({
      user_id: userId,
      activity_type: `bulk_${operationType}`,
      entity_type: 'test_set',
      entity_id: setIds[0],
      entity_title: `${setIds.length} sets`,
      description,
    });
  } catch (err) {
    console.error('Failed to log bulk activity:', err);
  }
}

export function useTestSetBulkOperations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Bulk Move sets to folder
  const moveMutation = useMutation({
    mutationFn: async ({
      setIds,
      targetFolderId,
    }: {
      setIds: string[];
      targetFolderId: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Record bulk operation
      const { data: operation, error: opError } = await supabase
        .from('test_set_bulk_operations')
        .insert({
          operation_type: 'move',
          status: 'in_progress',
          set_ids: setIds,
          target_folder_id: targetFolderId,
          created_by: user.id,
        } as any)
        .select()
        .single();

      if (opError) throw opError;

      // Execute move
      const { error: moveError } = await supabase
        .from('test_sets')
        .update({ folder_id: targetFolderId })
        .in('id', setIds);

      if (moveError) {
        await supabase
          .from('test_set_bulk_operations')
          .update({ status: 'failed', error_message: moveError.message })
          .eq('id', operation.id);
        throw moveError;
      }

      // Mark complete
      await supabase
        .from('test_set_bulk_operations')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString(),
          result: { affected_count: setIds.length },
        })
        .eq('id', operation.id);

      await logBulkActivity(
        user.id,
        'move',
        setIds,
        `Moved ${setIds.length} test sets to ${targetFolderId ? 'folder' : 'root'}`
      );

      return { success: true, operationId: operation.id, affectedCount: setIds.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['test-sets'] });
      toast.success(`Moved ${result.affectedCount} test sets`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Bulk Copy sets
  const copyMutation = useMutation({
    mutationFn: async ({
      setIds,
      targetFolderId,
    }: {
      setIds: string[];
      targetFolderId?: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Record bulk operation
      const { data: operation, error: opError } = await supabase
        .from('test_set_bulk_operations')
        .insert({
          operation_type: 'copy',
          status: 'in_progress',
          set_ids: setIds,
          target_folder_id: targetFolderId,
          created_by: user.id,
        } as any)
        .select()
        .single();

      if (opError) throw opError;

      let copiedCount = 0;
      const errors: string[] = [];

      for (const setId of setIds) {
        try {
          // Fetch original set
          const { data: original } = await supabase
            .from('test_sets')
            .select('*')
            .eq('id', setId)
            .single();

          if (!original) continue;

          // Generate new key
          const timestamp = Date.now().toString(36).toUpperCase();
          const key = `TS-${timestamp}`;

          // Create copy
          const { data: newSet, error: insertError } = await supabase
            .from('test_sets')
            .insert({
              key,
              name: `${original.name} (Copy)`,
              description: original.description,
              objective: original.objective,
              folder_id: targetFolderId !== undefined ? targetFolderId : original.folder_id,
              program_id: original.program_id,
              status: 'active',
              is_smart_set: original.is_smart_set,
              smart_set_criteria: original.smart_set_criteria,
              is_versioned: original.is_versioned,
              created_by: user.id,
              version: 1,
            } as any)
            .select()
            .single();

          if (insertError) throw insertError;

          // Copy cases if static set
          if (!original.is_smart_set) {
            const { data: setCases } = await supabase
              .from('test_set_cases')
              .select('case_id, case_version, sort_order')
              .eq('set_id', setId);

            if (setCases && setCases.length > 0) {
              await supabase.from('test_set_cases').insert(
                setCases.map(c => ({
                  set_id: newSet.id,
                  case_id: c.case_id,
                  case_version: c.case_version,
                  sort_order: c.sort_order,
                  added_by: user.id,
                }))
              );
            }
          }

          copiedCount++;
        } catch (err) {
          errors.push(`Failed to copy set ${setId}: ${(err as Error).message}`);
        }
      }

      await supabase
        .from('test_set_bulk_operations')
        .update({
          status: errors.length ? 'completed' : 'completed',
          completed_at: new Date().toISOString(),
          result: { affected_count: copiedCount, errors },
        })
        .eq('id', operation.id);

      await logBulkActivity(
        user.id,
        'copy',
        setIds,
        `Copied ${copiedCount} test sets`
      );

      return { success: true, operationId: operation.id, affectedCount: copiedCount, errors };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['test-sets'] });
      toast.success(`Copied ${result.affectedCount} test sets`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Bulk Archive sets
  const archiveMutation = useMutation({
    mutationFn: async ({ setIds }: { setIds: string[] }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: operation, error: opError } = await supabase
        .from('test_set_bulk_operations')
        .insert({
          operation_type: 'archive',
          status: 'in_progress',
          set_ids: setIds,
          created_by: user.id,
        } as any)
        .select()
        .single();

      if (opError) throw opError;

      const { error: archiveError } = await supabase
        .from('test_sets')
        .update({ status: 'archived' })
        .in('id', setIds);

      if (archiveError) {
        await supabase
          .from('test_set_bulk_operations')
          .update({ status: 'failed', error_message: archiveError.message })
          .eq('id', operation.id);
        throw archiveError;
      }

      await supabase
        .from('test_set_bulk_operations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result: { affected_count: setIds.length },
        })
        .eq('id', operation.id);

      await logBulkActivity(
        user.id,
        'archive',
        setIds,
        `Archived ${setIds.length} test sets`
      );

      return { success: true, operationId: operation.id, affectedCount: setIds.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['test-sets'] });
      toast.success(`Archived ${result.affectedCount} test sets`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Bulk Delete sets
  const deleteMutation = useMutation({
    mutationFn: async ({ setIds }: { setIds: string[] }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: operation, error: opError } = await supabase
        .from('test_set_bulk_operations')
        .insert({
          operation_type: 'delete',
          status: 'in_progress',
          set_ids: setIds,
          created_by: user.id,
        } as any)
        .select()
        .single();

      if (opError) throw opError;

      // Get data for audit before deletion
      const { data: beforeData } = await supabase
        .from('test_sets')
        .select('*')
        .in('id', setIds);

      const { error: deleteError } = await supabase
        .from('test_sets')
        .delete()
        .in('id', setIds);

      if (deleteError) {
        await supabase
          .from('test_set_bulk_operations')
          .update({ status: 'failed', error_message: deleteError.message })
          .eq('id', operation.id);
        throw deleteError;
      }

      // Audit log for each deleted set
      for (const set of beforeData || []) {
        await logAuditEntry({
          entityType: 'test_sets',
          entityId: set.id,
          action: 'deleted',
          beforeData: set,
        });
      }

      await supabase
        .from('test_set_bulk_operations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result: { affected_count: setIds.length },
        })
        .eq('id', operation.id);

      await logBulkActivity(
        user.id,
        'delete',
        setIds,
        `Deleted ${setIds.length} test sets`
      );

      return { success: true, operationId: operation.id, affectedCount: setIds.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['test-sets'] });
      toast.success(`Deleted ${result.affectedCount} test sets`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Add sets to cycle
  const addToCycleMutation = useMutation({
    mutationFn: async ({
      setIds,
      cycleId,
    }: {
      setIds: string[];
      cycleId: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: operation, error: opError } = await supabase
        .from('test_set_bulk_operations')
        .insert({
          operation_type: 'add_to_cycle',
          status: 'in_progress',
          set_ids: setIds,
          target_cycle_id: cycleId,
          created_by: user.id,
        } as any)
        .select()
        .single();

      if (opError) throw opError;

      let addedCount = 0;

      for (const setId of setIds) {
        // Get cases from set
        const { data: setCases } = await supabase
          .from('test_set_cases')
          .select('case_id, case_version')
          .eq('set_id', setId);

        if (setCases && setCases.length > 0) {
          // Add each case to cycle as execution
          for (const setCase of setCases) {
            // Check if execution already exists
            const { data: existing } = await supabase
              .from('test_executions')
              .select('id')
              .eq('test_cycle_id', cycleId)
              .eq('test_case_id', setCase.case_id)
              .single();

            if (!existing) {
              const { error: execError } = await supabase
                .from('test_executions')
                .insert({
                  test_cycle_id: cycleId,
                  test_case_id: setCase.case_id,
                  status: 'not_started',
                  executed_by: user.id,
                } as any);

              if (!execError) addedCount++;
            }
          }
        }
      }

      await supabase
        .from('test_set_bulk_operations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result: { affected_count: addedCount },
        })
        .eq('id', operation.id);

      await logBulkActivity(
        user.id,
        'add_to_cycle',
        setIds,
        `Added ${addedCount} cases from ${setIds.length} sets to cycle`
      );

      return { success: true, operationId: operation.id, affectedCount: addedCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['test-executions'] });
      toast.success(`Added ${result.affectedCount} cases to cycle`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    bulkMove: moveMutation.mutateAsync,
    bulkCopy: copyMutation.mutateAsync,
    bulkArchive: archiveMutation.mutateAsync,
    bulkDelete: deleteMutation.mutateAsync,
    addSetsToCycle: addToCycleMutation.mutateAsync,
    isMoving: moveMutation.isPending,
    isCopying: copyMutation.isPending,
    isArchiving: archiveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isAddingToCycle: addToCycleMutation.isPending,
  };
}
