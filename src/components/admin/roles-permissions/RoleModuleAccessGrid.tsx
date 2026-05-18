import { useState } from 'react';

import { useRolePermissions, PERMISSION_GROUPS, useUpdateRolePermissions, PermissionLevel } from '@/hooks/useProductRoles';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import Spinner from '@atlaskit/spinner';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import EyeOpenIcon from '@atlaskit/icon/core/eye-open';
import EyeOpenStrikethroughIcon from '@atlaskit/icon/core/eye-open-strikethrough';

interface RoleModuleAccessGridProps {
  roleId: string;
  roleName: string;
}

const PERMISSION_CYCLE: PermissionLevel[] = ['None', 'View only', 'Full'];

function getNextPermission(current: PermissionLevel | undefined): PermissionLevel {
  const currentLevel = current || 'None';
  const currentIndex = PERMISSION_CYCLE.indexOf(currentLevel);
  const nextIndex = (currentIndex + 1) % PERMISSION_CYCLE.length;
  return PERMISSION_CYCLE[nextIndex];
}

interface AccessBadgeProps {
  level: string | undefined;
  isUpdating: boolean;
  canEdit: boolean;
  onClick: () => void;
}

function AccessBadge({ level, isUpdating, canEdit, onClick }: AccessBadgeProps) {
  const baseClasses = cn(
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
    canEdit && "cursor-pointer hover:scale-105 active:scale-95",
    !canEdit && "cursor-default"
  );

  if (isUpdating) {
    return (
      <span className={cn(baseClasses, "bg-zinc-100 text-zinc-500")}>
        <Spinner size="small" />
      </span>
    );
  }

  switch (level) {
    case 'Full':
      return (
        <button 
          onClick={onClick}
          disabled={!canEdit}
          className={cn(
            baseClasses, 
            "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
            !canEdit && "hover:bg-emerald-100"
          )}
        >
          <CheckMarkIcon label="" size="small" />
          Full
        </button>
      );
    case 'View only':
      return (
        <button 
          onClick={onClick}
          disabled={!canEdit}
          className={cn(
            baseClasses, 
            "bg-blue-100 text-blue-700 hover:bg-blue-200",
            !canEdit && "hover:bg-blue-100"
          )}
        >
          <EyeOpenIcon label="" size="small" />
          View
        </button>
      );
    case 'None':
    default:
      return (
        <button 
          onClick={onClick}
          disabled={!canEdit}
          className={cn(
            baseClasses, 
            "bg-zinc-100 text-zinc-500 hover:bg-zinc-200",
            !canEdit && "hover:bg-zinc-100"
          )}
        >
          <EyeOpenStrikethroughIcon label="" size="small" />
          Hide
        </button>
      );
  }
}

export function RoleModuleAccessGrid({ roleId, roleName }: RoleModuleAccessGridProps) {
  const queryClient = useQueryClient();
  const { data: permissions, isLoading } = useRolePermissions(roleId);
  const { isAdmin, isSuperAdmin } = useUserRole();
  const updatePermissions = useUpdateRolePermissions();
  const [updatingModule, setUpdatingModule] = useState<string | null>(null);

  const canEdit = isAdmin || isSuperAdmin;

  const permissionLookup = (permissions || []).reduce((acc, p) => {
    acc[p.permission_group] = p.permission_level;
    return acc;
  }, {} as Record<string, PermissionLevel>);

  const handleTogglePermission = async (module: string) => {
    if (!canEdit || updatingModule) return;

    const currentLevel = permissionLookup[module] || 'None';
    const nextLevel = getNextPermission(currentLevel);

    setUpdatingModule(module);

    // Optimistic update
    queryClient.setQueryData(['role-permissions', roleId], (old: any) => {
      if (!old) return old;
      const existing = old.find((p: any) => p.permission_group === module);
      if (existing) {
        return old.map((p: any) =>
          p.permission_group === module ? { ...p, permission_level: nextLevel } : p
        );
      }
      return [...old, { role_id: roleId, permission_group: module, permission_level: nextLevel }];
    });

    try {
      await updatePermissions.mutateAsync({
        roleId,
        permissions: { [module]: nextLevel },
      });
    } catch (error) {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['role-permissions', roleId] });
    } finally {
      setUpdatingModule(null);
    }
  };

  if (isLoading) {
    return (
      <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ds-border-layout, #EBECF0)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>Module Access</h2>
        </div>
        <div style={{ padding: '16px' }}>
          <div className="flex items-center justify-center py-8">
            <Spinner size="small" />
          </div>
        </div>
      </div>
    );
  }

  // Count access levels
  const fullCount = PERMISSION_GROUPS.filter(g => permissionLookup[g] === 'Full').length;
  const viewCount = PERMISSION_GROUPS.filter(g => permissionLookup[g] === 'View only').length;
  const hideCount = PERMISSION_GROUPS.filter(g => !permissionLookup[g] || permissionLookup[g] === 'None').length;

  return (
    <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ds-border-layout, #EBECF0)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>Module Access</h2>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Full: {fullCount}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              View: {viewCount}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-zinc-400" />
              Hide: {hideCount}
            </span>
          </div>
        </div>
      </div>
      <div style={{ padding: '16px' }}>
        {canEdit && (
          <p className="text-xs mb-4" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
            Click on any access level to toggle between Hide → View → Full
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {PERMISSION_GROUPS.map((module) => {
            const level = permissionLookup[module];
            const isHidden = !level || level === 'None';
            const isUpdating = updatingModule === module;

            return (
              <div
                key={module}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-colors",
                  isHidden
                    ? "bg-muted/30 border-border/50"
                    : "bg-background border-border",
                  isUpdating && "opacity-70"
                )}
              >
                <span className={cn(
                  "text-sm font-medium truncate pr-2",
                  isHidden ? "text-muted-foreground" : "text-foreground"
                )}>
                  {module}
                </span>
                <AccessBadge
                  level={level}
                  isUpdating={isUpdating}
                  canEdit={canEdit}
                  onClick={() => handleTogglePermission(module)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
