import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

export interface ProductRole {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  scope: string;
  created_at: string;
  updated_at: string;
  user_count?: number;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_group: string;
  permission_level: 'Allow' | 'Deny';
}

export interface UserWithRole {
  id: string;
  user_id: string;
  role_id: string;
  business_lines: string[];
  created_at?: string;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    department_name: string | null;
  } | null;
  has_overrides: boolean;
}

export interface UserPermissionOverride {
  id: string;
  user_id: string;
  permission_group: string;
  override_value: 'Inherited' | 'Allow' | 'Deny';
  module: string;
}

// Action-level permissions — Project + Product modules (v1)
export const PERMISSION_GROUPS = [
  // Project module
  'Project: Create',
  'Project: Delete',
  'Project: Archive',
  'Project: Rename',
  'Project: Manage Members',
  'Project: Change Lead',
  'Project: Edit Settings',
  'Project: Export Data',
  'Project: View All Projects',
  'Project: Change Icon',
  // Product module — Stories
  'Product: Create Story',
  'Product: Delete Story',
  'Product: Edit Story',
  'Product: Rename Story',
  'Product: Assign Story',
  'Product: Change Story Status',
  'Product: Change Story Priority',
  'Product: Move Story to Sprint',
  'Product: Clone Story',
  // Product module — Epics & Sprints
  'Product: Create Epic',
  'Product: Delete Epic',
  'Product: Edit Epic',
  'Product: Create Sprint',
  'Product: Start Sprint',
  'Product: Close Sprint',
  'Product: Delete Sprint',
  // Product module — Board & General
  'Product: View Backlog',
  'Product: Manage Board',
  'Product: Add Comment',
  'Product: Delete Comment',
  'Product: Link Issues',
  'Product: Export Stories',
] as const;

export type PermissionGroup = typeof PERMISSION_GROUPS[number];
export type PermissionLevel = 'Allow' | 'Deny';

// Default permissions for new roles — all Deny until admin explicitly grants
const DEFAULT_PERMISSIONS: Record<PermissionGroup, PermissionLevel> = Object.fromEntries(
  PERMISSION_GROUPS.map(g => [g, 'Deny'])
) as Record<PermissionGroup, PermissionLevel>;

export function useProductRoles() {
  const { data: roles, isLoading, error, refetch } = useQuery({
    queryKey: ['product-roles'],
    queryFn: async () => {
      const { data: rolesData, error: rolesError } = await supabase
        .from('product_roles')
        .select('*')
        .order('name');

      if (rolesError) throw rolesError;

      const { data: userCounts, error: countsError } = await supabase
        .from('user_product_roles')
        .select('role_id');

      if (countsError) throw countsError;

      const countMap = (userCounts || []).reduce((acc, ur) => {
        acc[ur.role_id] = (acc[ur.role_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return (rolesData || []).map(role => ({
        ...role,
        user_count: countMap[role.id] || 0
      })) as ProductRole[];
    }
  });

  return { roles, isLoading, error, refetch };
}

export function useRolePermissions(roleId: string | null) {
  return useQuery({
    queryKey: ['role-permissions', roleId],
    queryFn: async () => {
      if (!roleId) return [];
      
      const { data, error } = await supabase
        .from('product_role_permissions')
        .select('*')
        .eq('role_id', roleId);

      if (error) throw error;
      return data as RolePermission[];
    },
    enabled: !!roleId
  });
}

export function useAllRolePermissions() {
  return useQuery({
    queryKey: ['all-role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_role_permissions')
        .select('*');

      if (error) throw error;
      return data as RolePermission[];
    }
  });
}

export function useUsersWithRole(roleId: string | null) {
  return useQuery({
    queryKey: ['users-with-role', roleId],
    queryFn: async () => {
      if (!roleId) return [];

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_product_roles')
        .select('*')
        .eq('role_id', roleId);

      if (rolesError) throw rolesError;

      if (!userRoles || userRoles.length === 0) return [];

      const userIds = userRoles.map(ur => ur.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, department_id')
        .eq('approval_status', 'APPROVED')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const deptIds = [...new Set((profiles || []).map(p => p.department_id).filter(Boolean))] as string[];
      let deptMap: Record<string, string> = {};
      if (deptIds.length > 0) {
        const { data: depts } = await supabase
          .from('capacity_departments')
          .select('id, name')
          .in('id', deptIds);
        deptMap = (depts || []).reduce((acc, d) => { acc[d.id] = d.name; return acc; }, {} as Record<string, string>);
      }

      const { data: overrides, error: overridesError } = await supabase
        .from('user_permission_overrides')
        .select('user_id')
        .in('user_id', userIds)
        .eq('module', 'Product')
        .neq('override_value', 'Inherited');

      if (overridesError) throw overridesError;

      const overrideUserIds = new Set((overrides || []).map(o => o.user_id));
      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = { ...p, department_name: p.department_id ? (deptMap[p.department_id] ?? null) : null };
        return acc;
      }, {} as Record<string, typeof profiles[0] & { department_name: string | null }>);

      return userRoles.map(ur => ({
        ...ur,
        user: profileMap[ur.user_id] || null,
        has_overrides: overrideUserIds.has(ur.user_id)
      })) as UserWithRole[];
    },
    enabled: !!roleId
  });
}

export function useUserOverrides(userId: string | null) {
  return useQuery({
    queryKey: ['user-overrides', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_permission_overrides')
        .select('*')
        .eq('user_id', userId)
        .eq('module', 'Product');

      if (error) throw error;
      return data as UserPermissionOverride[];
    },
    enabled: !!userId
  });
}

export function useSaveUserOverrides() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      overrides 
    }: { 
      userId: string; 
      overrides: { permission_group: string; override_value: string }[] 
    }) => {
      const { error: deleteError } = await supabase
        .from('user_permission_overrides')
        .delete()
        .eq('user_id', userId)
        .eq('module', 'Product');

      if (deleteError) throw deleteError;

      const toInsert = overrides
        .filter(o => o.override_value !== 'Inherited')
        .map(o => ({
          user_id: userId,
          permission_group: o.permission_group,
          override_value: o.override_value,
          module: 'Product'
        }));

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('user_permission_overrides')
          .insert(toInsert);

        if (insertError) throw insertError;
      }

      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-overrides', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['users-with-role'] });
      catalystToast.success('Overrides saved successfully');
    },
    onError: (error) => {
      catalystToast.error('Failed to save overrides: ' + (error as Error).message);
    }
  });
}

