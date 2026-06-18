// Admin-side hooks for the Role x Module access matrix (/admin/feature-flags).
// Reads/writes admin_role_module_permissions — the SAME table useUserModulePermissions
// resolves at login. role_code holds either a system role (user_roles.role) or a
// product role (product_roles.code). admin + super_admin bypass the matrix at runtime.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { catalystToast } from '@/lib/catalystToast';

export type AccessLevel = 'full' | 'view' | 'hidden';

export interface MatrixRole {
  code: string;
  name: string;
  tier: 'system' | 'product';
  bypass: boolean;
}

export interface MatrixModule {
  module_key: string;
  name: string;
  parent_module: string | null;
  nav_type: string;
  sort_order: number;
  group_name: string;
}

// System roles are an enum on user_roles.role, not a table — declare them here.
// admin bypasses the matrix (always full), matching the runtime hook.
const SYSTEM_ROLES: MatrixRole[] = [
  { code: 'admin', name: 'Admin', tier: 'system', bypass: true },
  { code: 'program_manager', name: 'Program manager', tier: 'system', bypass: false },
  { code: 'team_lead', name: 'Team lead', tier: 'system', bypass: false },
  { code: 'user', name: 'User', tier: 'system', bypass: false },
];

export function useModuleAccessRoles() {
  return useQuery({
    queryKey: ['module-access-roles'],
    queryFn: async (): Promise<MatrixRole[]> => {
      const { data, error } = await supabase
        .from('product_roles')
        .select('code, name, is_active')
        .order('name');
      if (error) throw error;
      const product = (data || [])
        .filter((r: any) => r.is_active !== false)
        .map((r: any): MatrixRole => ({
          code: r.code,
          name: r.name,
          tier: 'product',
          bypass: r.code === 'super_admin',
        }));
      return [...SYSTEM_ROLES, ...product];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useModuleAccessModules() {
  return useQuery({
    queryKey: ['module-access-modules'],
    queryFn: async (): Promise<MatrixModule[]> => {
      const { data, error } = await supabase
        .from('admin_nav_modules')
        .select('module_key, name, parent_module, nav_type, sort_order, group_name')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as MatrixModule[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Returns matrix[role_code][module_key] = access_level. Missing entry => 'hidden'.
export function useModuleAccessMatrix() {
  return useQuery({
    queryKey: ['module-access-matrix'],
    queryFn: async (): Promise<Record<string, Record<string, AccessLevel>>> => {
      const { data, error } = await supabase
        .from('admin_role_module_permissions')
        .select('role_code, module_key, access_level');
      if (error) throw error;
      const map: Record<string, Record<string, AccessLevel>> = {};
      (data || []).forEach((r: any) => {
        if (!map[r.role_code]) map[r.role_code] = {};
        map[r.role_code][r.module_key] = r.access_level as AccessLevel;
      });
      return map;
    },
    staleTime: 30 * 1000,
  });
}

export interface AccessUpsert {
  role_code: string;
  module_key: string;
  access_level: AccessLevel;
}

export function useSetModuleAccess() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (rows: AccessUpsert[]) => {
      if (rows.length === 0) return;
      const payload = rows.map((r) => ({
        role_code: r.role_code,
        module_key: r.module_key,
        access_level: r.access_level,
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('admin_role_module_permissions')
        .upsert(payload, { onConflict: 'role_code,module_key' });
      if (error) throw error;
    },
    onMutate: async (rows) => {
      await qc.cancelQueries({ queryKey: ['module-access-matrix'] });
      const prev = qc.getQueryData<Record<string, Record<string, AccessLevel>>>(['module-access-matrix']);
      if (prev) {
        const next: Record<string, Record<string, AccessLevel>> = { ...prev };
        rows.forEach((r) => {
          next[r.role_code] = { ...(next[r.role_code] || {}), [r.module_key]: r.access_level };
        });
        qc.setQueryData(['module-access-matrix'], next);
      }
      return { prev };
    },
    onError: (err: any, _rows, ctx) => {
      if (ctx?.prev) qc.setQueryData(['module-access-matrix'], ctx.prev);
      catalystToast.error('Could not update access', err?.message ?? 'Unknown error');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['module-access-matrix'] });
      qc.invalidateQueries({ queryKey: ['user-module-permissions'] });
    },
  });
}
