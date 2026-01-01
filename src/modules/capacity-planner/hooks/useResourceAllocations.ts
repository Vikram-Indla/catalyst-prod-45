import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ResourceAllocation {
  id: string;
  resource_id: string;
  assignment_id: string;
  allocation_percent: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined fields
  assignment_name?: string;
  resource_name?: string;
  profile_id?: string;
}

export function useResourceAllocations() {
  const queryClient = useQueryClient();

  // Fetch all resource allocations with joined assignment names
  const { data: allocations = [], isLoading } = useQuery({
    queryKey: ['resource-allocations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_allocations')
        .select(`
          *,
          resource_inventory!inner(id, name, profile_id),
          resource_assignments!inner(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((row: any) => ({
        id: row.id,
        resource_id: row.resource_id,
        assignment_id: row.assignment_id,
        allocation_percent: row.allocation_percent,
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: row.created_by,
        assignment_name: row.resource_assignments?.name,
        resource_name: row.resource_inventory?.name,
        profile_id: row.resource_inventory?.profile_id,
      })) as ResourceAllocation[];
    },
  });

  // Add a new allocation for a resource to an assignment
  const addAllocation = useMutation({
    mutationFn: async ({ 
      resourceId, 
      assignmentId, 
      allocationPercent 
    }: { 
      resourceId: string; 
      assignmentId: string; 
      allocationPercent: number;
    }) => {
      // First get the resource_inventory id from profile_id
      const { data: inventory } = await supabase
        .from('resource_inventory')
        .select('id')
        .eq('profile_id', resourceId)
        .maybeSingle();

      if (!inventory) {
        throw new Error('Resource not found in inventory');
      }

      const { data, error } = await supabase
        .from('resource_allocations')
        .upsert({
          resource_id: inventory.id,
          assignment_id: assignmentId,
          allocation_percent: allocationPercent,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'resource_id,assignment_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
      toast.success('Allocation updated');
    },
    onError: (error) => {
      toast.error(`Failed to update allocation: ${error.message}`);
    },
  });

  // Update an existing allocation
  const updateAllocation = useMutation({
    mutationFn: async ({ 
      allocationId, 
      allocationPercent 
    }: { 
      allocationId: string; 
      allocationPercent: number;
    }) => {
      const { data, error } = await supabase
        .from('resource_allocations')
        .update({
          allocation_percent: allocationPercent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', allocationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
      toast.success('Allocation updated');
    },
    onError: (error) => {
      toast.error(`Failed to update allocation: ${error.message}`);
    },
  });

  // Remove an allocation
  const removeAllocation = useMutation({
    mutationFn: async (allocationId: string) => {
      const { error } = await supabase
        .from('resource_allocations')
        .delete()
        .eq('id', allocationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
      toast.success('Allocation removed');
    },
    onError: (error) => {
      toast.error(`Failed to remove allocation: ${error.message}`);
    },
  });

  // Transfer allocation between assignments
  const transferAllocation = useMutation({
    mutationFn: async ({ 
      resourceId,
      fromAssignmentId,
      toAssignmentId, 
      transferPercent 
    }: { 
      resourceId: string;
      fromAssignmentId: string;
      toAssignmentId: string;
      transferPercent: number;
    }) => {
      // Get resource_inventory id
      const { data: inventory } = await supabase
        .from('resource_inventory')
        .select('id')
        .eq('profile_id', resourceId)
        .maybeSingle();

      if (!inventory) {
        throw new Error('Resource not found in inventory');
      }

      // Get current allocation in source assignment
      const { data: sourceAlloc } = await supabase
        .from('resource_allocations')
        .select('id, allocation_percent')
        .eq('resource_id', inventory.id)
        .eq('assignment_id', fromAssignmentId)
        .maybeSingle();

      if (!sourceAlloc) {
        throw new Error('Source allocation not found');
      }

      const newSourcePercent = sourceAlloc.allocation_percent - transferPercent;

      // Update or delete source allocation
      if (newSourcePercent <= 0) {
        await supabase
          .from('resource_allocations')
          .delete()
          .eq('id', sourceAlloc.id);
      } else {
        await supabase
          .from('resource_allocations')
          .update({ 
            allocation_percent: newSourcePercent,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sourceAlloc.id);
      }

      // Add or update target allocation
      const { data: targetAlloc } = await supabase
        .from('resource_allocations')
        .select('id, allocation_percent')
        .eq('resource_id', inventory.id)
        .eq('assignment_id', toAssignmentId)
        .maybeSingle();

      if (targetAlloc) {
        // Update existing
        await supabase
          .from('resource_allocations')
          .update({ 
            allocation_percent: targetAlloc.allocation_percent + transferPercent,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetAlloc.id);
      } else {
        // Create new
        await supabase
          .from('resource_allocations')
          .insert({
            resource_id: inventory.id,
            assignment_id: toAssignmentId,
            allocation_percent: transferPercent,
          });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
      toast.success('Allocation transferred');
    },
    onError: (error) => {
      toast.error(`Failed to transfer allocation: ${error.message}`);
    },
  });

  // Get allocations for a specific resource (by profile_id)
  const getAllocationsForResource = (profileId: string): ResourceAllocation[] => {
    return allocations.filter(a => a.profile_id === profileId);
  };

  // Get total allocation for a resource
  const getTotalAllocation = (profileId: string): number => {
    return allocations
      .filter(a => a.profile_id === profileId)
      .reduce((sum, a) => sum + a.allocation_percent, 0);
  };

  return {
    allocations,
    isLoading,
    addAllocation,
    updateAllocation,
    removeAllocation,
    transferAllocation,
    getAllocationsForResource,
    getTotalAllocation,
  };
}