export function useUserProfile(userId: string | null) {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });
}

export function useUserProductRole(userId: string | null) {
  return useQuery({
    queryKey: ['user-product-role', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('user_product_roles')
        .select('*, role:product_roles(*)')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });
}

// === CRUD Mutations for Roles ===

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      name, 
      description, 
      is_active,
      permissions
    }: { 
      name: string; 
      description: string; 
      is_active: boolean;
      permissions?: Record<PermissionGroup, PermissionLevel>;
    }) => {
      // Generate code from name
      const code = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

      // Create role
      const { data: role, error: roleError } = await supabase
        .from('product_roles')
        .insert({
          name,
          code,
          description,
          is_active,
          scope: 'Product'
        })
        .select()
        .single();

      if (roleError) throw roleError;

      // Create permissions for the role
      const permsToUse = permissions || DEFAULT_PERMISSIONS;
      const permissionInserts = PERMISSION_GROUPS.map(group => ({
        role_id: role.id,
        permission_group: group,
        permission_level: permsToUse[group] || 'Deny'
      }));

      const { error: permsError } = await supabase
        .from('product_role_permissions')
        .insert(permissionInserts);

      if (permsError) throw permsError;

      return role as ProductRole;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-roles'] });
      queryClient.invalidateQueries({ queryKey: ['all-role-permissions'] });
      catalystToast.success('Role created successfully');
    },
    onError: (error) => {
      catalystToast.error('Failed to create role: ' + (error as Error).message);
    }
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      name, 
      description, 
      is_active 
    }: { 
      id: string; 
      name: string; 
      description: string; 
      is_active: boolean;
    }) => {
      const { data, error } = await supabase
        .from('product_roles')
        .update({
          name,
          description,
          is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ProductRole;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-roles'] });
      catalystToast.success('Role updated successfully');
    },
    onError: (error) => {
      catalystToast.error('Failed to update role: ' + (error as Error).message);
    }
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleId: string) => {
      // Delete permissions first
      const { error: permsError } = await supabase
        .from('product_role_permissions')
        .delete()
        .eq('role_id', roleId);

      if (permsError) throw permsError;

      // Delete user-role assignments
      const { error: assignError } = await supabase
        .from('user_product_roles')
        .delete()
        .eq('role_id', roleId);

      if (assignError) throw assignError;

      // Delete role
      const { error } = await supabase
        .from('product_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-roles'] });
      queryClient.invalidateQueries({ queryKey: ['all-role-permissions'] });
      catalystToast.success('Role deleted successfully');
    },
    onError: (error) => {
      catalystToast.error('Failed to delete role: ' + (error as Error).message);
    }
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      roleId, 
      permissions 
    }: { 
      roleId: string; 
      permissions: Record<string, PermissionLevel>;
    }) => {
      // Upsert ensures toggles work even if rows don't exist yet (e.g. after permission group migrations)
      const now = new Date().toISOString();
      const payload = Object.entries(permissions).map(([group, level]) => ({
        role_id: roleId,
        permission_group: group,
        permission_level: level,
        updated_at: now,
      }));

      const { error } = await supabase
        .from('product_role_permissions')
        .upsert(payload, { onConflict: 'role_id,permission_group' });

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['all-role-permissions'] });
      catalystToast.success('Permissions updated successfully');
    },
    onError: (error) => {
      catalystToast.error('Failed to update permissions: ' + (error as Error).message);
    }
  });
}

export function useAllProfiles() {
  return useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('approval_status', 'APPROVED')
        .order('full_name');
      if (error) throw error;
      return data as { id: string; email: string; full_name: string | null }[];
    }
  });
}

export function useAssignUserToRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const { error } = await supabase
        .from('user_product_roles')
        .insert({ user_id: userId, role_id: roleId, business_lines: [] });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['users-with-role', v.roleId] });
      queryClient.invalidateQueries({ queryKey: ['product-roles'] });
    },
    onError: (e) => catalystToast.error('Failed to assign user: ' + (e as Error).message),
  });
}

export function useRemoveUserFromRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userRoleId, roleId }: { userRoleId: string; roleId: string }) => {
      const { error } = await supabase
        .from('user_product_roles')
        .delete()
        .eq('id', userRoleId);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['users-with-role', v.roleId] });
      queryClient.invalidateQueries({ queryKey: ['product-roles'] });
    },
    onError: (e) => catalystToast.error('Failed to remove user: ' + (e as Error).message),
  });
}
