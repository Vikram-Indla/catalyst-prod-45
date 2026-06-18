// src/hooks/useModuleAccess.ts
// Role-based module access control hook
// Enforces: Full (nav + content + edit), View (nav + content read-only), Hidden (no visibility)

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useUserRole } from './useUserRole';
import { useEnabledModules } from './useModules';

export type ModuleAccessLevel = 'full' | 'view' | 'hidden';

interface UserModulePermission {
  module_key: string;
  access_level: ModuleAccessLevel;
}

/**
 * Fetches the current user's module access permissions based on their product roles,
 * merged with any per-user override stored on profiles.module_access.
 *
 * Priority (highest wins):
 *   1. profiles.module_access override (set at invite time by admin)
 *   2. admin_role_module_permissions (role-based defaults)
 *
 * Super Admins bypass both — always full access.
 */
export function useUserModulePermissions() {
  const { user } = useAuth();
  const { role, isAdmin, isSuperAdmin, productRoles, isLoading: roleLoading } = useUserRole();

  // Access resolves against BOTH the system role (user_roles.role) and the product
  // role codes (product_roles.code). admin_role_module_permissions.role_code holds
  // either. Highest access level across all of a user's roles wins.
  const roleCodes = [
    ...(role ? [role] : []),
    ...(productRoles || []),
  ];

  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['user-module-permissions', user?.id, roleCodes],
    queryFn: async (): Promise<UserModulePermission[]> => {
      if (!user) return [];

      // Admin (system) and Super Admin (product) bypass the matrix — always full
      if (isAdmin || isSuperAdmin) {
        const { data: modules } = await supabase
          .from('admin_nav_modules')
          .select('module_key');
        return (modules || []).map(m => ({
          module_key: m.module_key,
          access_level: 'full' as ModuleAccessLevel,
        }));
      }

      // Fetch role-based permissions and per-user override in parallel
      const [rolePermsResult, profileResult] = await Promise.all([
        roleCodes.length > 0
          ? supabase
              .from('admin_role_module_permissions')
              .select('module_key, access_level')
              .in('role_code', roleCodes)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('profiles')
          .select('module_access')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

      if (rolePermsResult.error) {
        console.error('Error fetching module permissions:', rolePermsResult.error);
      }

      // Build role-based map (highest role level wins across multiple roles)
      const accessPriority: Record<string, number> = { full: 3, view: 2, hidden: 1, none: 0 };
      const roleMap = new Map<string, ModuleAccessLevel>();

      (rolePermsResult.data || []).forEach((row) => {
        const current = roleMap.get(row.module_key);
        const next = (row.access_level === 'none' ? 'hidden' : row.access_level) as ModuleAccessLevel;
        if (!current || accessPriority[next] > accessPriority[current]) {
          roleMap.set(row.module_key, next);
        }
      });

      // Per-user override from profiles.module_access — set at invite time.
      // Record<string, boolean>: true → 'full', false → 'hidden'.
      // An empty object ({}) means no override — fall through to role defaults.
      const userOverride = (profileResult.data?.module_access ?? {}) as Record<string, boolean>;
      const hasOverride = Object.keys(userOverride).length > 0;

      if (hasOverride) {
        // Merge: for each key in the override, replace the role-based level.
        // Keys absent from the override keep their role-based value.
        const merged = new Map<string, ModuleAccessLevel>(roleMap);
        Object.entries(userOverride).forEach(([key, granted]) => {
          merged.set(key, granted ? 'full' : 'hidden');
        });
        return Array.from(merged.entries()).map(([module_key, access_level]) => ({
          module_key,
          access_level,
        }));
      }

      // No per-user override — use role defaults only.
      // If the user has no roles at all, everything is hidden.
      if (roleCodes.length === 0) {
        const { data: modules } = await supabase
          .from('admin_nav_modules')
          .select('module_key');
        return (modules || []).map(m => ({
          module_key: m.module_key,
          access_level: 'hidden' as ModuleAccessLevel,
        }));
      }

      return Array.from(roleMap.entries()).map(([module_key, access_level]) => ({
        module_key,
        access_level,
      }));
    },
    enabled: !!user && !roleLoading,
    staleTime: 60000,
  });

  return {
    permissions: permissions || [],
    isLoading: roleLoading || permissionsLoading,
  };
}

