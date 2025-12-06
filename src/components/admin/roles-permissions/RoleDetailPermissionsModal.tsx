import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProductRole, useRolePermissions, PERMISSION_GROUPS } from '@/hooks/useProductRoles';
import { cn } from '@/lib/utils';

interface RoleDetailPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: ProductRole | null;
}

const PERMISSION_LEVEL_STYLES: Record<string, string> = {
  'Full': 'text-green-600 font-medium',
  'View only': 'text-blue-600',
  'Own only': 'text-purple-600',
  'None': 'text-muted-foreground',
};

export function RoleDetailPermissionsModal({ 
  isOpen, 
  onClose, 
  role 
}: RoleDetailPermissionsModalProps) {
  const { data: permissions, isLoading } = useRolePermissions(role?.id || null);

  const permissionLookup = (permissions || []).reduce((acc, p) => {
    acc[p.permission_group] = p.permission_level;
    return acc;
  }, {} as Record<string, string>);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Permissions: {role?.name}
          </DialogTitle>
          <DialogDescription>
            Detailed permissions for this role. Changes are made in configuration by Super Admin.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-gold" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold">Permission</TableHead>
                <TableHead className="text-xs font-semibold">Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSION_GROUPS.map((group) => {
                const level = permissionLookup[group] || 'None';
                return (
                  <TableRow key={group}>
                    <TableCell className="text-sm">{group}</TableCell>
                    <TableCell 
                      className={cn("text-sm", PERMISSION_LEVEL_STYLES[level])}
                    >
                      {level}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
