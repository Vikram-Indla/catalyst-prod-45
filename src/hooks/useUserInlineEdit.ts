/**
 * useUserInlineEdit - Hook for inline editing user fields with auto-save
 * Handles optimistic updates and rollback on error
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserProfile } from './useUsers';

export type EditableUserField = 
  | 'full_name' 
  | 'job_role' 
  | 'department_id' 
  | 'assignment_id' 
  | 'contract_start_date' 
  | 'contract_end_date' 
  | 'vendor_id' 
  | 'resource_type' 
  | 'country_id' 
  | 'location_id'
  | 'ctc';

interface InlineEditParams {
  userId: string;
  field: EditableUserField;
  value: string | null;
  displayValue?: string | null; // For showing in UI before refresh
  hasEmail: boolean; // Distinguishes profile users from inventory-only users
}

interface ReferenceData {
  vendors: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string }>;
  countries: Array<{ id: string; name: string; code?: string }>;
  departments: Array<{ id: string; name: string }>;
  assignments: Array<{ id: string; name: string }>;
}

export function useUserInlineEdit(referenceData: ReferenceData) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, field, value, hasEmail }: InlineEditParams) => {
      // Fields that go to resource_inventory vs profiles
      const inventoryFields = [
        'job_role', 'department_id', 'assignment_id', 
        'contract_start_date', 'contract_end_date', 
        'vendor_id', 'resource_type', 'country_id', 'location_id', 'ctc'
      ];
      const profileFields = ['full_name'];

      // Build update payloads based on field type
      const isInventoryField = inventoryFields.includes(field);
      const isProfileField = profileFields.includes(field);

      // Lookup display names for inventory fields
      let vendorName: string | null = null;
      let departmentName: string | null = null;
      let locationName: string | null = null;
      let countryName: string | null = null;

      if (field === 'vendor_id' && value) {
        const vendor = referenceData.vendors.find(v => v.id === value);
        vendorName = vendor?.name || null;
      }
      if (field === 'department_id' && value) {
        const dept = referenceData.departments.find(d => d.id === value);
        departmentName = dept?.name || null;
      }
      if (field === 'location_id' && value) {
        const loc = referenceData.locations.find(l => l.id === value);
        locationName = loc?.name || null;
      }
      if (field === 'country_id' && value) {
        const country = referenceData.countries.find(c => c.id === value);
        countryName = country?.name || null;
      }

      if (hasEmail) {
        // Real profile user: update profile and/or resource_inventory

        if (isProfileField) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ 
              [field]: value, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', userId);

          if (profileError) throw profileError;
        }

        if (isInventoryField) {
          // Check if resource_inventory exists for this profile
          const { data: existingInventory } = await supabase
            .from('resource_inventory')
            .select('id')
            .eq('profile_id', userId)
            .maybeSingle();

          // Map field names for resource_inventory
          let updatePayload: Record<string, any> = {
            updated_at: new Date().toISOString(),
          };

          // Handle field name mapping
          if (field === 'job_role') {
            updatePayload.role_name = value;
          } else if (field === 'vendor_id') {
            updatePayload.vendor_id = value || null;
            updatePayload.vendor_name = vendorName;
          } else if (field === 'department_id') {
            updatePayload.department_id = value || null;
            updatePayload.department_name = departmentName;
          } else if (field === 'location_id') {
            updatePayload.location_id = value || null;
          } else if (field === 'country_id') {
            updatePayload.country_id = value || null;
          } else {
            updatePayload[field] = value;
          }

          if (existingInventory?.id) {
            const { error } = await supabase
              .from('resource_inventory')
              .update(updatePayload)
              .eq('id', existingInventory.id);

            if (error) throw error;
          } else {
            // Create new inventory record
            const insertPayload = {
              profile_id: userId,
              is_active: true,
              ...updatePayload,
            };
            const { error } = await supabase
              .from('resource_inventory')
              .insert([insertPayload as any]);

            if (error) throw error;
          }
        }
      } else {
        // Inventory-only user: update resource_inventory directly
        let updatePayload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };

        if (field === 'full_name') {
          updatePayload.name = value;
        } else if (field === 'job_role') {
          updatePayload.role_name = value;
        } else if (field === 'vendor_id') {
          updatePayload.vendor_id = value || null;
          updatePayload.vendor_name = vendorName;
        } else if (field === 'department_id') {
          updatePayload.department_id = value || null;
          updatePayload.department_name = departmentName;
        } else if (field === 'location_id') {
          updatePayload.location_id = value || null;
        } else if (field === 'country_id') {
          updatePayload.country_id = value || null;
        } else {
          updatePayload[field] = value;
        }

        const { error } = await supabase
          .from('resource_inventory')
          .update(updatePayload)
          .eq('id', userId);

        if (error) throw error;
      }

      return { userId, field, value };
    },
    onMutate: async ({ userId, field, displayValue }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['users-list'] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<UserProfile[]>(['users-list']);

      // Optimistically update the UI
      queryClient.setQueryData<UserProfile[]>(['users-list'], (old) => {
        if (!old) return old;
        return old.map((user) => {
          if (user.id !== userId) return user;

          // Map field to UserProfile property
          const fieldMap: Record<EditableUserField, keyof UserProfile> = {
            full_name: 'full_name',
            job_role: 'job_role',
            department_id: 'department_name',
            assignment_id: 'assignment_name',
            contract_start_date: 'contract_start_date',
            contract_end_date: 'contract_end_date',
            vendor_id: 'vendor',
            resource_type: 'resource_type',
            country_id: 'country',
            location_id: 'location',
            ctc: 'ctc',
          };

          const targetField = fieldMap[field];
          return { ...user, [targetField]: displayValue ?? null };
        });
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['users-list'], context.previousData);
      }
      toast.error('Failed to save changes');
      console.error('Inline edit error:', err);
    },
    onSuccess: () => {
      // Show subtle success feedback
      toast.success('Saved', { duration: 1500 });
    },
    onSettled: () => {
      // Refetch to ensure consistency with DB
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
  });
}
