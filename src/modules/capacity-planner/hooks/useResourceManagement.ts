import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ResourceUpdateInput {
  id: string;
  full_name?: string;
  role?: string;
  department_id?: string | null;
  assignment_id?: string | null;
}

export function useResourceManagement() {
  const queryClient = useQueryClient();

  const updateResource = useMutation({
    mutationFn: async (input: ResourceUpdateInput) => {
      const { id, assignment_id, ...profileUpdates } = input;
      
      // Update profiles table for profile-related fields
      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            ...profileUpdates, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', id);
        
        if (profileError) throw profileError;
      }
      
      // Update resource_inventory for assignment_id using profile_id
      if (assignment_id !== undefined) {
        // Check if resource exists in resource_inventory by profile_id
        const { data: existingResource } = await supabase
          .from('resource_inventory')
          .select('id')
          .eq('profile_id', id)
          .maybeSingle();
        
        if (existingResource) {
          // Update existing resource_inventory entry
          const { error: inventoryError } = await supabase
            .from('resource_inventory')
            .update({ 
              assignment_id: assignment_id || null,
              updated_at: new Date().toISOString() 
            })
            .eq('profile_id', id);
          
          if (inventoryError) throw inventoryError;
        } else {
          // Create resource_inventory entry with profile_id
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', id)
            .single();
          
          if (profile) {
            const { error: insertError } = await supabase
              .from('resource_inventory')
              .insert({
                profile_id: id,
                name: profile.full_name || 'Unknown',
                role_name: profile.role,
                assignment_id: assignment_id || null,
                is_active: true,
              });
            
            if (insertError) throw insertError;
          }
        }
      }
      
      return { id };
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['resource-inventory'] });
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
        // Update existing assignment (and return the updated row for optimistic UI)
        const { data, error } = await supabase
          .from('assignments')
          .update({ 
            allocation_percentage: allocationPercentage,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select('*')
          .single();

        if (error) throw error;
        return data;
      }

      // Create new assignment (and return inserted row for optimistic UI)
      const { data, error } = await supabase
        .from('assignments')
        .insert({
          user_id: resourceId,
          project_id: projectId,
          allocation_percentage: allocationPercentage,
          status: 'active',
          start_date: new Date().toISOString().split('T')[0],
          work_item_type: 'project',
        })
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (savedAssignment) => {
      // Make changes visible immediately across table + cards
      if (savedAssignment) {
        queryClient.setQueryData(['capacity-planner-assignments'], (old: any) => {
          const prev = Array.isArray(old) ? old : [];
          const next = prev.filter((a) => a?.id !== savedAssignment.id);
          next.unshift(savedAssignment);
          return next;
        });
      }

      queryClient.invalidateQueries({ queryKey: ['capacity-planner-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
      toast.success('Allocation updated');
    },
    onError: (error) => {
      toast.error(`Failed to update allocation: ${error.message}`);
    },
  });

  /**
   * Update a resource's assignment_id in resource_inventory
   * Used for drag-and-drop between assignment swim lanes
   */
  const updateResourceAssignmentType = useMutation({
    mutationFn: async ({ 
      resourceId, 
      assignmentId 
    }: { 
      resourceId: string; 
      assignmentId: string | null;
    }) => {
      // Check if resource exists in resource_inventory by profile_id
      const { data: existingResource } = await supabase
        .from('resource_inventory')
        .select('id')
        .eq('profile_id', resourceId)
        .maybeSingle();

      if (existingResource) {
        // Update existing resource_inventory entry
        const { data, error } = await supabase
          .from('resource_inventory')
          .update({ 
            assignment_id: assignmentId,
            updated_at: new Date().toISOString() 
          })
          .eq('profile_id', resourceId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create resource_inventory entry with profile_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', resourceId)
          .single();

        if (profile) {
          const { data, error } = await supabase
            .from('resource_inventory')
            .insert({
              profile_id: resourceId,
              name: profile.full_name || 'Unknown',
              role_name: profile.role,
              assignment_id: assignmentId,
              is_active: true,
            })
            .select()
            .single();

          if (error) throw error;
          return data;
        }
        throw new Error('Profile not found');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource-inventory'] });
      toast.success('Assignment updated');
    },
    onError: (error) => {
      toast.error(`Failed to update assignment: ${error.message}`);
    },
  });

  return {
    updateResource,
    updateResourceAllocation,
    updateResourceAssignmentType,
  };
}
