import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useRolePermissions, PERMISSION_GROUPS, useUpdateRolePermissions, PermissionLevel } from '@/hooks/useProductRoles';
import { useUserRole } from '@/hooks/useUserRole';
import { Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

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
        <Loader2 className="h-3 w-3 animate-spin" />
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
          <Check className="h-3 w-3" />
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
          <Eye className="h-3 w-3" />
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
          <EyeOff className="h-3 w-3" />
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
      <Card>
        <CardHeader className="pb-3 border-b">
          <h2 className="text-sm font-semibold text-foreground">Module Access</h2>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Count access levels
  const fullCount = PERMISSION_GROUPS.filter(g => permissionLookup[g] === 'Full').length;
  const viewCount = PERMISSION_GROUPS.filter(g => permissionLookup[g] === 'View only').length;
  const hideCount = PERMISSION_GROUPS.filter(g => !permissionLookup[g] || permissionLookup[g] === 'None').length;

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Module Access</h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
      </CardHeader>
      <CardContent className="pt-4">
        {canEdit && (
          <p className="text-xs text-muted-foreground mb-4">
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
      </CardContent>
    </Card>
  );
}
