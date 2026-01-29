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
 * Fetches the current user's module access permissions based on their product roles.
 * Super Admins always get full access to all modules.
 */
export function useUserModulePermissions() {
  const { user } = useAuth();
  const { isSuperAdmin, productRoles, isLoading: roleLoading } = useUserRole();

  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['user-module-permissions', user?.id, productRoles],
    queryFn: async (): Promise<UserModulePermission[]> => {
      if (!user) return [];
      
      // Super Admin gets full access to everything
      if (isSuperAdmin) {
        const { data: modules } = await supabase
          .from('admin_nav_modules')
          .select('module_key');
        
        return (modules || []).map(m => ({
          module_key: m.module_key,
          access_level: 'full' as ModuleAccessLevel,
        }));
      }

      // Get role codes for the user
      if (!productRoles || productRoles.length === 0) {
        // No roles = hidden for all modules
        const { data: modules } = await supabase
          .from('admin_nav_modules')
          .select('module_key');
        
        return (modules || []).map(m => ({
          module_key: m.module_key,
          access_level: 'hidden' as ModuleAccessLevel,
        }));
      }

      // Fetch permissions for the user's roles
      // Take the highest access level if user has multiple roles
      const { data, error } = await supabase
        .from('admin_role_module_permissions')
        .select('module_key, access_level')
        .in('role_code', productRoles);

      if (error) {
        console.error('Error fetching module permissions:', error);
        return [];
      }

      // Group by module_key and get highest access level
      const moduleAccessMap = new Map<string, ModuleAccessLevel>();
      const accessPriority: Record<string, number> = { full: 3, view: 2, hidden: 1, none: 0 };

      (data || []).forEach((row) => {
        const currentLevel = moduleAccessMap.get(row.module_key);
        const newLevel = (row.access_level === 'none' ? 'hidden' : row.access_level) as ModuleAccessLevel;
        
        if (!currentLevel || accessPriority[newLevel] > accessPriority[currentLevel]) {
          moduleAccessMap.set(row.module_key, newLevel);
        }
      });

      return Array.from(moduleAccessMap.entries()).map(([module_key, access_level]) => ({
        module_key,
        access_level,
      }));
    },
    enabled: !!user && !roleLoading,
    staleTime: 60000, // Cache for 1 minute
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
export function useModuleAccess() {
  const { permissions, isLoading: permissionsLoading } = useUserModulePermissions();
  const { enabledModules, isLoading: modulesLoading } = useEnabledModules();
  const { isSuperAdmin } = useUserRole();

  const isLoading = permissionsLoading || modulesLoading;

  /**
   * Get access level for a specific module
   * Returns 'hidden' if module is disabled at org level
   * Handles case-insensitive module key matching
   */
  const getModuleAccess = (moduleKey: string): ModuleAccessLevel => {
    // Normalize to lowercase for consistent matching
    const normalizedKey = moduleKey.toLowerCase();
    
    // Super Admin always gets full access
    if (isSuperAdmin) return 'full';

    // Check if module is enabled at org level first (org modules use uppercase)
    if (!enabledModules.includes(moduleKey.toUpperCase())) {
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
