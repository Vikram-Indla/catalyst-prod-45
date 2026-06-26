import React from 'react';
import Button from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import AddIcon from '@atlaskit/icon/core/add';
import EditIcon from '@atlaskit/icon/core/edit';
import PeopleGroupIcon from '@atlaskit/icon/core/people-group';
import LockLockedIcon from '@atlaskit/icon/core/lock-locked';
import { RbacRole, RBAC_SCHEMA_DEPLOYED } from '@/lib/rbac-mock';

interface RbacRolesTableProps {
  roles: RbacRole[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateRole: () => void;
  onEditRole: (role: RbacRole) => void;
  onAssignUsers: (roleId: string) => void;
}

const T = {
  text:        'var(--ds-text, #172B4D)',
  subtle:      'var(--ds-text-subtle, #44546F)',
  subtlest:    'var(--ds-text-subtlest, #626F86)',
  border:      'var(--ds-border, #DCDFE4)',
  selected:    'var(--ds-background-selected, #E9F2FE)',
  brandBorder: 'var(--ds-border-brand, #0052CC)',
  hover:       'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))',
};

const DISABLED_REASON = 'Save actions unavailable — RBAC schema not deployed';

export function RbacRolesTable({
  roles,
  selectedId,
  onSelect,
  onCreateRole,
  onEditRole,
  onAssignUsers,
}: RbacRolesTableProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header label */}
      <div
        style={{
          padding: '12px 12px 10px',
          borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: T.subtle,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Roles ({roles.length})
        </span>
      </div>

      {/* Scrollable role card list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {roles.map((role) => {
          const isSelected = role.id === selectedId;
          return (
            <div
              key={role.id}
              role="option"
              aria-selected={isSelected}
              tabIndex={0}
              onClick={() => onSelect(role.id)}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(role.id)}
              style={{
                position: 'relative',
                padding: '10px 12px',
                cursor: 'pointer',
                background: isSelected ? T.selected : 'transparent',
                borderLeft: isSelected
                  ? `3px solid ${T.brandBorder}`
                  : '3px solid transparent',
                transition: 'background 0.1s',
                outline: 'none',
              }}
              onMouseEnter={(e) => {
                if (!isSelected)
                  (e.currentTarget as HTMLElement).style.background = T.hover;
              }}
              onMouseLeave={(e) => {
                if (!isSelected)
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              {/* Name + lock badge + action icons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 4,
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flex: 1 }}
                >
                  {role.systemRole && (
                    <span
                      title="System role — cannot be deleted"
                      style={{ color: T.subtlest, display: 'flex', flexShrink: 0 }}
                    >
                      <LockLockedIcon label="System role" size="small" />
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: T.text,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {role.name}
                  </span>
                </div>

                {/* Edit + Assign icon buttons — always visible, disabled with tooltip */}
                <div
                  style={{ display: 'flex', gap: 0, flexShrink: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Tooltip
                    content={RBAC_SCHEMA_DEPLOYED ? `Edit ${role.name}` : DISABLED_REASON}
                    position="top"
                  >
                    <Button
                      appearance="subtle"
                      spacing="none"
                      iconBefore={EditIcon}
                      isDisabled={!RBAC_SCHEMA_DEPLOYED}
                      onClick={RBAC_SCHEMA_DEPLOYED ? () => onEditRole(role) : undefined}
                      aria-label={`Edit ${role.name}`}
                    />
                  </Tooltip>
                  <Tooltip
                    content={
                      RBAC_SCHEMA_DEPLOYED
                        ? `Assign users to ${role.name}`
                        : DISABLED_REASON
                    }
                    position="top"
                  >
                    <Button
                      appearance="subtle"
                      spacing="none"
                      iconBefore={PeopleGroupIcon}
                      isDisabled={!RBAC_SCHEMA_DEPLOYED}
                      onClick={RBAC_SCHEMA_DEPLOYED ? () => onAssignUsers(role.id) : undefined}
                      aria-label={`Assign users to ${role.name}`}
                    />
                  </Tooltip>
                </div>
              </div>

              {/* Description */}
              {role.description && (
                <div
                  style={{
                    fontSize: 12,
                    color: T.subtlest,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: 2,
                  }}
                >
                  {role.description}
                </div>
              )}

              {/* Stats + status dot */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 5,
                }}
              >
                <span style={{ fontSize: 11, color: T.subtlest }}>
                  {role.userCount} users · {role.permissionCount} perms
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: role.isActive
                        ? 'var(--ds-icon-success, #216E4E)'
                        : 'var(--ds-icon, #44546F)',
                    }}
                  />
                  <span style={{ fontSize: 11, color: T.subtlest }}>
                    {role.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {roles.length === 0 && (
          <div
            style={{
              padding: '32px 12px',
              textAlign: 'center',
              color: T.subtle,
              fontSize: 13,
            }}
          >
            No roles defined.
          </div>
        )}
      </div>

      {/* Footer: New role CTA */}
      <div
        style={{
          padding: '10px 12px',
          borderTop: `1px solid ${T.border}`,
          flexShrink: 0,
        }}
      >
        <Tooltip
          content={RBAC_SCHEMA_DEPLOYED ? undefined : DISABLED_REASON}
          position="top"
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
    </div>
  );
}
