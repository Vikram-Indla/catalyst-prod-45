import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { PERMISSION_GROUPS, PermissionLevel } from './useProductRoles';

export type ProductPermissionKey = typeof PERMISSION_GROUPS[number];

interface EffectivePermissions {
  permissions: Record<ProductPermissionKey, PermissionLevel>;
  isLoading: boolean;
  hasPermission: (key: ProductPermissionKey, requiredLevel?: PermissionLevel) => boolean;
  canView: (key: ProductPermissionKey) => boolean;
  canEdit: (key: ProductPermissionKey) => boolean;
  canViewOwn: (key: ProductPermissionKey) => boolean;
  isSuperAdmin: boolean;
}

/**
 * Hook to get effective product permissions for the current user.
 * Combines role permissions with any user-specific overrides.
 */
export function useProductPermissions(): EffectivePermissions {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['effective-product-permissions', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Check if user is super admin (system role)
      const { data: systemRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      const isSuperAdmin = !!systemRole;

      // Get user's product role
      const { data: userProductRole } = await supabase
        .from('user_product_roles')
        .select('role_id')
        .eq('user_id', user.id)
        .maybeSingle();

      let rolePermissions: Record<string, PermissionLevel> = {};

      if (userProductRole) {
        // Get role permissions
        const { data: perms } = await supabase
          .from('product_role_permissions')
          .select('permission_group, permission_level')
          .eq('role_id', userProductRole.role_id);

        if (perms) {
          rolePermissions = perms.reduce((acc, p) => {
            acc[p.permission_group] = p.permission_level as PermissionLevel;
            return acc;
          }, {} as Record<string, PermissionLevel>);
        }
      }

      // Get user overrides
      const { data: overrides } = await supabase
        .from('user_permission_overrides')
        .select('permission_group, override_value')
        .eq('user_id', user.id)
        .eq('module', 'Product')
        .neq('override_value', 'Inherited');

      // Apply overrides
      const effectivePermissions: Record<ProductPermissionKey, PermissionLevel> = {} as any;
      
      for (const group of PERMISSION_GROUPS) {
        // Start with role permission or 'None'
        let level: PermissionLevel = rolePermissions[group] || 'None';

        // Apply override if exists
        const override = overrides?.find(o => o.permission_group === group);
        if (override) {
          if (override.override_value === 'Allow') {
            level = 'Full';
          } else if (override.override_value === 'Deny') {
            level = 'None';
          }
        }

        // Super admin always has Full access
        if (isSuperAdmin) {
          level = 'Full';
        }

        effectivePermissions[group] = level;
      }

      return { permissions: effectivePermissions, isSuperAdmin };
    },
    enabled: !!user,
  });

  const defaultPermissions = PERMISSION_GROUPS.reduce((acc, group) => {
    acc[group] = 'None';
    return acc;
  }, {} as Record<ProductPermissionKey, PermissionLevel>);

  const permissions = data?.permissions || defaultPermissions;
  const isSuperAdmin = data?.isSuperAdmin || false;

  const hasPermission = (key: ProductPermissionKey, requiredLevel: PermissionLevel = 'View only'): boolean => {
    if (isSuperAdmin) return true;
    
    const level = permissions[key];
    const levelHierarchy: Record<PermissionLevel, number> = {
      'Full': 4,
      'View only': 3,
      'Own only': 2,
      'None': 0,
    };

    return levelHierarchy[level] >= levelHierarchy[requiredLevel];
  };

  const canView = (key: ProductPermissionKey): boolean => {
    if (isSuperAdmin) return true;
    const level = permissions[key];
    return level !== 'None';
  };

  const canEdit = (key: ProductPermissionKey): boolean => {
    if (isSuperAdmin) return true;
    const level = permissions[key];
    return level === 'Full';
  };

  const canViewOwn = (key: ProductPermissionKey): boolean => {
    if (isSuperAdmin) return true;
    const level = permissions[key];
    return level === 'Own only' || level === 'View only' || level === 'Full';
  };

  return {
    permissions,
    isLoading,
    hasPermission,
    canView,
    canEdit,
    canViewOwn,
    isSuperAdmin,
  };
}

/**
 * Check if user can access a specific item based on ownership.
 */
export function useCanAccessItem(
  permissionKey: ProductPermissionKey,
  itemOwnerId?: string | null
): { canView: boolean; canEdit: boolean; isLoading: boolean } {
  const { user } = useAuth();
  const { permissions, isLoading, isSuperAdmin } = useProductPermissions();

  if (isLoading) {
    return { canView: false, canEdit: false, isLoading: true };
  }

  if (isSuperAdmin) {
    return { canView: true, canEdit: true, isLoading: false };
  }

  const level = permissions[permissionKey];
  const isOwner = itemOwnerId && user?.id === itemOwnerId;

  let canView = false;
  let canEdit = false;

  switch (level) {
    case 'Full':
      canView = true;
      canEdit = true;
      break;
    case 'View only':
      canView = true;
      canEdit = false;
      break;
    case 'Own only':
      canView = !!isOwner;
      canEdit = !!isOwner;
      break;
    case 'None':
    default:
      canView = false;
      canEdit = false;
  }

  return { canView, canEdit, isLoading: false };
}
