import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductRole {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  scope: string;
  created_at: string;
  user_count?: number;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_group: string;
  permission_level: 'Full' | 'View only' | 'Own only' | 'None';
}

export interface UserWithRole {
  id: string;
  user_id: string;
  role_id: string;
  business_lines: string[];
  user: {
    id: string;
    email: string;
    full_name: string | null;
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

export function useProductRoles() {
  const { data: roles, isLoading, error } = useQuery({
    queryKey: ['product-roles'],
    queryFn: async () => {
      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('product_roles')
        .select('*')
        .order('name');

      if (rolesError) throw rolesError;

      // Fetch user counts per role
      const { data: userCounts, error: countsError } = await supabase
        .from('user_product_roles')
        .select('role_id');

      if (countsError) throw countsError;

      // Count users per role
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

  return { roles, isLoading, error };
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

      // Fetch users with this role
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_product_roles')
        .select('*')
        .eq('role_id', roleId);

      if (rolesError) throw rolesError;

      if (!userRoles || userRoles.length === 0) return [];

      // Fetch user profiles
      const userIds = userRoles.map(ur => ur.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Fetch overrides
      const { data: overrides, error: overridesError } = await supabase
        .from('user_permission_overrides')
        .select('user_id')
        .in('user_id', userIds)
        .eq('module', 'Product')
        .neq('override_value', 'Inherited');

      if (overridesError) throw overridesError;

      const overrideUserIds = new Set((overrides || []).map(o => o.user_id));
      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, typeof profiles[0]>);

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
      // Delete existing overrides for this user
      const { error: deleteError } = await supabase
        .from('user_permission_overrides')
        .delete()
        .eq('user_id', userId)
        .eq('module', 'Product');

      if (deleteError) throw deleteError;

      // Insert new overrides (only non-Inherited ones)
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
      toast.success('Overrides saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save overrides: ' + (error as Error).message);
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
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!userId
  });
}
