/**
 * Hook for bulk actions on assignment table - WIRED TO SUPABASE
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { BulkUpdateParams, CycleAssignment } from '@/types/assignment-table.types';
import { cycleListKeys } from './useTestCycleList';

// Map UI status values to DB status values
const STATUS_MAP: Record<string, string> = {
  'not_started': 'not_run',
  'in_progress': 'in_progress',
  'passed': 'passed',
  'failed': 'failed',
  'blocked': 'blocked',
  'skipped': 'skipped',
};

export function useBulkActions(cycleId: string) {
  const queryClient = useQueryClient();

  const bulkUpdate = useMutation({
    mutationFn: async ({ ids, updates }: BulkUpdateParams) => {
      // Transform updates to DB format
      const dbUpdates: Record<string, any> = {};
      
      if (updates.status !== undefined) {
        dbUpdates.current_status = STATUS_MAP[updates.status] || updates.status;
      }
      if (updates.assigneeId !== undefined) {
        dbUpdates.assigned_to = updates.assigneeId === 'unassigned' ? null : updates.assigneeId;
      }
      if (updates.priority !== undefined) {
        dbUpdates.priority = updates.priority;
      }
      if (updates.dueDate !== undefined) {
        dbUpdates.due_date = updates.dueDate;
      }

      const { data, error } = await (supabase as any)
        .from('tm_cycle_scope')
        .update(dbUpdates)
        .in('id', ids)
        .select();

      if (error) {
        console.error('Error bulk updating:', error);
        throw error;
      }
      
      return { ids, updates, data };
    },
    onMutate: async ({ ids, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['assignment-table', cycleId] });
      
      const previousData = queryClient.getQueryData<CycleAssignment[]>(['assignment-table', cycleId]);
      
      queryClient.setQueryData<CycleAssignment[]>(['assignment-table', cycleId], (old) => {
        if (!old) return old;
        return old.map(item => 
          ids.includes(item.id) 
            ? { ...item, ...updates } 
            : item
        );
      });
      
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['assignment-table', cycleId], context.previousData);
      }
      toast.error('Failed to update');
    },
    onSuccess: (_, { ids }) => {
      queryClient.invalidateQueries({ queryKey: ['cycle-test-cases', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['cycle-details', cycleId] });
      queryClient.invalidateQueries({ queryKey: cycleListKeys.all });
      toast.success(`Updated ${ids.length} tests`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-table', cycleId] });
    },
  });

  const bulkRemove = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await (supabase as any)
        .from('tm_cycle_scope')
        .delete()
        .in('id', ids);

      if (error) {
        console.error('Error removing tests:', error);
        throw error;
      }
      
      return ids;
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ['assignment-table', cycleId] });
      
      const previousData = queryClient.getQueryData<CycleAssignment[]>(['assignment-table', cycleId]);
      
      queryClient.setQueryData<CycleAssignment[]>(['assignment-table', cycleId], (old) => {
        if (!old) return old;
        return old.filter(item => !ids.includes(item.id));
      });
      
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['assignment-table', cycleId], context.previousData);
      }
      toast.error('Failed to remove tests');
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey: ['cycle-test-cases', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['cycle-details', cycleId] });
      queryClient.invalidateQueries({ queryKey: cycleListKeys.all });
      toast.success(`Removed ${ids.length} tests from cycle`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-table', cycleId] });
    },
  });

  return { bulkUpdate, bulkRemove };
}
