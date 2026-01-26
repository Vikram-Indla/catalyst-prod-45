import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateAllocationAgainstContract } from '@/utils/allocationValidation';

interface UpdateAllocationParams {
  id: string;
  start_date?: string;
  end_date?: string;
  allocation_percent?: number;
  profile_id?: string;
  assignment_id?: string;
  status?: string;
  contractEndDate?: string | null; // Pass this for validation
  resourceName?: string;
}

export function useAllocationMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: UpdateAllocationParams) => {
      const { id, contractEndDate, resourceName, ...updates } = params;
      
      // Validate end date against contract if being updated
      if (updates.end_date !== undefined && contractEndDate) {
        if (!validateAllocationAgainstContract(updates.end_date, contractEndDate, resourceName)) {
          throw new Error('VALIDATION_FAILED');
        }
      }
      
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
      
      const { data, error } = await supabase
        .from('resource_allocations')
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
      // Don't show duplicate error for validation failures
      if (err instanceof Error && err.message === 'VALIDATION_FAILED') return;
      toast.error('Failed to save changes', {
        description: 'Your changes could not be saved. Please try again.',
      });
    },
    
    // Always refetch after error or success
    onSettled: () => {
      setTimeout(() => {
       // Invalidate ALL allocation-related queries for complete CRUD sync
        queryClient.invalidateQueries({ queryKey: ['resource-allocations'] });
       queryClient.invalidateQueries({ queryKey: ['resource-allocations-timeline'] });
        queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
       queryClient.invalidateQueries({ queryKey: ['analytics-allocations'] });
       queryClient.invalidateQueries({ queryKey: ['analytics-resources'] });
       queryClient.invalidateQueries({ queryKey: ['capacity-summary'] });
       queryClient.invalidateQueries({ queryKey: ['resource-utilization'] });
      }, 100);
    },
  });
}
