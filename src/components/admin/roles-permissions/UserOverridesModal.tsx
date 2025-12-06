import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  useUserProfile, 
  useUserProductRole, 
  useUserOverrides,
  useRolePermissions,
  useSaveUserOverrides
} from '@/hooks/useProductRoles';

interface UserOverridesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  roleId: string | null;
  isAdmin: boolean;
}

const PERMISSION_GROUPS = [
  'View Demands',
  'CreateEdit Demands',
  'Workflow Actions',
  'Budget Tab',
  'Risks Tab',
  'Milestones Tab',
  'Links Tab',
  'Export',
  'Import',
  'Product Settings',
];

export function UserOverridesModal({ 
  isOpen, 
  onClose, 
  userId, 
  roleId,
  isAdmin 
}: UserOverridesModalProps) {
  const [localOverrides, setLocalOverrides] = useState<Record<string, string>>({});
  
  const { data: profile, isLoading: profileLoading } = useUserProfile(userId);
  const { data: userProductRole, isLoading: roleLoading } = useUserProductRole(userId);
  const { data: existingOverrides, isLoading: overridesLoading } = useUserOverrides(userId);
  const { data: rolePermissions } = useRolePermissions(userProductRole?.role_id || roleId);
  const saveOverrides = useSaveUserOverrides();

  // Build permission lookup for role defaults
  const roleDefaultsLookup = (rolePermissions || []).reduce((acc, p) => {
    acc[p.permission_group] = p.permission_level;
    return acc;
  }, {} as Record<string, string>);

  // Initialize local overrides when data loads
  useEffect(() => {
    if (existingOverrides) {
      const overridesMap = existingOverrides.reduce((acc, o) => {
        acc[o.permission_group] = o.override_value;
        return acc;
      }, {} as Record<string, string>);
      setLocalOverrides(overridesMap);
    } else {
      setLocalOverrides({});
    }
  }, [existingOverrides]);

  const handleOverrideChange = (permissionGroup: string, value: string) => {
    setLocalOverrides(prev => ({
      ...prev,
      [permissionGroup]: value
    }));
  };

  const handleResetToDefaults = () => {
    setLocalOverrides({});
  };

  const handleSave = async () => {
    if (!userId) return;

    const overridesToSave = PERMISSION_GROUPS.map(group => ({
      permission_group: group,
      override_value: localOverrides[group] || 'Inherited'
    }));

    await saveOverrides.mutateAsync({
      userId,
      overrides: overridesToSave
    });

    onClose();
  };

  const handleCancel = () => {
    // Reset to original overrides
    if (existingOverrides) {
      const overridesMap = existingOverrides.reduce((acc, o) => {
        acc[o.permission_group] = o.override_value;
        return acc;
      }, {} as Record<string, string>);
      setLocalOverrides(overridesMap);
    } else {
      setLocalOverrides({});
    }
    onClose();
  };

  const isLoading = profileLoading || roleLoading || overridesLoading;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Custom Permissions – {profile?.full_name || 'User'}
          </DialogTitle>
          <DialogDescription>
            Overrides the default permissions of the assigned role.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-gold" />
          </div>
        ) : (
          <>
            {/* User Summary */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 bg-muted/50 rounded-lg text-sm">
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wide">User</dt>
                <dd className="mt-0.5 text-foreground">{profile?.full_name || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wide">Email</dt>
                <dd className="mt-0.5 text-foreground">{profile?.email || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wide">Primary Role</dt>
                <dd className="mt-0.5 text-foreground">
                  {userProductRole?.role?.name || 'Not assigned'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wide">Business Lines</dt>
                <dd className="mt-0.5 text-foreground">
                  {userProductRole?.business_lines?.join(', ') || '-'}
                </dd>
              </div>
            </div>

            {/* Overrides Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-semibold">Permission</TableHead>
                  <TableHead className="text-xs font-semibold">Role Default</TableHead>
                  <TableHead className="text-xs font-semibold">User Override</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PERMISSION_GROUPS.map((group) => {
                  const roleDefault = roleDefaultsLookup[group] || 'None';
                  const currentOverride = localOverrides[group] || 'Inherited';

                  return (
                    <TableRow key={group}>
                      <TableCell className="text-sm">{group}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {roleDefault}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={currentOverride}
                          onValueChange={(value) => handleOverrideChange(group, value)}
                          disabled={!isAdmin}
                        >
                          <SelectTrigger className="h-8 w-[120px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Inherited">Inherited</SelectItem>
                            <SelectItem value="Allow">Allow</SelectItem>
                            <SelectItem value="Deny">Deny</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}

        <DialogFooter className="flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={handleResetToDefaults}
            disabled={!isAdmin || saveOverrides.isPending}
          >
            Reset to role defaults
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={saveOverrides.isPending}
            >
              Cancel
            </Button>
            <Button
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
              onClick={handleSave}
              disabled={!isAdmin || saveOverrides.isPending}
            >
              {saveOverrides.isPending ? 'Saving...' : 'Save overrides'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
