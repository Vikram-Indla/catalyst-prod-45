import React, { useState, useEffect } from 'react';
import Button from '@atlaskit/button/new';
import Spinner from '@atlaskit/spinner';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import PeopleGroupIcon from '@atlaskit/icon/core/people-group';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { RbacRolesTable } from '@/components/admin/rbac/RbacRolesTable';
import { RbacUsersTable } from '@/components/admin/rbac/RbacUsersTable';
import { PermissionsMatrix } from '@/components/admin/rbac/PermissionsMatrix';
import { CreateEditRoleModal } from '@/components/admin/rbac/CreateEditRoleModal';
import { AssignUsersModal } from '@/components/admin/rbac/AssignUsersModal';
import { UserOverridesModal } from '@/components/admin/rbac/UserOverridesModal';
import {
  useProductRoles,
  useUsersWithRole,
  useRolePermissions,
  ProductRole,
} from '@/hooks/useProductRoles';

const T = {
  text:   'var(--ds-text)',
  subtle: 'var(--ds-text-subtle)',
  border: 'var(--ds-border)',
  sunken: 'var(--ds-surface-sunken)',
};

export default function RolesAdminPage() {
  const { roles = [], isLoading: rolesLoading } = useProductRoles();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRoleId && roles.length > 0) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  const { data: usersData = [], isLoading: usersLoading } = useUsersWithRole(selectedRoleId);
  const { data: rolePermsData = [] } = useRolePermissions(selectedRoleId);

  const selectedRole = roles.find(r => r.id === selectedRoleId) ?? null;

  const [createEditOpen, setCreateEditOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<ProductRole | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignRole, setAssignRole] = useState<ProductRole | null>(null);
  const [overrideUserId, setOverrideUserId] = useState<string | null>(null);

  function openCreate() {
    setEditingRole(null);
    setCreateEditOpen(true);
  }

  function openEdit(role: ProductRole) {
    setEditingRole(role);
    setCreateEditOpen(true);
  }

  function openAssign(roleId: string) {
    setAssignRole(roles.find(r => r.id === roleId) ?? null);
    setAssignOpen(true);
  }

  return (
    <AdminGuard>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--ds-surface)' }}>
        {/* Page header */}
        <div style={{ padding: '24px 32px 20px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: T.text, lineHeight: '28px' }}>
            Roles
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: T.subtle }}>
            Manage roles, user assignments, and permission levels.
          </p>
        </div>

        {/* Two-panel body */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Sidebar */}
          <div style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${T.border}`, background: T.sunken, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 113px)', overflow: 'hidden' }}>
            <RbacRolesTable
              roles={roles}
              selectedId={selectedRoleId}
              isLoading={rolesLoading}
              onSelect={setSelectedRoleId}
              onCreateRole={openCreate}
              onEditRole={openEdit}
              onAssignUsers={openAssign}
            />
          </div>

          {/* Main panel */}
          <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px', minWidth: 0 }}>
            {rolesLoading && !selectedRole ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                <Spinner size="large" />
              </div>
            ) : selectedRole ? (
              <div style={{
                background: 'var(--ds-surface)',
                border: `1px solid var(--ds-border)`,
                borderRadius: 4,
                padding: '20px 24px',
                boxShadow: 'var(--ds-shadow-raised, 0 1px 1px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31))',
              }}>
                {/* Role heading + Assign button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: T.text, lineHeight: '22px' }}>
                      {selectedRole.name}
                    </h2>
                    {selectedRole.description && (
                      <p style={{ margin: '2px 0 0', fontSize: 13, color: T.subtle }}>
                        {selectedRole.description}
                      </p>
                    )}
                  </div>
                  <Button
                    appearance="primary"
                    spacing="compact"
                    iconBefore={PeopleGroupIcon}
                    onClick={() => openAssign(selectedRole.id)}
                  >
                    Assign users
                  </Button>
                </div>

                {/* @atlaskit/tabs */}
                <Tabs id="role-detail-tabs" onChange={() => {}}>
                  <TabList>
                    <Tab>Users</Tab>
                    <Tab>Permissions matrix</Tab>
                  </TabList>

                  <TabPanel>
                    <div style={{ paddingTop: 20 }}>
                      <RbacUsersTable
                        users={usersData}
                        isLoading={usersLoading}
                        onOverrideClick={(userId) => setOverrideUserId(userId)}
                      />
                    </div>
                  </TabPanel>

                  <TabPanel>
                    <div style={{ paddingTop: 20 }}>
                      <PermissionsMatrix
                        roles={[selectedRole]}
                        permissions={rolePermsData}
                      />
                    </div>
                  </TabPanel>
                </Tabs>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: T.subtle, fontSize: 14 }}>
                Select a role to view details.
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateEditRoleModal
        isOpen={createEditOpen}
        onClose={() => setCreateEditOpen(false)}
        role={editingRole}
      />

      <AssignUsersModal
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        role={assignRole}
      />

      <UserOverridesModal
        isOpen={!!overrideUserId}
        onClose={() => setOverrideUserId(null)}
        userId={overrideUserId}
        roleId={selectedRoleId}
      />
    </AdminGuard>
  );
}
