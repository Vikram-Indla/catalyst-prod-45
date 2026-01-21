// ════════════════════════════════════════════════════════════════════════════
// PERMISSIONS TAB - Configure role-based permissions
// ════════════════════════════════════════════════════════════════════════════

import { useSpacePermissions, useUpdatePermission, useResetPermissions } from '@/hooks/spaces';
import { MEMBER_ROLE_CONFIG } from '@/lib/space-constants';
import { cn } from '@/lib/utils';
import type { MemberRole, PermissionKey, UpdatePermissionInput } from '@/types/spaces';

interface PermissionsTabProps {
  spaceId: string;
}

const PERMISSION_LABELS: Record<string, string> = {
  create_issues: 'Create Issues',
  edit_issues: 'Edit Issues',
  delete_issues: 'Delete Issues',
  manage_board: 'Manage Board',
  manage_versions: 'Manage Versions',
  manage_components: 'Manage Components',
  manage_members: 'Manage Members',
  manage_settings: 'Manage Settings',
};

const ROLES: MemberRole[] = ['administrator', 'member', 'viewer'];

export function PermissionsTab({ spaceId }: PermissionsTabProps) {
  const { data: permissions = [], isLoading } = useSpacePermissions(spaceId);
  const updatePermission = useUpdatePermission();
  const resetPermissions = useResetPermissions();

  const handleToggle = (permissionKey: PermissionKey, role: MemberRole, current: boolean) => {
    // Use the role-specific boolean update
    const updateObj: UpdatePermissionInput = { [role]: !current };

    updatePermission.mutate({
      spaceId,
      permissionKey,
      input: updateObj,
    });
  };

  const handleReset = () => {
    if (confirm('Reset all permissions to defaults?')) {
      resetPermissions.mutate(spaceId);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-64 bg-muted rounded-md animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium text-foreground">Permissions Matrix</h3>
          <p className="text-sm text-muted-foreground">
            Configure what each role can do
          </p>
        </div>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors"
        >
          Reset to Defaults
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                Permission
              </th>
              {ROLES.map((role) => (
                <th
                  key={role}
                  className="text-center py-3 px-4 font-medium text-muted-foreground"
                >
                  {MEMBER_ROLE_CONFIG[role].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((perm) => (
              <tr key={perm.permission_key} className="border-b border-border last:border-b-0">
                <td className="py-3 px-4 text-foreground">
                  {PERMISSION_LABELS[perm.permission_key] || perm.permission_key}
                </td>
                {ROLES.map((role) => {
                  const isAllowed = (perm as any)[role] === true;
                  const isAdmin = role === 'administrator';

                  return (
                    <td key={role} className="text-center py-3 px-4">
                      <button
                        onClick={() =>
                          handleToggle(perm.permission_key as PermissionKey, role, isAllowed)
                        }
                        disabled={isAdmin}
                        className={cn(
                          'w-5 h-5 rounded border transition-colors',
                          isAllowed
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'bg-background border-border',
                          isAdmin && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        {isAllowed && (
                          <svg className="w-full h-full" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Note: Admin role always has full permissions and cannot be modified.
      </p>
    </div>
  );
}
