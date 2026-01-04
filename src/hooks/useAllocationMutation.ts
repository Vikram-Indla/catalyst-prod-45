import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UpdateAllocationParams {
  id: string;
  start_date?: string;
  end_date?: string;
  allocation_percent?: number;
  profile_id?: string;
  assignment_id?: string;
}

export function useAllocationMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: UpdateAllocationParams) => {
      const { id, ...updates } = params;
      
      const { data, error } = await supabase
        .from('resource_allocations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
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
