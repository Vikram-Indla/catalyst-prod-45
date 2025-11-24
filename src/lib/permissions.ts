import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'program_manager' | 'team_lead' | 'user';

export interface PermissionConfig {
  entity: string;
  action: 'create' | 'edit' | 'delete' | 'view';
  minRole: UserRole;
}

const PERMISSIONS: PermissionConfig[] = [
  // Strategic Themes
  { entity: 'themes', action: 'view', minRole: 'user' },
  { entity: 'themes', action: 'create', minRole: 'team_lead' },
  { entity: 'themes', action: 'edit', minRole: 'team_lead' },
  { entity: 'themes', action: 'delete', minRole: 'program_manager' },

  // Initiatives
  { entity: 'initiatives', action: 'view', minRole: 'user' },
  { entity: 'initiatives', action: 'create', minRole: 'team_lead' },
  { entity: 'initiatives', action: 'edit', minRole: 'team_lead' },
  { entity: 'initiatives', action: 'delete', minRole: 'program_manager' },

  // Epics
  { entity: 'epics', action: 'view', minRole: 'user' },
  { entity: 'epics', action: 'create', minRole: 'team_lead' },
  { entity: 'epics', action: 'edit', minRole: 'team_lead' },
  { entity: 'epics', action: 'delete', minRole: 'program_manager' },

  // Features
  { entity: 'features', action: 'view', minRole: 'user' },
  { entity: 'features', action: 'create', minRole: 'team_lead' },
  { entity: 'features', action: 'edit', minRole: 'team_lead' },
  { entity: 'features', action: 'delete', minRole: 'program_manager' },

  // Stories
  { entity: 'stories', action: 'view', minRole: 'user' },
  { entity: 'stories', action: 'create', minRole: 'user' },
  { entity: 'stories', action: 'edit', minRole: 'user' },
  { entity: 'stories', action: 'delete', minRole: 'team_lead' },

  // Admin functions
  { entity: 'admin', action: 'view', minRole: 'admin' },
  { entity: 'roles', action: 'create', minRole: 'admin' },
  { entity: 'roles', action: 'edit', minRole: 'admin' },
  { entity: 'roles', action: 'delete', minRole: 'admin' },
];

const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 4,
  program_manager: 3,
  team_lead: 2,
  user: 1,
};

export function hasPermission(
  userRole: UserRole | null,
  entity: string,
  action: 'create' | 'edit' | 'delete' | 'view'
): boolean {
  if (!userRole) return false;

  const permission = PERMISSIONS.find(
    (p) => p.entity === entity && p.action === action
  );

  if (!permission) {
    // If no explicit permission defined, require admin
    return userRole === 'admin';
  }

  const userRoleLevel = ROLE_HIERARCHY[userRole];
  const minRoleLevel = ROLE_HIERARCHY[permission.minRole];

  return userRoleLevel >= minRoleLevel;
}

export async function checkUserPermission(
  userId: string,
  entity: string,
  action: 'create' | 'edit' | 'delete' | 'view'
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return hasPermission('user', entity, action);
  }

  return hasPermission(data.role as UserRole, entity, action);
}
