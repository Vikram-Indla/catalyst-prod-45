import React from 'react';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import Tooltip from '@atlaskit/tooltip';
import AddIcon from '@atlaskit/icon/core/add';
import EditIcon from '@atlaskit/icon/core/edit';
import PeopleGroupIcon from '@atlaskit/icon/core/people-group';
import LockLockedIcon from '@atlaskit/icon/core/lock-locked';
import { RbacRole, RBAC_SCHEMA_DEPLOYED } from '@/lib/rbac-mock';

interface RbacRolesTableProps {
  roles: RbacRole[];
  selectedRoleId: string | null;
  onSelectRole: (id: string) => void;
  onCreateRole: () => void;
  onEditRole: (role: RbacRole) => void;
}

const T = {
  text:      'var(--ds-text, #172B4D)',
  subtle:    'var(--ds-text-subtle, #44546F)',
  subtlest:  'var(--ds-text-subtlest, #626F86)',
  border:    'var(--ds-border, #DCDFE4)',
  surface:   'var(--ds-surface, #FFFFFF)',
  selected:  'var(--ds-background-selected, #E9F2FE)',
  hover:     'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))',
  headerBg:  'var(--ds-background-neutral, #F1F2F4)',
};

const DISABLED_REASON = 'Save actions unavailable — RBAC schema not deployed';

export function RbacRolesTable({
  roles,
  selectedRoleId,
  onSelectRole,
  onCreateRole,
  onEditRole,
}: RbacRolesTableProps) {
  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 4, overflow: 'hidden' }}>
      {/* Table header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: T.headerBg,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 653, color: T.subtle, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Roles ({roles.length})
        </span>
        <Tooltip
          content={RBAC_SCHEMA_DEPLOYED ? undefined : DISABLED_REASON}
          position="left"
        >
          <Button
            appearance="primary"
            spacing="compact"
            iconBefore={AddIcon}
            isDisabled={!RBAC_SCHEMA_DEPLOYED}
            onClick={RBAC_SCHEMA_DEPLOYED ? onCreateRole : undefined}
          >
            New role
          </Button>
        </Tooltip>
      </div>

      {/* Column headings */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 72px 80px 80px 80px',
          padding: '6px 16px',
          background: T.headerBg,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        {['Role', 'Users', 'Permissions', 'Status', ''].map((h) => (
          <span key={h} style={{ fontSize: 12, fontWeight: 653, color: T.subtle }}>
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {roles.map((role) => {
        const isSelected = role.id === selectedRoleId;
        return (
          <div
            key={role.id}
            role="row"
            aria-selected={isSelected}
            onClick={() => onSelectRole(role.id)}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 72px 80px 80px 80px',
              alignItems: 'center',
              padding: '10px 16px',
              cursor: 'pointer',
              background: isSelected ? T.selected : T.surface,
              borderBottom: `1px solid ${T.border}`,
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) (e.currentTarget as HTMLElement).style.background = T.hover;
            }}
            onMouseLeave={(e) => {
              if (!isSelected) (e.currentTarget as HTMLElement).style.background = T.surface;
            }}
          >
            {/* Name + description + system badge */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {role.systemRole && (
                  <span title="System role — cannot be deleted" style={{ color: T.subtlest, display: 'flex' }}>
                    <LockLockedIcon label="System role" size="small" />
                  </span>
                )}
                <span style={{ fontSize: 14, fontWeight: 500, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {role.name}
                </span>
              </div>
              {role.description && (
                <span style={{ fontSize: 12, color: T.subtlest, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {role.description}
                </span>
              )}
            </div>

            {/* User count */}
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: T.subtle }}>
              <PeopleGroupIcon label="" size="small" />
              {role.userCount}
            </span>

            {/* Permission count */}
            <span style={{ fontSize: 13, color: T.subtle }}>{role.permissionCount}</span>

            {/* Status */}
            <span>
              <Lozenge appearance={role.isActive ? 'success' : 'default'}>
                {role.isActive ? 'Active' : 'Inactive'}
              </Lozenge>
            </span>

            {/* Edit action */}
            <span onClick={(e) => e.stopPropagation()}>
              <Tooltip
                content={RBAC_SCHEMA_DEPLOYED ? undefined : DISABLED_REASON}
                position="left"
              >
                <Button
                  appearance="subtle"
                  spacing="compact"
                  iconBefore={EditIcon}
                  isDisabled={!RBAC_SCHEMA_DEPLOYED}
                  onClick={RBAC_SCHEMA_DEPLOYED ? () => onEditRole(role) : undefined}
                  aria-label={`Edit ${role.name}`}
                />
              </Tooltip>
            </span>
          </div>
        );
      })}

      {roles.length === 0 && (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: T.subtle, fontSize: 14 }}>
          No roles found.
        </div>
      )}
    </div>
  );
}
