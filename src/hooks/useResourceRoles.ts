/**
 * Hook to fetch unique roles from the database with real-time subscription
 * Used for role dropdown in Find Available Resources panel
 * Fetches from product_roles table (same source as /admin/users)
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RoleOption {
  name: string;
  displayName: string;
  count: number;
}

async function fetchResourceRoles(): Promise<RoleOption[]> {
  // Fetch all product roles with user count
  const { data: productRoles, error: rolesError } = await supabase
    .from('product_roles')
    .select('id, name, code')
    .order('name');

  if (rolesError) {
    console.error('Error fetching product roles:', rolesError);
    throw rolesError;
  }

  // Fetch user_product_roles to count users per role
  const { data: userRoles, error: userRolesError } = await supabase
    .from('user_product_roles')
    .select('role_id');

  if (userRolesError) {
    console.error('Error fetching user roles:', userRolesError);
    throw userRolesError;
  }

  // Count users per role
  const roleCountMap = new Map<string, number>();
  userRoles?.forEach(ur => {
    roleCountMap.set(ur.role_id, (roleCountMap.get(ur.role_id) || 0) + 1);
  });

  // Build role options with counts
  return (productRoles || [])
    .map(role => ({
      name: role.name,
      displayName: role.name,
      count: roleCountMap.get(role.id) || 0
    }))
    .filter(role => role.count > 0) // Only show roles that have users assigned
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function useResourceRoles() {
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('product-roles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_roles',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['resource-roles'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_product_roles',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['resource-roles'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['resource-roles'],
    queryFn: fetchResourceRoles,
    staleTime: 30 * 1000,
  });
}
