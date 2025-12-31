import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ResourceUpdateInput {
  id: string;
  full_name?: string;
  role?: string;
  department_id?: string | null;
}

export function useResourceManagement() {
  const queryClient = useQueryClient();

  const updateResource = useMutation({
    mutationFn: async (input: ResourceUpdateInput) => {
      const { id, ...updates } = input;
      
      // Update profiles table
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          ...updates, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Resource updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update resource: ${error.message}`);
    },
  });

  const updateResourceAllocation = useMutation({
    mutationFn: async ({ 
      resourceId, 
      projectId, 
      allocationPercentage 
    }: { 
      resourceId: string; 
      projectId: string; 
      allocationPercentage: number 
    }) => {
      // Check if assignment exists
      const { data: existing } = await supabase
        .from('assignments')
        .select('id')
        .eq('user_id', resourceId)
        .eq('project_id', projectId)
        .eq('status', 'active')
        .maybeSingle();

      if (existing) {
        // Update existing assignment
        const { error } = await supabase
          .from('assignments')
          .update({ 
            allocation_percentage: allocationPercentage,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Create new assignment
        const { error } = await supabase
          .from('assignments')
          .insert({
            user_id: resourceId,
            project_id: projectId,
            allocation_percentage: allocationPercentage,
            status: 'active',
            start_date: new Date().toISOString().split('T')[0],
            work_item_type: 'project',
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-assignments'] });
      toast.success('Allocation updated');
    },
    onError: (error) => {
      toast.error(`Failed to update allocation: ${error.message}`);
    },
  });

  return {
    updateResource,
    updateResourceAllocation,
  };
}
