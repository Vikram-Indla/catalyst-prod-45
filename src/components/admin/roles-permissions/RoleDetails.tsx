import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil } from 'lucide-react';
import { ProductRole, useUsersWithRole, useRolePermissions, PERMISSION_GROUPS } from '@/hooks/useProductRoles';
import { cn } from '@/lib/utils';

interface RoleDetailsProps {
  role: ProductRole;
  onEditOverrides: (userId: string) => void;
  onEditRole: (role: ProductRole) => void;
  onViewDetailedPermissions: () => void;
  isAdmin: boolean;
}

// Generate permission summary from actual permissions
function generatePermissionSummary(
  permissions: { permission_group: string; permission_level: string }[]
): string[] {
  const lookup = permissions.reduce((acc, p) => {
    acc[p.permission_group] = p.permission_level;
    return acc;
  }, {} as Record<string, string>);

  const summary: string[] = [];

  // View Demands
  const viewDemands = lookup['View Demands'];
  if (viewDemands === 'Full') {
    summary.push('Can view all demands across business lines');
  } else if (viewDemands === 'Own only') {
    summary.push('Can view own requests only');
  } else if (viewDemands === 'View only') {
    summary.push('Read-only access to demands');
  }

  // Create/Edit
  const editDemands = lookup['CreateEdit Demands'];
  if (editDemands === 'Full') {
    summary.push('Can create and edit all demands');
  } else if (editDemands === 'Own only') {
    summary.push('Can edit own requests only');
  }

  // Workflow
  const workflow = lookup['Workflow Actions'];
  if (workflow === 'Full') {
    summary.push('Can update workflow state and add comments');
  } else if (workflow === 'Own only') {
    summary.push('Can update workflow for own items only');
  }

  // Tabs summary
  const budgetAccess = lookup['Budget Tab'];
  const risksAccess = lookup['Risks Tab'];
  const milestonesAccess = lookup['Milestones Tab'];

  if (budgetAccess === 'Full' && risksAccess === 'Full' && milestonesAccess === 'Full') {
    summary.push('Full access to budget, risks, and milestones');
  } else if (budgetAccess === 'View only' || risksAccess === 'View only' || milestonesAccess === 'View only') {
    const viewOnlyTabs = [];
    if (budgetAccess === 'View only') viewOnlyTabs.push('budget');
    if (risksAccess === 'View only') viewOnlyTabs.push('risks');
    if (milestonesAccess === 'View only') viewOnlyTabs.push('milestones');
    if (viewOnlyTabs.length > 0) {
      summary.push(`View-only access to ${viewOnlyTabs.join(', ')}`);
    }
  } else if (budgetAccess === 'None' && risksAccess === 'None' && milestonesAccess === 'None') {
    summary.push('No access to budget, risks, or milestones tabs');
  }

  // Export/Import
  const canExport = lookup['Export'] === 'Full';
  const canImport = lookup['Import'] === 'Full';
  if (canExport && canImport) {
    summary.push('Can import and export data');
  } else if (canExport && !canImport) {
    summary.push('Can export data but cannot import');
  } else if (!canExport && !canImport) {
    summary.push('Cannot import or export data');
  }

  // Product Settings
  const settings = lookup['Product Settings'];
  if (settings === 'Full') {
    summary.push('Can configure product settings');
  } else {
    summary.push('Cannot configure product settings');
  }

  return summary.length > 0 ? summary : ['Contact administrator for permission details'];
}

export function RoleDetails({ 
  role, 
  onEditOverrides, 
  onEditRole,
  onViewDetailedPermissions,
  isAdmin 
}: RoleDetailsProps) {
  const { data: users, isLoading: usersLoading } = useUsersWithRole(role.id);
  const { data: permissions } = useRolePermissions(role.id);

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
          {isAdmin && (
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
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="secondary" className="text-xs">
              Scope: {role.scope}
            </Badge>
            {businessLines.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                Business Lines: {businessLines.join(', ')}
              </Badge>
            )}
          </div>

          {/* Permissions Summary */}
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Permissions Summary
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-4">
            {permissionSummary.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>

          <Button 
            variant="outline" 
            size="sm"
            onClick={onViewDetailedPermissions}
          >
            View detailed permissions
          </Button>
        </CardContent>
      </Card>

      {/* Users with this Role */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <h2 className="text-sm font-semibold text-foreground">Users with this role</h2>
        </CardHeader>
        <CardContent className="p-0">
          {usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-gold" />
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
                        <Badge 
                          variant="secondary"
                          className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-xs"
                        >
                          Custom
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        className={cn(
                          "text-xs text-brand-gold hover:underline",
                          !isAdmin && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => isAdmin && onEditOverrides(userRole.user_id)}
                        disabled={!isAdmin}
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
    </div>
  );
}
