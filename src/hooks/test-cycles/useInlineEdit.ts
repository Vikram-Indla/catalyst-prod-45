/**
 * Hook for inline editing in assignment table
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CycleAssignment, InlineEditParams } from '@/types/assignment-table.types';

export function useInlineEdit(cycleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, field, value }: InlineEditParams) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // In real implementation:
      // const { error } = await supabase
      //   .from('cycle_test_cases')
      //   .update({ [field]: value, updated_at: new Date().toISOString() })
      //   .eq('id', assignmentId);
      // if (error) throw error;
      
      return { assignmentId, field, value };
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
      toast.success('Updated');
    },
    onSettled: () => {
      // Optionally refetch to ensure consistency
      // queryClient.invalidateQueries({ queryKey: ['assignment-table', cycleId] });
    },
  });
}