/**
 * Primary hook for checking module access.
 * Combines org module enablement with role-based access control.
 */
// Core navigation modules that should NOT be blocked by org_modules
// These are controlled purely by role-based access in admin_role_module_permissions
// All top-level hub modules are governed purely by role-based access
// (admin_role_module_permissions), bypassing the org_modules availability layer.
// org_modules is an optional per-org feature-toggle layer (currently unpopulated);
// gating hub nav on it would hide every non-core hub for all non-admins.
const CORE_NAV_MODULES = new Set([
  'home', 'enterprise', 'product', 'releases', 'operations', 'tasks',
  'planner', 'testhub', 'workhub', 'wiki',
  'settings', 'create', 'notifications', 'global_search'
]);

export function useModuleAccess() {
  const { permissions, isLoading: permissionsLoading } = useUserModulePermissions();
  const { enabledModules, isLoading: modulesLoading } = useEnabledModules();
  const { isAdmin, isSuperAdmin } = useUserRole();

  const isLoading = permissionsLoading || modulesLoading;

  /**
   * Get access level for a specific module
   * - Core nav modules: Only checks role-based permissions (not org_modules)
   * - Feature modules: Checks org_modules first, then role-based permissions
   * Handles case-insensitive module key matching
   */
  const getModuleAccess = (moduleKey: string): ModuleAccessLevel => {
    // Normalize to lowercase for consistent matching
    const normalizedKey = moduleKey.toLowerCase();
    
    // Admin (system) and Super Admin (product) always get full access
    if (isAdmin || isSuperAdmin) return 'full';

    // Core nav modules bypass org_modules check - controlled purely by role permissions
    const isCoreModule = CORE_NAV_MODULES.has(normalizedKey);
    
    // For non-core modules, check if module is enabled at org level (org modules use uppercase)
    if (!isCoreModule && !enabledModules.includes(moduleKey.toUpperCase())) {
      return 'hidden';
    }

    // Check role-based permission (permissions table uses lowercase keys)
    const permission = permissions.find(p => p.module_key.toLowerCase() === normalizedKey);
    return permission?.access_level || 'hidden';
  };

  /**
   * Check if user can see the module in navigation
   * True for 'full' or 'view' access
   */
  const canViewInNav = (moduleKey: string): boolean => {
    const access = getModuleAccess(moduleKey);
    return access === 'full' || access === 'view';
  };

  /**
   * Check if user can access module content (view or full)
   * True for 'full' or 'view' access - both can see content
   */
  const canAccessContent = (moduleKey: string): boolean => {
    const access = getModuleAccess(moduleKey);
    return access === 'full' || access === 'view';
  };

  /**
   * Check if user has full access (can edit/modify)
   * True only for 'full' access
   */
  const hasFullAccess = (moduleKey: string): boolean => {
    return getModuleAccess(moduleKey) === 'full';
  };

  /**
   * Check if user has read-only access (can view but not edit)
   * True only for 'view' access
   */
  const isReadOnly = (moduleKey: string): boolean => {
    return getModuleAccess(moduleKey) === 'view';
  };

  /**
   * Check if module is completely hidden
   */
  const isHidden = (moduleKey: string): boolean => {
    return getModuleAccess(moduleKey) === 'hidden';
  };

  return {
    isLoading,
    getModuleAccess,
    canViewInNav,
    canAccessContent,
    hasFullAccess,
    isReadOnly,
    isHidden,
    permissions,
  };
}

/**
 * Hook for a single module access check
 */
export function useModuleAccessLevel(moduleKey: string) {
  const { getModuleAccess, canViewInNav, canAccessContent, hasFullAccess, isReadOnly, isHidden, isLoading } = useModuleAccess();

  return {
    accessLevel: getModuleAccess(moduleKey),
    canViewInNav: canViewInNav(moduleKey),
    canAccessContent: canAccessContent(moduleKey),
    hasFullAccess: hasFullAccess(moduleKey),
    isReadOnly: isReadOnly(moduleKey),
    isHidden: isHidden(moduleKey),
    isLoading,
  };
}
