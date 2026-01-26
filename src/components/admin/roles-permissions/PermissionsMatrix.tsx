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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProductRole, useAllRolePermissions, useUpdateRolePermissions, PERMISSION_GROUPS, PermissionLevel } from '@/hooks/useProductRoles';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PermissionsMatrixProps {
  roles: ProductRole[];
}

const PERMISSION_LEVELS: PermissionLevel[] = ['Full', 'View only', 'Own only', 'None'];

const PERMISSION_LEVEL_STYLES: Record<string, string> = {
  'Full': 'text-green-600 font-medium',
  'View only': 'text-blue-600',
  'Own only': 'text-purple-600',
  'None': 'text-muted-foreground',
};

// Super Admin role code - always has full access
const SUPER_ADMIN_CODE = 'super_admin';

export function PermissionsMatrix({ roles }: PermissionsMatrixProps) {
  const { data: allPermissions, isLoading, refetch } = useAllRolePermissions();
  const updatePermissions = useUpdateRolePermissions();
  const { isAdmin, isSuperAdmin } = useUserRole();
  const [editingCell, setEditingCell] = useState<{ roleId: string; group: string } | null>(null);

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

    try {
      await updatePermissions.mutateAsync({
        roleId,
        permissions: { [group]: newLevel }
      });
      setEditingCell(null);
      refetch();
    } catch (error) {
      console.error('Failed to update permission:', error);
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
                      const isEditing = editingCell?.roleId === role.id && editingCell?.group === group;
                      const isProtected = isSuperAdminRole(role);

                      return (
                        <TableCell 
                          key={group}
                          className={cn(
                            "text-xs text-center p-1",
                            !isEditing && PERMISSION_LEVEL_STYLES[level],
                            canEdit && !isProtected && "cursor-pointer hover:bg-muted/50 transition-colors"
                          )}
                          onClick={() => {
                            if (canEdit && !isProtected && !isEditing) {
                              setEditingCell({ roleId: role.id, group });
                            }
                          }}
                        >
                          {isEditing ? (
                            <Select
                              value={level}
                              onValueChange={(value) => handlePermissionChange(role.id, role.code, group, value as PermissionLevel)}
                              onOpenChange={(open) => {
                                if (!open) setEditingCell(null);
                              }}
                              defaultOpen
                            >
                              <SelectTrigger className="h-7 text-xs w-[90px] mx-auto">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PERMISSION_LEVELS.map((lvl) => (
                                  <SelectItem key={lvl} value={lvl} className="text-xs">
                                    <span className={PERMISSION_LEVEL_STYLES[lvl]}>{lvl}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className={cn(
                              isProtected && "font-medium text-green-600"
                            )}>
                              {level}
                            </span>
                          )}
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
