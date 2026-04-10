/**
 * Hook for inline editing in assignment table - WIRED TO SUPABASE
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CycleAssignment, InlineEditParams } from '@/types/assignment-table.types';
import { cycleListKeys } from './useTestCycleList';

// Map UI field names to DB column names
const FIELD_MAP: Record<string, string> = {
  status: 'current_status',
  assigneeId: 'assigned_to',
  priority: 'priority',
  dueDate: 'due_date',
};

// Map UI status values to DB status values
const STATUS_MAP: Record<string, string> = {
  'not_started': 'not_run',
  'in_progress': 'in_progress',
  'passed': 'passed',
  'failed': 'failed',
  'blocked': 'blocked',
  'skipped': 'skipped',
};

export function useInlineEdit(cycleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, field, value }: InlineEditParams) => {
      // Map field name to DB column
      const dbColumn = FIELD_MAP[field] || field;
      
      // Map status value if needed
      let dbValue = value;
      if (field === 'status' && typeof value === 'string') {
        dbValue = STATUS_MAP[value] || value;
      }

      // Handle null assignee
      if (field === 'assigneeId' && value === 'unassigned') {
        dbValue = null;
      }

      const { data, error } = await typedQuery('tm_cycle_scope')
        .update({ [dbColumn]: dbValue })
        .eq('id', assignmentId)
        .select()
        .single();

      if (error) {
        console.error('Error updating scope item:', error);
        throw error;
      }
      
      return { assignmentId, field, value, data };
    },
    onMutate: async ({ assignmentId, field, value }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['assignment-table', cycleId] });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData<CycleAssignment[]>(['assignment-table', cycleId]);
      
      // Optimistically update
      queryClient.setQueryData<CycleAssignment[]>(['assignment-table', cycleId], (old) => {
        if (!old) return old;
        return old.map(item => 
          item.id === assignmentId 
            ? { ...item, [field]: value } 
            : item
        );
      });
      
      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['assignment-table', cycleId], context.previousData);
      }
      toast.error('Failed to update');
    },
    onSuccess: () => {
      // Invalidate related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['cycle-test-cases', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['cycle-details', cycleId] });
      queryClient.invalidateQueries({ queryKey: cycleListKeys.all });
      // No toast - inline edits should be silent for UX
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['assignment-table', cycleId] });
    },
  });
}
