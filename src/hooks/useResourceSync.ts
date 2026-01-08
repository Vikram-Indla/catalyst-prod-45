/**
 * useResourceSync - Centralized real-time sync and cache invalidation
 * Ensures /admin/users and Capacity Planner stay in sync
 */

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RESOURCE_QUERY_KEYS, ALL_RESOURCE_QUERY_KEYS } from '@/types/resourceProfile';

/**
 * Hook to set up real-time subscriptions for all resource-related tables
 * Call this once at app level or in relevant pages
 */
export function useResourceRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const invalidateAll = () => {
      ALL_RESOURCE_QUERY_KEYS.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    };

    const invalidateRefs = () => {
      queryClient.invalidateQueries({ queryKey: RESOURCE_QUERY_KEYS.productRoles });
      queryClient.invalidateQueries({ queryKey: RESOURCE_QUERY_KEYS.resourceVendors });
      queryClient.invalidateQueries({ queryKey: RESOURCE_QUERY_KEYS.resourceLocations });
      queryClient.invalidateQueries({ queryKey: RESOURCE_QUERY_KEYS.resourceCountries });
      queryClient.invalidateQueries({ queryKey: RESOURCE_QUERY_KEYS.resourceAssignments });
      queryClient.invalidateQueries({ queryKey: RESOURCE_QUERY_KEYS.capacityDepartments });
      // Also invalidate main lists since they depend on lookups
      invalidateAll();
    };

    const channel = supabase
      .channel('resource-sync-global')
      // Core resource tables
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_inventory' }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_product_roles' }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_allocations' }, () => {
        queryClient.invalidateQueries({ queryKey: RESOURCE_QUERY_KEYS.resourceAllocations });
        queryClient.invalidateQueries({ queryKey: RESOURCE_QUERY_KEYS.capacityResources });
      })
      // Reference tables
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_roles' }, invalidateRefs)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_vendors' }, invalidateRefs)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_locations' }, invalidateRefs)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_countries' }, invalidateRefs)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_assignments' }, invalidateRefs)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'capacity_departments' }, invalidateRefs)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Hook to invalidate all resource-related caches after a mutation
 */
export function useInvalidateResourceCaches() {
  const queryClient = useQueryClient();

  const invalidateAll = useCallback(() => {
    ALL_RESOURCE_QUERY_KEYS.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  }, [queryClient]);

  const invalidateUser = useCallback((userId: string) => {
    queryClient.invalidateQueries({ queryKey: RESOURCE_QUERY_KEYS.userInventory(userId) });
    invalidateAll();
  }, [queryClient, invalidateAll]);

  return { invalidateAll, invalidateUser };
}

/**
 * Build audit log entry for user updates
 */
export interface AuditLogEntry {
  user_id: string;
  event_type: string;
  actor_id: string | null;
  event_details: Record<string, unknown>;
  created_at: string;
}

export async function logUserUpdate(
  userId: string,
  changedFields: string[]
): Promise<void> {
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    const eventDetails = JSON.parse(JSON.stringify({
      route: '/admin/users',
      fields_updated: changedFields,
      timestamp: new Date().toISOString(),
    }));
    
    await supabase.from('auth_audit_log').insert([{
      user_id: userId,
      event_type: 'user_profile_updated',
      actor_id: currentUser?.id || null,
      event_details: eventDetails,
      created_at: new Date().toISOString(),
    }]);
  } catch (error) {
    console.error('Failed to log user update:', error);
    // Don't throw - audit logging failure shouldn't block the update
  }
}
