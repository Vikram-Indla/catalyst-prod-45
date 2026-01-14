/**
 * Hook for bulk actions on assignment table
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { BulkUpdateParams, CycleAssignment } from '@/types/assignment-table.types';

export function useBulkActions(cycleId: string) {
  const queryClient = useQueryClient();

  const bulkUpdate = useMutation({
    mutationFn: async ({ ids, updates }: BulkUpdateParams) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // In real implementation:
      // const { error } = await supabase
      //   .from('cycle_test_cases')
      //   .update(updates)
      //   .in('id', ids);
      // if (error) throw error;
      
      return { ids, updates };
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
      toast.success(`Updated ${ids.length} tests`);
    },
  });

  const bulkRemove = useMutation({
    mutationFn: async (ids: string[]) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // In real implementation:
      // const { error } = await supabase
      //   .from('cycle_test_cases')
      //   .delete()
      //   .in('id', ids);
      // if (error) throw error;
      
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
      toast.success(`Removed ${ids.length} tests from cycle`);
    },
  });

  return { bulkUpdate, bulkRemove };
}
