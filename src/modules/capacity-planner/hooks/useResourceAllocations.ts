/**
 * useResourceAllocations Hook
 * Manages time-boxed resource allocations with date ranges
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ResourceAllocation, AllocationBookingInput } from '../types';

// Re-export type for backward compatibility
export type { ResourceAllocation };

export function useResourceAllocations() {
  const queryClient = useQueryClient();

  // Fetch all resource allocations with joined assignment names and dates
  const { data: allocations = [], isLoading, refetch } = useQuery({
    queryKey: ['resource-allocations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_allocations')
        .select(
          `
          id,
          resource_id,
          assignment_id,
          allocation_percent,
          start_date,
          end_date,
          created_at,
          updated_at,
          created_by,
          resource_inventory(id, name, profile_id, role_name),
          resource_assignments(id, name)
        `
        )
        .order('start_date', { ascending: true });

      if (error) throw error;

      // Populate role_name from the same roles source used in /admin/users
      const [{ data: userProductRoles }, { data: productRoles }] = await Promise.all([
        supabase.from('user_product_roles').select('user_id, role_id'),
        supabase.from('product_roles').select('id, name'),
      ]);

      const roleIdToName = new Map<string, string>(
        (productRoles || []).map((r: any) => [r.id, r.name])
      );

      const roleNameByUserId = new Map<string, string>();
      (userProductRoles || []).forEach((upr: any) => {
        const roleName = roleIdToName.get(upr.role_id);
        if (roleName && !roleNameByUserId.has(upr.user_id)) {
          roleNameByUserId.set(upr.user_id, roleName);
        }
      });

      return (data || []).map((row: any) => {
        const profileId = row.resource_inventory?.profile_id as string | undefined;
        const roleName = profileId ? roleNameByUserId.get(profileId) : undefined;

        return {
          id: row.id,
          resource_id: row.resource_id,
          assignment_id: row.assignment_id,
          allocation_percent: row.allocation_percent,
          start_date: row.start_date,
          end_date: row.end_date,
          created_at: row.created_at,
          updated_at: row.updated_at,
          created_by: row.created_by,
          assignment_name: row.resource_assignments?.name,
          resource_name: row.resource_inventory?.name,
          profile_id: profileId,
          role_name: roleName || row.resource_inventory?.role_name || null,
        };
      }) as ResourceAllocation[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('resource-allocations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'resource_allocations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['resource-allocations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const ensureInventoryId = async (resourceKey: string): Promise<string> => {
    // resourceKey is usually profile_id in the UI, but some places may pass resource_inventory.id
    const { data: byId } = await supabase
      .from('resource_inventory')
      .select('id')
      .eq('id', resourceKey)
      .maybeSingle();

    if (byId?.id) return byId.id;

    const { data: byProfile } = await supabase
      .from('resource_inventory')
      .select('id')
      .eq('profile_id', resourceKey)
      .maybeSingle();

    if (byProfile?.id) return byProfile.id;

    // Create a resource_inventory row on-the-fly if missing
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', resourceKey)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) throw new Error('Resource not found in profiles');

    const { data: created, error: createError } = await supabase
      .from('resource_inventory')
      .insert({
        name: profile.full_name ?? 'Unnamed',
        profile_id: profile.id,
        default_capacity_percent: 100,
        is_active: true,
      })
      .select('id')
      .single();

    if (createError) throw createError;
    return created.id;
  };

  // Get allocations for a specific resource (by profile_id or resource_id)
  function getAllocationsForResource(resourceId: string): ResourceAllocation[] {
    return allocations.filter(
      (a) => a.profile_id === resourceId || a.resource_id === resourceId
    );
  }

  // Get allocations overlapping a specific period
  function getAllocationsForPeriod(
    resourceId: string,
    periodStart: Date,
    periodEnd: Date
  ): ResourceAllocation[] {
    return allocations.filter((a) => {
      if (a.resource_id !== resourceId && a.profile_id !== resourceId) return false;
      const allocStart = new Date(a.start_date);
      const allocEnd = new Date(a.end_date);
      return allocStart <= periodEnd && allocEnd >= periodStart;
    });
  }

  // Get total allocation for a resource (current)
  function getTotalAllocation(profileId: string): number {
    return allocations
      .filter((a) => a.profile_id === profileId)
      .reduce((sum, a) => sum + a.allocation_percent, 0);
  }

  // Calculate total allocation for a resource in a specific period
  function getTotalAllocationForPeriod(
    resourceId: string,
    periodStart: Date,
    periodEnd: Date
  ): number {
    const periodAllocations = getAllocationsForPeriod(resourceId, periodStart, periodEnd);
    return periodAllocations.reduce((sum, a) => sum + a.allocation_percent, 0);
  }

  // Save multiple allocations (upsert) - NEW for time-boxed booking
  const saveAllocations = useMutation({
    mutationFn: async ({
      resourceId,
      allocations: newAllocations,
    }: {
      resourceId: string;
      allocations: AllocationBookingInput[];
    }) => {
      const inventoryId = await ensureInventoryId(resourceId);

      // Get existing allocations for this resource to determine what to delete
      const { data: existingAllocations, error: fetchError } = await supabase
        .from('resource_allocations')
        .select('id')
        .eq('resource_id', inventoryId);

      if (fetchError) throw fetchError;

      const existingIds = new Set((existingAllocations || []).map(a => a.id));
      const newIds = new Set(newAllocations.filter(a => a.id).map(a => a.id));

      // Find allocations that were deleted (exist in DB but not in new array)
      const idsToDelete = [...existingIds].filter(id => !newIds.has(id));

      // Delete removed allocations
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('resource_allocations')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) throw deleteError;
      }

      // Process each allocation (update existing or insert new)
      for (const alloc of newAllocations) {
        if (alloc.id) {
          // Update existing
          const { error } = await supabase
            .from('resource_allocations')
            .update({
              assignment_id: alloc.assignment_id,
              allocation_percent: alloc.allocation_percent,
              start_date: alloc.start_date,
              end_date: alloc.end_date,
              updated_at: new Date().toISOString(),
            })
            .eq('id', alloc.id);

          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase.from('resource_allocations').insert({
            resource_id: inventoryId,
            assignment_id: alloc.assignment_id,
            allocation_percent: alloc.allocation_percent,
            start_date: alloc.start_date,
            end_date: alloc.end_date,
          });

          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
      toast.success('Allocations saved');
    },
    onError: (error) => {
      toast.error(`Failed to save allocations: ${error.message}`);
    },
  });

  // Add a new allocation for a resource to an assignment (legacy support)
  const addAllocation = useMutation({
    mutationFn: async ({
      resourceId,
      assignmentId,
      allocationPercent,
      startDate,
      endDate,
    }: {
      resourceId: string;
      assignmentId: string;
      allocationPercent: number;
      startDate?: string;
      endDate?: string;
    }) => {
      const inventoryId = await ensureInventoryId(resourceId);

      const today = new Date().toISOString().split('T')[0];
      const threeMonths = new Date();
      threeMonths.setMonth(threeMonths.getMonth() + 3);

      const { data, error } = await supabase
        .from('resource_allocations')
        .insert({
          resource_id: inventoryId,
          assignment_id: assignmentId,
          allocation_percent: allocationPercent,
          start_date: startDate || today,
          end_date: endDate || threeMonths.toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
      toast.success('Allocation added');
    },
    onError: (error) => {
      toast.error(`Failed to add allocation: ${error.message}`);
    },
  });

  // Update an existing allocation
  const updateAllocation = useMutation({
    mutationFn: async ({
      allocationId,
      allocationPercent,
      startDate,
      endDate,
    }: {
      allocationId: string;
      allocationPercent: number;
      startDate?: string;
      endDate?: string;
    }) => {
      const updateData: Record<string, unknown> = {
        allocation_percent: allocationPercent,
        updated_at: new Date().toISOString(),
      };
      if (startDate) updateData.start_date = startDate;
      if (endDate) updateData.end_date = endDate;

      const { data, error } = await supabase
        .from('resource_allocations')
        .update(updateData)
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
      const { error } = await supabase.from('resource_allocations').delete().eq('id', allocationId);

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
      transferPercent,
    }: {
      resourceId: string;
      fromAssignmentId: string;
      toAssignmentId: string;
      transferPercent: number;
    }) => {
      const inventoryId = await ensureInventoryId(resourceId);

      // Get current allocation in source assignment
      const { data: sourceAlloc } = await supabase
        .from('resource_allocations')
        .select('id, allocation_percent')
        .eq('resource_id', inventoryId)
        .eq('assignment_id', fromAssignmentId)
        .maybeSingle();

      if (!sourceAlloc) {
        throw new Error('Source allocation not found');
      }

      const newSourcePercent = sourceAlloc.allocation_percent - transferPercent;

      // Update or delete source allocation
      if (newSourcePercent <= 0) {
        const { error } = await supabase.from('resource_allocations').delete().eq('id', sourceAlloc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('resource_allocations')
          .update({
            allocation_percent: newSourcePercent,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sourceAlloc.id);
        if (error) throw error;
      }

      // Add or update target allocation
      const { data: targetAlloc } = await supabase
        .from('resource_allocations')
        .select('id, allocation_percent')
        .eq('resource_id', inventoryId)
        .eq('assignment_id', toAssignmentId)
        .maybeSingle();

      const today = new Date().toISOString().split('T')[0];
      const threeMonths = new Date();
      threeMonths.setMonth(threeMonths.getMonth() + 3);

      if (targetAlloc) {
        const { error } = await supabase
          .from('resource_allocations')
          .update({
            allocation_percent: targetAlloc.allocation_percent + transferPercent,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetAlloc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('resource_allocations').insert({
          resource_id: inventoryId,
          assignment_id: toAssignmentId,
          allocation_percent: transferPercent,
          start_date: today,
          end_date: threeMonths.toISOString().split('T')[0],
        });
        if (error) throw error;
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

  // Delete all allocations for a resource
  const deleteResourceAllocations = useMutation({
    mutationFn: async (resourceId: string) => {
      const inventoryId = await ensureInventoryId(resourceId);

      const { error } = await supabase
        .from('resource_allocations')
        .delete()
        .eq('resource_id', inventoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-allocations'] });
    },
  });

  return {
    allocations,
    isLoading,
    refetch,
    addAllocation,
    updateAllocation,
    removeAllocation,
    transferAllocation,
    saveAllocations,
    deleteResourceAllocations,
    getAllocationsForResource,
    getAllocationsForPeriod,
    getTotalAllocation,
    getTotalAllocationForPeriod,
  };
}
