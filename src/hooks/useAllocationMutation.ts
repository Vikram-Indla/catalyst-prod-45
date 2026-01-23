import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fromTable } from '@/lib/supabase-utils';
import { toast } from 'sonner';

interface UpdateAllocationParams {
  id: string;
  start_date?: string;
  end_date?: string;
  allocation_percent?: number;
  profile_id?: string;
  assignment_id?: string;
  status?: string;
}

export function useAllocationMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: UpdateAllocationParams) => {
      const { id, ...updates } = params;
      
      // Build the update object, only including defined values
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      if (updates.start_date !== undefined) updateData.start_date = updates.start_date;
      if (updates.end_date !== undefined) updateData.end_date = updates.end_date;
      if (updates.allocation_percent !== undefined) updateData.allocation_percent = updates.allocation_percent;
      if (updates.profile_id !== undefined) updateData.profile_id = updates.profile_id;
      if (updates.assignment_id !== undefined) updateData.assignment_id = updates.assignment_id;
      if (updates.status !== undefined) updateData.status = updates.status;
      
      const { data, error } = await fromTable('resource_allocations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    // Optimistic update
    onMutate: async (params) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['resource-allocations'] });
      
      // Snapshot previous value
      const previousAllocations = queryClient.getQueryData(['resource-allocations']);
      
      // Optimistically update
      queryClient.setQueryData(['resource-allocations'], (old: any[]) => {
        if (!old) return old;
        return old.map(alloc => 
          alloc.id === params.id 
            ? { ...alloc, ...params }
            : alloc
        );
      });
      
      return { previousAllocations };
    },
    
    // On error, rollback
    onError: (err, params, context) => {
      queryClient.setQueryData(['resource-allocations'], context?.previousAllocations);
      toast.error('Failed to save changes', {
        description: 'Your changes could not be saved. Please try again.',
      });
    },
    
    // Always refetch after error or success
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['resource-allocations'] });
        queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
      }, 100);
    },
  });
}
