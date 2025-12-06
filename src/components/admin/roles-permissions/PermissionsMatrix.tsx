import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProductRole, useAllRolePermissions, PERMISSION_GROUPS } from '@/hooks/useProductRoles';
import { cn } from '@/lib/utils';

interface PermissionsMatrixProps {
  roles: ProductRole[];
}

const PERMISSION_LEVEL_STYLES: Record<string, string> = {
  'Full': 'text-green-600 font-medium',
  'View only': 'text-blue-600',
  'Own only': 'text-purple-600',
  'None': 'text-muted-foreground',
};

export function PermissionsMatrix({ roles }: PermissionsMatrixProps) {
  const { data: allPermissions, isLoading } = useAllRolePermissions();

  // Build permission lookup: roleId -> permissionGroup -> level
  const permissionLookup = (allPermissions || []).reduce((acc, p) => {
    if (!acc[p.role_id]) acc[p.role_id] = {};
    acc[p.role_id][p.permission_group] = p.permission_level;
    return acc;
  }, {} as Record<string, Record<string, string>>);

  // Sort roles by a predefined order
  const roleOrder = ['super_admin', 'product_admin', 'general_manager', 'product_manager', 'product_owner', 'requester'];
  const sortedRoles = [...roles].sort((a, b) => {
    const aIdx = roleOrder.indexOf(a.code);
    const bIdx = roleOrder.indexOf(b.code);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  return (
    <section id="permissions-matrix" className="scroll-mt-8">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          Role Permissions Matrix (Product Module)
        </h2>
        <p className="text-sm text-muted-foreground">
          Overview of permissions by role. This matrix is read-only; changes are made in configuration.
        </p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-gold" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold w-[140px] border-r">
                    Role
                  </TableHead>
                  {PERMISSION_GROUPS.map((group) => (
                    <TableHead 
                      key={group} 
                      className="text-xs font-semibold text-center min-w-[90px]"
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
                    className={cn(idx % 2 === 1 && "bg-muted/20")}
                  >
                    <TableCell className="text-sm font-medium bg-muted/30 border-r">
                      {role.name}
                    </TableCell>
                    {PERMISSION_GROUPS.map((group) => {
                      const level = permissionLookup[role.id]?.[group] || 'None';
                      return (
                        <TableCell 
                          key={group}
                          className={cn(
                            "text-xs text-center",
                            PERMISSION_LEVEL_STYLES[level]
                          )}
                        >
                          {level}
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
        Note: This matrix is defined by the Super Admin. Changes are made in configuration, not here.
      </p>
    </section>
  );
}
