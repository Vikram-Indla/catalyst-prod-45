/**
 * Roles & Permissions Section
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectRole, RolePermissions } from '../../types/settings';

interface RolesPermissionsProps {
  roles: ProjectRole[];
  onCreateRole: () => void;
  onUpdateRole: (roleId: string, permissions: Partial<RolePermissions>) => void;
  isLoading?: boolean;
}

const permissionCategories = [
  {
    name: 'Test Cases',
    permissions: [
      { key: 'test_cases.create', label: 'Create' },
      { key: 'test_cases.edit', label: 'Edit' },
      { key: 'test_cases.delete', label: 'Delete' },
      { key: 'test_cases.execute', label: 'Execute' },
    ],
  },
  {
    name: 'Test Cycles',
    permissions: [
      { key: 'cycles.create', label: 'Create' },
      { key: 'cycles.manage', label: 'Manage' },
    ],
  },
  {
    name: 'Defects',
    permissions: [
      { key: 'defects.create', label: 'Create' },
      { key: 'defects.edit', label: 'Edit' },
      { key: 'defects.resolve', label: 'Resolve' },
      { key: 'defects.delete', label: 'Delete' },
    ],
  },
  {
    name: 'Reports',
    permissions: [
      { key: 'reports.view', label: 'View' },
      { key: 'reports.export', label: 'Export' },
    ],
  },
  {
    name: 'Administration',
    permissions: [
      { key: 'project.settings', label: 'Settings' },
      { key: 'project.members.invite', label: 'Invite Members' },
      { key: 'integrations.manage', label: 'Integrations' },
      { key: 'audit_log.view', label: 'Audit Log' },
    ],
  },
];

export function RolesPermissions({ roles, onCreateRole, isLoading }: RolesPermissionsProps) {
  const systemRoles = roles.filter((r) => r.is_system);

  const getPermissionIcon = (value: boolean | undefined) => {
    if (value === true) {
      return (
        <div className="h-5 w-5 rounded bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
          <Check className="h-3 w-3 text-teal-600" />
        </div>
      );
    }
    return (
      <div className="h-5 w-5 rounded bg-muted flex items-center justify-center">
        <X className="h-3 w-3 text-muted-foreground" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Roles Overview */}
      <section className="bg-background border border-border rounded-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">Roles & Permissions</h2>
            <p className="text-sm text-muted-foreground">
              Define what each role can do in this project
            </p>
          </div>
          <Button onClick={onCreateRole} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Custom Role
          </Button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-5 gap-px bg-border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="bg-muted/50 px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Permission
            </div>
            {systemRoles.map((role) => (
              <div
                key={role.id}
                className="bg-muted/50 px-4 py-3 text-center"
              >
                <Badge
                  variant="secondary"
                  className="gap-1"
                  style={{ backgroundColor: `${role.color}20`, color: role.color }}
                >
                  <span>{role.icon}</span>
                  <span className="capitalize">{role.name}</span>
                </Badge>
              </div>
            ))}

            {/* Permission Rows */}
            {permissionCategories.map((category) => (
              <React.Fragment key={category.name}>
                {/* Category Header */}
                <div className="col-span-5 bg-muted/30 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-t border-border">
                  {category.name}
                </div>
                {category.permissions.map((permission) => (
                  <React.Fragment key={permission.key}>
                    <div className="bg-background px-4 py-3 text-sm text-foreground font-medium">
                      {permission.label}
                    </div>
                    {systemRoles.map((role) => (
                      <div
                        key={`${role.id}-${permission.key}`}
                        className="bg-background px-4 py-3 flex items-center justify-center"
                      >
                        {getPermissionIcon(
                          role.permissions[permission.key as keyof RolePermissions]
                        )}
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
