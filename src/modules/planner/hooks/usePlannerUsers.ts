// ============================================================
// PLANNER USERS HOOK
// Fetches users for assignee dropdowns with roles from /admin/users
// Roles come from user_product_roles + product_roles tables
// Returns empty list when database is empty (no mock data)
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PlannerUser } from '../types';

/**
 * Fetches user roles from user_product_roles + product_roles tables
 * This is the authoritative source for roles, managed in /admin/users
 */
async function fetchUserRolesMap(): Promise<Map<string, string>> {
  const [{ data: userProductRoles }, { data: productRoles }] = await Promise.all([
    supabase.from('user_product_roles').select('user_id, role_id'),
    supabase.from('product_roles').select('id, name'),
  ]);

  // Create role_id → name map
  const roleIdToName = new Map<string, string>(
    (productRoles || []).map((r) => [r.id, r.name])
  );

  // Create user_id → role_name map (first role only for display)
  const userRoleMap = new Map<string, string>();
  (userProductRoles || []).forEach((upr) => {
    const roleName = roleIdToName.get(upr.role_id);
    if (roleName && !userRoleMap.has(upr.user_id)) {
      userRoleMap.set(upr.user_id, roleName);
    }
  });

  return userRoleMap;
}

export function usePlannerUsers() {
  return useQuery({
    queryKey: ['planner-users'],
    queryFn: async () => {
      // Fetch profiles and roles in parallel
      const [profilesResult, userRoleMap] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name')
          .order('full_name')
          .limit(50),
        fetchUserRolesMap(),
      ]);

      if (profilesResult.error) {
        console.error('Error fetching users:', profilesResult.error);
        return [];
      }

      const users = (profilesResult.data || []).map((row): PlannerUser => ({
        id: row.id,
        name: row.full_name || 'Unknown',
        initials: (row.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
        // Role from user_product_roles (managed in /admin/users), fallback to Team Member
        role: userRoleMap.get(row.id) || 'Team Member',
        team: 'Team',
        // online presence is handled by real-time presence system, not mocked
        online: false,
      }));

      return users;
    },
  });
}

/**
 * Standalone hook for fetching user roles map
 * Can be used by components that need role lookup
 */
export function usePlannerUserRoles() {
  return useQuery({
    queryKey: ['planner-user-roles'],
    queryFn: fetchUserRolesMap,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}
