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
import { ProductRole, useUsersWithRole, useRolePermissions } from '@/hooks/useProductRoles';
import { cn } from '@/lib/utils';

interface RoleDetailsProps {
  role: ProductRole;
  onEditOverrides: (userId: string) => void;
  isAdmin: boolean;
}

// Permission summaries per role
const ROLE_PERMISSION_SUMMARIES: Record<string, string[]> = {
  super_admin: [
    'Full access to all product features and settings',
    'Can manage all users, roles, and permissions',
    'Can configure product workflows and settings',
    'Can import and export all data',
  ],
  product_admin: [
    'Full access to all product features and settings',
    'Can manage product configuration',
    'Can import and export data',
    'Can manage users within the Product module',
  ],
  general_manager: [
    'Can view all demands across business lines',
    'Can update workflow state and add comments',
    'View-only access to budget, risks, and milestones',
    'Can export data but cannot import',
    'Cannot configure product settings',
  ],
  product_manager: [
    'Can view and edit demands in assigned business lines',
    'Can update workflow state and add comments',
    'View-only access to budget and milestones',
    'Full access to risks and links',
    'Cannot configure product settings or import/export',
  ],
  product_owner: [
    'Can view and edit demands',
    'Can update workflow state for own items only',
    'Full access to risks, milestones, and links',
    'No access to budget tab',
    'Cannot configure product settings or import/export',
  ],
  requester: [
    'Can view and edit own requests only',
    'Can update workflow state for own requests',
    'Can manage links for own requests',
    'No access to budget, risks, or milestones',
    'Cannot configure product settings or import/export',
  ],
};

export function RoleDetails({ role, onEditOverrides, isAdmin }: RoleDetailsProps) {
  const { data: users, isLoading: usersLoading } = useUsersWithRole(role.id);
  const { data: permissions } = useRolePermissions(role.id);

  // Get unique business lines from users
  const businessLines = [...new Set(
    (users || []).flatMap(u => u.business_lines || [])
  )];

  const permissionSummary = ROLE_PERMISSION_SUMMARIES[role.code] || [
    'View access to assigned features',
    'Contact administrator for detailed permissions',
  ];

  const scrollToMatrix = () => {
    const matrix = document.getElementById('permissions-matrix');
    if (matrix) {
      matrix.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Role Summary Card */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <h2 className="text-sm font-semibold text-foreground">Role: {role.name}</h2>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground mb-3">
            {role.description}
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
            onClick={scrollToMatrix}
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
