// src/hooks/useModuleMatrix.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============================================
// TYPES
// ============================================
export type AccessLevel = 'full' | 'view' | 'hidden';

export interface MatrixCell {
  module_key: string;
  module_name: string;
  group_name: string;
  sort_order: number;
  role_code: string;
  role_name: string;
  is_system_role: boolean;
  access_level: AccessLevel;
}

export interface ModuleGroup {
  group_name: string;
  module_count: number;
}

export interface PermissionStats {
  total_modules: number;
  total_roles: number;
  full_count: number;
  view_count: number;
  hidden_count: number;
}

export interface MatrixFilters {
  roleCode: string | null;
  groupName: string | null;
  accessLevel: AccessLevel | null;
  search: string;
}

export interface Role {
  code: string;
  name: string;
}

// ============================================
// HOOKS
// ============================================

// Get all roles for dropdown
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async (): Promise<Role[]> => {
      const { data, error } = await supabase
        .from('product_roles')
        .select('code, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });
}

// Get module groups for dropdown
export function useModuleGroups() {
  return useQuery({
    queryKey: ['module-groups'],
    queryFn: async (): Promise<ModuleGroup[]> => {
      const { data, error } = await supabase.rpc('get_module_groups');
      if (error) throw error;
      return data as ModuleGroup[];
    },
    staleTime: 60000,
  });
}

// Get stats for cards
export function usePermissionStats(roleCode: string | null = null) {
  return useQuery({
    queryKey: ['permission-stats', roleCode],
    queryFn: async (): Promise<PermissionStats> => {
      const { data, error } = await supabase.rpc('get_permission_stats', {
        p_role_code: roleCode
      });
      if (error) throw error;
      return data as unknown as PermissionStats;
    },
    staleTime: 10000,
  });
}

// Get matrix data
export function useModuleMatrix(filters: MatrixFilters) {
  return useQuery({
    queryKey: ['module-matrix', filters],
    queryFn: async (): Promise<MatrixCell[]> => {
      const { data, error } = await supabase.rpc('get_module_matrix', {
        p_role_code: filters.roleCode,
        p_group_name: filters.groupName,
        p_access_level: filters.accessLevel,
        p_search: filters.search || null
      });
      if (error) throw error;
      return data as MatrixCell[];
    },
    staleTime: 10000,
  });
}

// Update single permission
export function useUpdatePermission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ roleCode, moduleKey, accessLevel }: {
      roleCode: string;
      moduleKey: string;
      accessLevel: AccessLevel;
    }) => {
      const { data, error } = await supabase.rpc('update_module_permission', {
        p_role_code: roleCode,
        p_module_key: moduleKey,
        p_access_level: accessLevel
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['permission-stats'] });
    },
  });
}

// Bulk update permissions
export function useBulkUpdate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ moduleKeys, roleCodes, accessLevel }: {
      moduleKeys: string[];
      roleCodes: string[];
      accessLevel: AccessLevel;
    }) => {
      const { data, error } = await supabase.rpc('bulk_update_permissions', {
        p_module_keys: moduleKeys,
        p_role_codes: roleCodes,
        p_access_level: accessLevel
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['permission-stats'] });
    },
  });
}

// Helper: Cycle to next access level
export function cycleAccessLevel(current: AccessLevel): AccessLevel {
  const cycle: Record<AccessLevel, AccessLevel> = {
    'full': 'view',
    'view': 'hidden',
    'hidden': 'full'
  };
  return cycle[current];
}
