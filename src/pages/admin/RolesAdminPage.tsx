import React, { useState } from 'react';
import Button from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import PeopleGroupIcon from '@atlaskit/icon/core/people-group';
import { AdminGuard } from '@/components/admin/AdminGuard';
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
  RBAC_SCHEMA_DEPLOYED,
  usersForRole,
  RbacRole,
} from '@/lib/rbac-mock';

const T = {
  text:   'var(--ds-text, #172B4D)',
  subtle: 'var(--ds-text-subtle, #44546F)',
  border: 'var(--ds-border, #DCDFE4)',
  sunken: 'var(--ds-surface-sunken, #F7F8F9)',
};

const TABS = [
  { id: 'users',       label: 'Users' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'permissions', label: 'Permissions matrix' },
] as const;

type TabId = typeof TABS[number]['id'];

const ASSIGN_DISABLED = 'Assign actions unavailable — RBAC schema not deployed';

export default function RolesAdminPage() {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(
    MOCK_ROLES[0]?.id ?? null,
  );
  const [activeTab, setActiveTab] = useState<TabId>('users');

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
    const role = MOCK_ROLES.find((r) => r.id === roleId) ?? null;
    setAssignRole(role);
    setAssignOpen(true);
  }

  const selectedRole = selectedRoleId
    ? (MOCK_ROLES.find((r) => r.id === selectedRoleId) ?? null)
    : null;

  const assignmentsForRole = selectedRoleId
    ? MOCK_ASSIGNMENTS.filter((a) => a.roleId === selectedRoleId)
    : MOCK_ASSIGNMENTS;

  function handleTabKey(e: React.KeyboardEvent, idx: number) {
    const len = TABS.length;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveTab(TABS[(idx + 1) % len].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveTab(TABS[(idx - 1 + len) % len].id);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveTab(TABS[0].id);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveTab(TABS[len - 1].id);
    }
  }

  return (
    <AdminGuard>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
          background: 'var(--ds-surface, #FFFFFF)',
        }}
      >
        {/* Page header */}
        <div
          style={{
            padding: '24px 32px 20px',
            borderBottom: `1px solid ${T.border}`,
            flexShrink: 0,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 600,
              color: T.text,
              lineHeight: '28px',
            }}
          >
            Roles
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: T.subtle }}>
            Manage RBAC roles, user assignments, and role permissions.
          </p>
        </div>

        {/* Two-panel body */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Role selector sidebar */}
          <div
            style={{
              width: 240,
              flexShrink: 0,
              borderRight: `1px solid ${T.border}`,
              background: T.sunken,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 113px)',
              overflow: 'hidden',
            }}
          >
            <RbacRolesTable
              roles={MOCK_ROLES}
              selectedId={selectedRoleId}
              onSelect={setSelectedRoleId}
              onCreateRole={openCreate}
              onEditRole={openEdit}
              onAssignUsers={openAssign}
            />
          </div>

          {/* Main content panel */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '24px 32px',
              minWidth: 0,
            }}
          >
            {/* Schema not-deployed banner */}
            <RbacSchemaBanner />

            {selectedRole ? (
              <>
                {/* Role name heading */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 18,
                        fontWeight: 600,
                        color: T.text,
                        lineHeight: '22px',
                      }}
                    >
                      {selectedRole.name}
                    </h2>
                    {selectedRole.description && (
                      <p style={{ margin: '2px 0 0', fontSize: 13, color: T.subtle }}>
                        {selectedRole.description}
                      </p>
                    )}
                  </div>
                  {activeTab !== 'permissions' && (
                    <Tooltip
                      content={RBAC_SCHEMA_DEPLOYED ? undefined : ASSIGN_DISABLED}
                      position="top"
                    >
                      <Button
                        appearance="primary"
                        spacing="compact"
                        iconBefore={PeopleGroupIcon}
                        isDisabled={!RBAC_SCHEMA_DEPLOYED}
                        onClick={
                          RBAC_SCHEMA_DEPLOYED ? () => openAssign(selectedRole.id) : undefined
                        }
                      >
                        Assign users
                      </Button>
                    </Tooltip>
                  )}
                </div>

                {/* ARIA tab strip */}
                <div
                  style={{
                    display: 'flex',
                    borderBottom: `2px solid ${T.border}`,
                    marginBottom: 20,
                  }}
                >
                  <div role="tablist" aria-label="Role details" style={{ display: 'flex' }}>
                    {TABS.map((tab, idx) => {
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          role="tab"
                          id={`rbac-tab-${tab.id}`}
                          aria-selected={isActive}
                          aria-controls={`rbac-panel-${tab.id}`}
                          tabIndex={isActive ? 0 : -1}
                          onClick={() => setActiveTab(tab.id)}
                          onKeyDown={(e) => handleTabKey(e, idx)}
                          style={{
                            padding: '8px 16px',
                            border: 'none',
                            borderBottom: isActive
                              ? '2px solid var(--ds-border-brand, #0052CC)'
                              : '2px solid transparent',
                            marginBottom: -2,
                            background: 'transparent',
                            fontSize: 14,
                            fontWeight: isActive ? 600 : 400,
                            color: isActive
                              ? 'var(--ds-text-brand, #0052CC)'
                              : T.subtle,
                            cursor: 'pointer',
                            transition: 'color 0.1s, border-color 0.1s',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tab panels */}
                <div
                  role="tabpanel"
                  id="rbac-panel-users"
                  aria-labelledby="rbac-tab-users"
                  hidden={activeTab !== 'users'}
                >
                  {activeTab === 'users' && (
                    <RbacUsersTable
                      users={usersForRole(selectedRoleId ?? '')}
                    />
                  )}
                </div>

                <div
                  role="tabpanel"
                  id="rbac-panel-assignments"
                  aria-labelledby="rbac-tab-assignments"
                  hidden={activeTab !== 'assignments'}
                >
                  {activeTab === 'assignments' && (
                    <RbacAssignmentsTable assignments={assignmentsForRole} />
                  )}
                </div>

                <div
                  role="tabpanel"
                  id="rbac-panel-permissions"
                  aria-labelledby="rbac-tab-permissions"
                  hidden={activeTab !== 'permissions'}
                >
                  {activeTab === 'permissions' && (
                    <PermissionsMatrix roles={[selectedRole]} />
                  )}
                </div>
              </>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 200,
                  color: T.subtle,
                  fontSize: 14,
                }}
              >
                Select a role to view details.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals mounted at page level */}
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
