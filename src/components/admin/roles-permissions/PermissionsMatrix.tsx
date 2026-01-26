import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProductRole, useAllRolePermissions, useUpdateRolePermissions, PERMISSION_GROUPS, PermissionLevel } from '@/hooks/useProductRoles';
import { useUserRole } from '@/hooks/useUserRole';
import { useRolePermissionsRealtime } from '@/hooks/useRolePermissionsRealtime';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';

interface PermissionsMatrixProps {
  roles: ProductRole[];
}

// Map display labels to database values
const PERMISSION_OPTIONS = [
  { label: 'Full', value: 'Full' as PermissionLevel, color: 'text-green-600' },
  { label: 'View', value: 'View only' as PermissionLevel, color: 'text-blue-600' },
  { label: 'Hide', value: 'None' as PermissionLevel, color: 'text-muted-foreground' },
];

const getDisplayLabel = (level: PermissionLevel): string => {
  switch (level) {
    case 'Full': return 'Full';
    case 'View only': return 'View';
    case 'Own only': return 'View'; // Treat as View for display
    case 'None': return 'Hide';
    default: return 'Hide';
  }
};

const getColorClass = (level: PermissionLevel): string => {
  switch (level) {
    case 'Full': return 'text-green-600 font-medium';
    case 'View only': 
    case 'Own only': return 'text-blue-600';
    case 'None': return 'text-muted-foreground';
    default: return 'text-muted-foreground';
  }
};

// Super Admin role code - always has full access
const SUPER_ADMIN_CODE = 'super_admin';

export function PermissionsMatrix({ roles }: PermissionsMatrixProps) {
  const { data: allPermissions, isLoading, refetch } = useAllRolePermissions();
  const updatePermissions = useUpdateRolePermissions();
  const { isAdmin, isSuperAdmin } = useUserRole();
  const [updatingCell, setUpdatingCell] = useState<string | null>(null);
  
  // Enable real-time synchronization
  useRolePermissionsRealtime();

  // Check if user can edit the matrix
  const canEdit = isAdmin || isSuperAdmin;

  // Build permission lookup: roleId -> permissionGroup -> level
  const permissionLookup = (allPermissions || []).reduce((acc, p) => {
    if (!acc[p.role_id]) acc[p.role_id] = {};
    acc[p.role_id][p.permission_group] = p.permission_level;
    return acc;
  }, {} as Record<string, Record<string, string>>);

  // Sort roles by a predefined order, with super_admin first
  const roleOrder = ['super_admin', 'product_manager', 'product_owner', 'enterprise_architect', 'project_manager', 'developer', 'qa_tester'];
  const sortedRoles = [...roles].sort((a, b) => {
    const aIdx = roleOrder.indexOf(a.code);
    const bIdx = roleOrder.indexOf(b.code);
    if (aIdx === -1 && bIdx === -1) return a.name.localeCompare(b.name);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  const handlePermissionChange = async (roleId: string, roleCode: string, group: string, newLevel: PermissionLevel) => {
    // Super Admin cannot have permissions changed - always Full
    if (roleCode === SUPER_ADMIN_CODE) {
      toast.error('Super Admin permissions cannot be changed');
      return;
    }

    const cellKey = `${roleId}-${group}`;
    setUpdatingCell(cellKey);

    try {
      await updatePermissions.mutateAsync({
        roleId,
        permissions: { [group]: newLevel }
      });
      toast.success('Permission updated');
    } catch (error) {
      console.error('Failed to update permission:', error);
      toast.error('Failed to update permission');
    } finally {
      setUpdatingCell(null);
    }
  };

  const getEffectiveLevel = (role: ProductRole, group: string): PermissionLevel => {
    // Super Admin always has Full access to everything
    if (role.code === SUPER_ADMIN_CODE) {
      return 'Full';
    }
    return (permissionLookup[role.id]?.[group] || 'None') as PermissionLevel;
  };

  const isSuperAdminRole = (role: ProductRole) => role.code === SUPER_ADMIN_CODE;

  return (
    <section id="permissions-matrix" className="scroll-mt-8">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          Role Permissions Matrix (Product Module)
        </h2>
        <p className="text-sm text-muted-foreground">
          {canEdit 
            ? 'Click on any cell to change the permission level. Super Admin always has full access.'
            : 'Overview of permissions by role. Contact an admin to make changes.'}
        </p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold w-[140px] border-r sticky left-0 bg-muted/50 z-10">
                    Role
                  </TableHead>
                  {PERMISSION_GROUPS.map((group) => (
                    <TableHead 
                      key={group} 
                      className="text-xs font-semibold text-center min-w-[100px]"
                    >
                      {group}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRoles.map((role, idx) => (
                  <TableRow 
                    key={role.id}
                    className={cn(
                      idx % 2 === 1 && "bg-muted/20",
                      isSuperAdminRole(role) && "bg-green-50/50"
                    )}
                  >
                    <TableCell className="text-sm font-medium bg-muted/30 border-r sticky left-0 z-10">
                      <div className="flex flex-col">
                        <span>{role.name}</span>
                        {isSuperAdminRole(role) && (
                          <span className="text-xs text-green-600 font-normal">Full Access</span>
                        )}
                      </div>
                    </TableCell>
                    {PERMISSION_GROUPS.map((group) => {
                      const level = getEffectiveLevel(role, group);
                      const displayLabel = getDisplayLabel(level);
                      const colorClass = getColorClass(level);
                      const isProtected = isSuperAdminRole(role);
                      const cellKey = `${role.id}-${group}`;
                      const isUpdating = updatingCell === cellKey;

                      if (!canEdit || isProtected) {
                        return (
                          <TableCell 
                            key={group}
                            className={cn("text-xs text-center", colorClass)}
                          >
                            {displayLabel}
                          </TableCell>
                        );
                      }

                      return (
                        <TableCell 
                          key={group}
                          className="text-xs text-center p-1"
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger 
                              className={cn(
                                "flex items-center justify-center gap-1 w-full px-2 py-1 rounded hover:bg-muted/50 transition-colors",
                                colorClass,
                                isUpdating && "opacity-50 pointer-events-none"
                              )}
                              disabled={isUpdating}
                            >
                              {isUpdating ? (
                                <span className="animate-pulse">...</span>
                              ) : (
                                <>
                                  {displayLabel}
                                  <ChevronDown className="h-3 w-3" />
                                </>
                              )}
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" className="min-w-[80px]">
                              {PERMISSION_OPTIONS.map((option) => (
                                <DropdownMenuItem
                                  key={option.value}
                                  onClick={() => handlePermissionChange(role.id, role.code, group, option.value)}
                                  className={cn("text-xs cursor-pointer", option.color)}
                                >
                                  {option.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground italic mt-3">
        {canEdit 
          ? 'Changes are saved automatically when you select a new permission level.'
          : 'Note: This matrix can only be edited by administrators.'}
      </p>
    </section>
  );
}
