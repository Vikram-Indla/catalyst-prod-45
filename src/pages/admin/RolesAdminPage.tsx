import React, { useState } from 'react';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import AdminGuard from '@/components/admin/AdminGuard';
import { RbacSchemaBanner } from '@/components/admin/rbac/RbacSchemaBanner';
import { RbacRolesTable } from '@/components/admin/rbac/RbacRolesTable';
import { RbacUsersTable } from '@/components/admin/rbac/RbacUsersTable';
import { RbacAssignmentsTable } from '@/components/admin/rbac/RbacAssignmentsTable';
import { PermissionsMatrix } from '@/components/admin/rbac/PermissionsMatrix';
import { CreateEditRoleModal } from '@/components/admin/rbac/CreateEditRoleModal';
import { AssignUsersModal } from '@/components/admin/rbac/AssignUsersModal';
import {
  MOCK_ROLES,
  MOCK_USERS,
  MOCK_ASSIGNMENTS,
  RbacRole,
} from '@/lib/rbac-mock';

const T = {
  text:    'var(--ds-text, #172B4D)',
  subtle:  'var(--ds-text-subtle, #44546F)',
  surface: 'var(--ds-surface, #FFFFFF)',
};

export default function RolesAdminPage() {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [createEditOpen, setCreateEditOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RbacRole | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignRole, setAssignRole] = useState<RbacRole | null>(null);

  function openCreate() {
    setEditingRole(null);
    setCreateEditOpen(true);
  }

  function openEdit(role: RbacRole) {
    setEditingRole(role);
    setCreateEditOpen(true);
  }

  function openAssign(roleId: string) {
    const role = MOCK_ROLES.find(r => r.id === roleId) ?? null;
    setAssignRole(role);
    setAssignOpen(true);
  }

  const selectedRole = selectedRoleId ? MOCK_ROLES.find(r => r.id === selectedRoleId) ?? null : null;

  return (
    <AdminGuard>
      <div
        style={{
          padding: '32px 40px',
          maxWidth: 1200,
          margin: '0 auto',
          background: T.surface,
          minHeight: '100%',
        }}
      >
        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 653, color: T.text, lineHeight: '28px' }}>
            Roles
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: T.subtle }}>
            Manage RBAC roles, user assignments, and role permissions.
          </p>
        </div>

        {/* Schema not-deployed banner */}
        <RbacSchemaBanner />

        {/* Tabs */}
        <Tabs id="roles-admin-tabs" onChange={() => {}}>
          <TabList>
            <Tab>Roles</Tab>
            <Tab>Users</Tab>
            <Tab>Assignments</Tab>
            <Tab>Permissions matrix</Tab>
          </TabList>

          {/* Roles tab */}
          <TabPanel>
            <div style={{ paddingTop: 20 }}>
              <RbacRolesTable
                roles={MOCK_ROLES}
                selectedRoleId={selectedRoleId}
                onSelectRole={(id) => {
                  setSelectedRoleId(prev => prev === id ? null : id);
                }}
                onCreateRole={openCreate}
                onEditRole={openEdit}
              />

              {/* Role detail panel when a role is selected */}
              {selectedRole && (
                <div
                  style={{
                    marginTop: 20,
                    padding: 16,
                    border: '1px solid var(--ds-border, #DCDFE4)',
                    borderRadius: 4,
                    background: 'var(--ds-surface-sunken, #F7F8F9)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 653, color: T.text }}>
                      {selectedRole.name} — member overview
                    </h3>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => openAssign(selectedRole.id)}
                      onKeyDown={(e) => e.key === 'Enter' && openAssign(selectedRole.id)}
                      style={{ fontSize: 13, color: 'var(--ds-link, #0052CC)', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Manage users
                    </span>
                  </div>
                  <RbacUsersTable
                    users={MOCK_USERS.filter(u => u.roles.includes(selectedRole.id))}
                  />
                </div>
              )}
            </div>
          </TabPanel>

          {/* Users tab */}
          <TabPanel>
            <div style={{ paddingTop: 20 }}>
              <RbacUsersTable users={MOCK_USERS} />
            </div>
          </TabPanel>

          {/* Assignments tab */}
          <TabPanel>
            <div style={{ paddingTop: 20 }}>
              <RbacAssignmentsTable assignments={MOCK_ASSIGNMENTS} />
            </div>
          </TabPanel>

          {/* Permissions matrix tab */}
          <TabPanel>
            <div style={{ paddingTop: 20 }}>
              <PermissionsMatrix />
            </div>
          </TabPanel>
        </Tabs>
      </div>

      {/* Modals */}
      <CreateEditRoleModal
        isOpen={createEditOpen}
        onClose={() => setCreateEditOpen(false)}
        role={editingRole}
      />

      <AssignUsersModal
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        role={assignRole}
        allUsers={MOCK_USERS}
      />
    </AdminGuard>
  );
}
