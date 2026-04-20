import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Lozenge } from '@/components/ads';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, UserPlus } from 'lucide-react';
import { ProductRole, useUsersWithRole, useRolePermissions, PERMISSION_GROUPS } from '@/hooks/useProductRoles';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';
import { AddUserToRoleModal } from './AddUserToRoleModal';
import { RoleModuleAccessGrid } from './RoleModuleAccessGrid';

interface RoleDetailsProps {
  role: ProductRole;
  onEditOverrides: (userId: string) => void;
  onEditRole: (role: ProductRole) => void;
  onViewDetailedPermissions: () => void;
}

// Generate module access summary from permissions
function generatePermissionSummary(
  permissions: { permission_group: string; permission_level: string }[]
): string[] {
  const lookup = permissions.reduce((acc, p) => {
    acc[p.permission_group] = p.permission_level;
    return acc;
  }, {} as Record<string, string>);

  const summary: string[] = [];
  const fullAccessModules: string[] = [];
  const viewOnlyModules: string[] = [];
  const noAccessModules: string[] = [];

  // Categorize modules by access level
  PERMISSION_GROUPS.forEach(module => {
    const level = lookup[module];
    if (level === 'Full') {
      fullAccessModules.push(module);
    } else if (level === 'View only') {
      viewOnlyModules.push(module);
    } else if (level === 'None' || !level) {
      noAccessModules.push(module);
    }
  });

  // Build summary
  if (fullAccessModules.length > 0) {
    summary.push(`Full access: ${fullAccessModules.join(', ')}`);
  }
  if (viewOnlyModules.length > 0) {
    summary.push(`View only: ${viewOnlyModules.join(', ')}`);
  }
  if (noAccessModules.length > 0 && noAccessModules.length <= 4) {
    summary.push(`No access: ${noAccessModules.join(', ')}`);
  } else if (noAccessModules.length > 4) {
    summary.push(`No access to ${noAccessModules.length} modules`);
  }

  return summary.length > 0 ? summary : ['Contact administrator for permission details'];
}

export function RoleDetails({ 
  role, 
  onEditOverrides, 
  onEditRole,
  onViewDetailedPermissions,
}: RoleDetailsProps) {
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const { data: users, isLoading: usersLoading } = useUsersWithRole(role.id);
  const { data: permissions } = useRolePermissions(role.id);
  const { isAdmin, isSuperAdmin } = useUserRole();
  
  // Check if user can manage roles
  const canManageRoles = isAdmin || isSuperAdmin;

  // Get unique business lines from users
  const businessLines = [...new Set(
    (users || []).flatMap(u => u.business_lines || [])
  )];

  const permissionSummary = permissions 
    ? generatePermissionSummary(permissions)
    : ['Loading permissions...'];

  return (
    <div className="space-y-6">
      {/* Role Summary Card */}
      <Card>
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Role: {role.name}</h2>
          {canManageRoles && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEditRole(role)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground mb-3">
            {role.description || 'No description provided'}
          </p>

          {/* Chips */}
          <div className="flex flex-wrap gap-2">
            <Lozenge appearance="default">
              Scope: {role.scope}
            </Lozenge>
            {businessLines.length > 0 && (
              <Lozenge appearance="default">
                Business Lines: {businessLines.join(', ')}
              </Lozenge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Module Access Grid */}
      <RoleModuleAccessGrid roleId={role.id} roleName={role.name} />

      {/* Users with this Role */}
      <Card>
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Users with this role</h2>
          {canManageRoles && (
            <Button
              size="sm"
              onClick={() => setIsAddUserModalOpen(true)}
              className="bg-brand-primary hover:bg-brand-primary-hover text-white"
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              Add User
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-primary" />
            </div>
          ) : !users || users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No users assigned to this role.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-semibold">User</TableHead>
                  <TableHead className="text-xs font-semibold">Email</TableHead>
                  <TableHead className="text-xs font-semibold">Business Lines</TableHead>
                  <TableHead className="text-xs font-semibold">Overrides</TableHead>
                  <TableHead className="text-xs font-semibold w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((userRole) => (
                  <TableRow key={userRole.id}>
                    <TableCell className="text-sm">
                      {userRole.user?.full_name || 'Unknown User'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {userRole.user?.email || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {userRole.business_lines?.join(', ') || '-'}
                    </TableCell>
                    <TableCell>
                      {userRole.has_overrides ? (
                        <Lozenge appearance="moved">
                          Custom
                        </Lozenge>
                      ) : (
                        <span className="text-sm text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        className={cn(
                          "text-xs text-brand-primary hover:underline",
                          !canManageRoles && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => canManageRoles && onEditOverrides(userRole.user_id)}
                        disabled={!canManageRoles}
                      >
                        Edit overrides
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add User Modal */}
      <AddUserToRoleModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        roleId={role.id}
        roleName={role.name}
        existingUserIds={(users || []).map((u) => u.user_id)}
      />
    </div>
  );
}
