/**
 * Test Cycle Bulk Operations Hook
 * Handles bulk copy, move, archive, delete for cycles
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { logAuditEntry } from '@/lib/auditLogger';
import { toast } from 'sonner';

export type CycleBulkOperationType = 'copy' | 'move' | 'archive' | 'delete';

export interface CycleBulkOperationResult {
  success: boolean;
  affectedCount: number;
  errors?: string[];
}

async function logCycleActivity(
  userId: string | undefined,
  operationType: string,
  cycleIds: string[],
  description: string
) {
  try {
    await supabase.from('test_activity_log').insert({
      user_id: userId,
      activity_type: `bulk_${operationType}`,
      entity_type: 'test_cycle',
      entity_id: cycleIds[0],
      entity_title: `${cycleIds.length} cycles`,
      description,
    });
  } catch (err) {
    console.error('Failed to log cycle activity:', err);
  }
}

export function useTestCycleBulkOperations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Copy cycles
  const copyMutation = useMutation({
    mutationFn: async ({
      cycleIds,
      targetFolderId,
    }: {
      cycleIds: string[];
      targetFolderId?: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated');

      let copiedCount = 0;
      const errors: string[] = [];

      for (const cycleId of cycleIds) {
        try {
          // Fetch original cycle
          const { data: original } = await supabase
            .from('test_cycles')
            .select('*')
            .eq('id', cycleId)
            .single();

          if (!original) continue;

          // Generate new key
          const timestamp = Date.now().toString(36).toUpperCase();
          const key = `CYC-${timestamp}`;

          // Create copy
          const { data: newCycle, error: insertError } = await supabase
            .from('test_cycles')
            .insert({
              key,
              name: `${original.name} (Copy)`,
              objective: original.objective,
              folder_id: targetFolderId !== undefined ? targetFolderId : original.folder_id,
              program_id: original.program_id,
              project_id: original.project_id,
              status: 'not_started',
              environment: original.environment,
              build_version: original.build_version,
              is_adhoc: original.is_adhoc,
              email_notifications: original.email_notifications,
              auto_close_on_completion: original.auto_close_on_completion,
              created_by: user.id,
              archived: false,
              scope_locked: false,
            })
            .select()
            .single();

          if (insertError) throw insertError;

          // Copy case assignments
          const { data: assignments } = await supabase
            .from('test_cycle_case_assignments')
            .select('*')
            .eq('cycle_id', cycleId);

          if (assignments && assignments.length > 0) {
            await supabase.from('test_cycle_case_assignments').insert(
              assignments.map(a => ({
                cycle_id: newCycle.id,
                case_id: a.case_id,
                assigned_to: a.assigned_to,
                sort_order: a.sort_order,
                milestone: a.milestone,
                estimated_effort: a.estimated_effort,
                assigned_by: user.id,
              }))
            );
          }

          // Copy executions (without status - reset to not_run)
          const { data: executions } = await supabase
            .from('test_cycle_executions')
            .select('case_id, case_version, assigned_to')
            .eq('cycle_id', cycleId);

          if (executions && executions.length > 0) {
            await supabase.from('test_cycle_executions').insert(
              executions.map(e => ({
                cycle_id: newCycle.id,
                case_id: e.case_id,
                case_version: e.case_version,
                assigned_to: e.assigned_to,
                status: 'not_run',
              }))
            );
          }

          copiedCount++;
        } catch (err) {
          errors.push(`Failed to copy cycle ${cycleId}: ${(err as Error).message}`);
        }
      }

      await logCycleActivity(
        user.id,
        'copy',
        cycleIds,
        `Copied ${copiedCount} test cycles`
      );

      return { success: true, affectedCount: copiedCount, errors };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      toast.success(`Copied ${result.affectedCount} test cycles`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Move cycles to folder
  const moveMutation = useMutation({
    mutationFn: async ({
      cycleIds,
      targetFolderId,
    }: {
      cycleIds: string[];
      targetFolderId: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('test_cycles')
        .update({ folder_id: targetFolderId })
        .in('id', cycleIds);

      if (error) throw error;

      await logCycleActivity(
        user.id,
        'move',
        cycleIds,
        `Moved ${cycleIds.length} test cycles to ${targetFolderId ? 'folder' : 'root'}`
      );

      return { success: true, affectedCount: cycleIds.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      toast.success(`Moved ${result.affectedCount} test cycles`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Archive cycles
  const archiveMutation = useMutation({
    mutationFn: async ({ cycleIds, reason }: { cycleIds: string[]; reason?: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('test_cycles')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          archived_by: user.id,
          archive_reason: reason || null,
        })
        .in('id', cycleIds);

      if (error) throw error;

      // Audit log for each
      for (const cycleId of cycleIds) {
        await logAuditEntry({
          entityType: 'test_cycles',
          entityId: cycleId,
          action: 'updated',
        });
      }

      await logCycleActivity(
        user.id,
        'archive',
        cycleIds,
        `Archived ${cycleIds.length} test cycles`
      );

      return { success: true, affectedCount: cycleIds.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      toast.success(`Archived ${result.affectedCount} test cycles`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete cycles (hard delete)
  const deleteMutation = useMutation({
    mutationFn: async ({ cycleIds }: { cycleIds: string[] }) => {
      if (!user) throw new Error('Not authenticated');

      // Get data for audit before deletion
      const { data: beforeData } = await supabase
        .from('test_cycles')
        .select('*')
        .in('id', cycleIds);

      const { error } = await supabase
        .from('test_cycles')
        .delete()
        .in('id', cycleIds);

      if (error) throw error;

      // Audit log for each
      for (const cycle of beforeData || []) {
        await logAuditEntry({
          entityType: 'test_cycles',
          entityId: cycle.id,
          action: 'deleted',
          beforeData: cycle,
        });
      }

      await logCycleActivity(
        user.id,
        'delete',
        cycleIds,
        `Deleted ${cycleIds.length} test cycles`
      );

      return { success: true, affectedCount: cycleIds.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      toast.success(`Deleted ${result.affectedCount} test cycles`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    bulkCopy: copyMutation.mutateAsync,
    bulkMove: moveMutation.mutateAsync,
    bulkArchive: archiveMutation.mutateAsync,
    bulkDelete: deleteMutation.mutateAsync,
    isCopying: copyMutation.isPending,
    isMoving: moveMutation.isPending,
    isArchiving: archiveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
