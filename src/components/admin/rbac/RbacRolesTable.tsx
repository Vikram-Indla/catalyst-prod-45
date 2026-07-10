import React from 'react';
import Button from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import AddIcon from '@atlaskit/icon/core/add';
import EditIcon from '@atlaskit/icon/core/edit';
import PeopleGroupIcon from '@atlaskit/icon/core/people-group';
import Lozenge from '@atlaskit/lozenge';
import { ProductRole } from '@/hooks/useProductRoles';

interface RbacRolesTableProps {
  roles: ProductRole[];
  selectedId: string | null;
  isLoading?: boolean;
  onSelect: (id: string) => void;
  onCreateRole: () => void;
  onEditRole: (role: ProductRole) => void;
  onAssignUsers: (roleId: string) => void;
}

const T = {
  text:        'var(--ds-text)',
  subtle:      'var(--ds-text-subtle)',
  subtlest:    'var(--ds-text-subtlest)',
  border:      'var(--ds-border)',
  selected:    'var(--ds-background-selected)',
  brandBorder: 'var(--ds-border-brand)',
  hover:       'var(--ds-background-neutral-subtle-hovered)',
};

export function RbacRolesTable({
  roles, selectedId, isLoading,
  onSelect, onCreateRole, onEditRole, onAssignUsers,
}: RbacRolesTableProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '12px 12px 10px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.subtle, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Roles ({roles.length})
        </span>
      </div>

      {/* Scrollable list */}
      <div role="listbox" aria-label="Roles" style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {isLoading ? (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: T.subtle, fontSize: 13 }}>
            Loading…
          </div>
        ) : roles.length === 0 ? (
          <div style={{ padding: '32px 12px', textAlign: 'center', color: T.subtle, fontSize: 13 }}>
            No roles configured.
          </div>
        ) : (
          roles.map((role) => {
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
                  padding: '8px 12px',
                  cursor: 'pointer',
                  background: isSelected ? T.selected : 'transparent',
                  borderLeft: isSelected ? `3px solid ${T.brandBorder}` : '3px solid transparent',
                  transition: 'background 0.1s',
                  outline: 'none',
                }}
                onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = T.hover; }}
                onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {/* Name + action icons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {role.name}
                  </span>
                  <div style={{ display: 'flex', gap: 0, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <Tooltip content={`Edit ${role.name}`} position="top">
                      <Button
                        appearance="subtle" spacing="none"
                        iconBefore={EditIcon}
                        onClick={() => onEditRole(role)}
                        aria-label={`Edit ${role.name}`}
                      />
                    </Tooltip>
                    <Tooltip content={`Assign users to ${role.name}`} position="top">
                      <Button
                        appearance="subtle" spacing="none"
                        iconBefore={PeopleGroupIcon}
                        onClick={() => onAssignUsers(role.id)}
                        aria-label={`Assign users to ${role.name}`}
                      />
                    </Tooltip>
                  </div>
                </div>

                {/* Role code */}
                <div style={{ fontSize: 11, color: T.subtlest, fontFamily: 'monospace', marginTop: 0 }}>
                  {role.code}
                </div>

                {/* Stats + active badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: T.subtlest }}>
                    {role.user_count ?? 0} users
                  </span>
                  <Lozenge appearance={role.is_active ? 'inprogress' : 'default'}>
                    {role.is_active ? 'Active' : 'Inactive'}
                  </Lozenge>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '8px 12px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
        <Button
          appearance="primary"
          spacing="compact"
          iconBefore={AddIcon}
          onClick={onCreateRole}
        >
          New role
        </Button>
      </div>
    </div>
  );
}
