/**
 * useBulkEditUsers - Hook for bulk editing multiple users at once
 * Handles batch updates to resource_inventory with optimistic UI
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserProfile } from './useUsers';

export type BulkEditableField = 
  | 'department_id' 
  | 'assignment_id' 
  | 'vendor_id' 
  | 'resource_type' 
  | 'country_id' 
  | 'location_id'
  | 'job_role';

export interface BulkEditPayload {
  userIds: string[];
  updates: Partial<Record<BulkEditableField, string | null>>;
  displayUpdates?: Partial<Record<string, string | null>>; // For optimistic UI
}

interface ReferenceData {
  vendors: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string }>;
  countries: Array<{ id: string; name: string; code?: string }>;
  departments: Array<{ id: string; name: string }>;
  assignments: Array<{ id: string; name: string }>;
}

export function useBulkEditUsers(referenceData: ReferenceData) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userIds, updates }: BulkEditPayload) => {
      if (userIds.length === 0) {
        throw new Error('No users selected');
      }

      // First, get all users to determine which have profiles vs inventory-only
      const { data: users } = await queryClient.getQueryData<UserProfile[]>(['users-list']) 
        ? { data: queryClient.getQueryData<UserProfile[]>(['users-list']) }
        : { data: [] };

      const selectedUsers = users?.filter(u => userIds.includes(u.id)) || [];

      // Build the update payload for resource_inventory
      const inventoryPayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      // Map fields and resolve display names
      if (updates.job_role !== undefined) {
        inventoryPayload.role_name = updates.job_role;
      }
      if (updates.department_id !== undefined) {
        inventoryPayload.department_id = updates.department_id || null;
        const dept = referenceData.departments.find(d => d.id === updates.department_id);
        inventoryPayload.department_name = dept?.name || null;
      }
      if (updates.assignment_id !== undefined) {
        inventoryPayload.assignment_id = updates.assignment_id || null;
      }
      if (updates.vendor_id !== undefined) {
        inventoryPayload.vendor_id = updates.vendor_id || null;
        const vendor = referenceData.vendors.find(v => v.id === updates.vendor_id);
        inventoryPayload.vendor_name = vendor?.name || null;
      }
      if (updates.resource_type !== undefined) {
        inventoryPayload.resource_type = updates.resource_type;
      }
      if (updates.country_id !== undefined) {
        inventoryPayload.country_id = updates.country_id || null;
      }
      if (updates.location_id !== undefined) {
        inventoryPayload.location_id = updates.location_id || null;
      }

      // Separate users with profiles from inventory-only users
      const profileUserIds = selectedUsers
        .filter(u => !!u.email)
        .map(u => u.id);
      
      const inventoryOnlyUserIds = selectedUsers
        .filter(u => !u.email)
        .map(u => u.id);

      let updatedCount = 0;

      // Update profile-linked resource_inventory records
      if (profileUserIds.length > 0) {
        const { data, error } = await supabase
          .from('resource_inventory')
          .update(inventoryPayload)
          .in('profile_id', profileUserIds)
          .select('id');

        if (error) throw error;
        updatedCount += data?.length || 0;

        // For users without resource_inventory, create records
        const existingProfileIds = new Set(data?.map(d => d.id));
        const missingProfileIds = profileUserIds.filter(id => !existingProfileIds.has(id));
        
        if (missingProfileIds.length > 0) {
          // Check which profiles are actually missing inventory records
          const { data: existingInventory } = await supabase
            .from('resource_inventory')
            .select('profile_id')
            .in('profile_id', missingProfileIds);
          
          const existingProfileIdSet = new Set(existingInventory?.map(e => e.profile_id));
          const trulyMissingIds = missingProfileIds.filter(id => !existingProfileIdSet.has(id));

          if (trulyMissingIds.length > 0) {
            const insertRecords = trulyMissingIds.map(profileId => ({
              profile_id: profileId,
              is_active: true,
              ...inventoryPayload,
            }));

            const { data: inserted, error: insertError } = await supabase
              .from('resource_inventory')
              .insert(insertRecords as any)
              .select('id');

            if (insertError) {
              console.warn('Failed to insert some inventory records:', insertError);
            } else {
              updatedCount += inserted?.length || 0;
            }
          }
        }
      }

      // Update inventory-only records
      if (inventoryOnlyUserIds.length > 0) {
        const { data, error } = await supabase
          .from('resource_inventory')
          .update(inventoryPayload)
          .in('id', inventoryOnlyUserIds)
          .select('id');

        if (error) throw error;
        updatedCount += data?.length || 0;
      }

      return { updatedCount, updates };
    },
    onMutate: async ({ userIds, displayUpdates }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['users-list'] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<UserProfile[]>(['users-list']);

      // Optimistically update the UI
      if (displayUpdates) {
        queryClient.setQueryData<UserProfile[]>(['users-list'], (old) => {
          if (!old) return old;
          return old.map((user) => {
            if (!userIds.includes(user.id)) return user;
            return { ...user, ...displayUpdates };
          });
        });
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['users-list'], context.previousData);
      }
      toast.error('Failed to update users');
      console.error('Bulk edit error:', err);
    },
    onSuccess: ({ updatedCount }) => {
      toast.success(`Updated ${updatedCount} user(s)`);
    },
    onSettled: () => {
      // Refetch to ensure consistency with DB
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
  });
}
