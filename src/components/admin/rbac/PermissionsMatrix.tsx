import React from 'react';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import {
  MOCK_ROLES,
  MOCK_PERMISSIONS,
  MOCK_ROLE_PERMISSIONS,
  distinctModules,
  RbacRole,
  RbacPermission,
} from '@/lib/rbac-mock';

/**
 * PermissionsMatrix — read-only visual grid showing which roles hold
 * which permissions. Represents the future normalized RBAC schema:
 *   rbac_role_module_permissions + rbac_role_action_permissions
 *
 * Rows  = permissions grouped by module
 * Cols  = roles
 * Cell  = ✓ if the role has that permission
 */

const T = {
  text:      'var(--ds-text, #172B4D)',
  subtle:    'var(--ds-text-subtle, #44546F)',
  subtlest:  'var(--ds-text-subtlest, #626F86)',
  border:    'var(--ds-border, #DCDFE4)',
  surface:   'var(--ds-surface, #FFFFFF)',
  selected:  'var(--ds-background-selected, #E9F2FE)',
  brand:     'var(--ds-icon-brand, #0C66E4)',
  headerBg:  'var(--ds-background-neutral, #F1F2F4)',
  sectionBg: 'var(--ds-surface-sunken, #F7F8F9)',
};

const ACTION_COLORS: Record<RbacPermission['action'], string> = {
  view:    'var(--ds-text-subtle, #44546F)',
  create:  'var(--ds-text-information, #0055CC)',
  edit:    'var(--ds-text-warning, #7A4317)',
  delete:  'var(--ds-text-danger, #AE2A19)',
  approve: 'var(--ds-text-success, #216E4E)',
  admin:   'var(--ds-text-brand, #0C66E4)',
};

const ACTION_LABELS: Record<RbacPermission['action'], string> = {
  view: 'View', create: 'Create', edit: 'Edit',
  delete: 'Delete', approve: 'Approve', admin: 'Admin',
};

interface PermissionsMatrixProps {
  /** Subset of roles to display; defaults to all active roles */
  roles?: RbacRole[];
}

export function PermissionsMatrix({ roles = MOCK_ROLES.filter(r => r.isActive) }: PermissionsMatrixProps) {
  const modules = distinctModules();
  const colWidth = Math.max(80, Math.floor(600 / roles.length));

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        role="grid"
        aria-label="Role permissions matrix"
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
          tableLayout: 'fixed',
        }}
      >
        {/* Column widths */}
        <colgroup>
          <col style={{ width: 200 }} />
          <col style={{ width: 120 }} />
          {roles.map(r => <col key={r.id} style={{ width: colWidth }} />)}
        </colgroup>

        {/* Header row — role names */}
        <thead>
          <tr>
            <th
              scope="col"
              style={{
                textAlign: 'left',
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 653,
                color: T.subtle,
                background: T.headerBg,
                borderBottom: `2px solid ${T.border}`,
                position: 'sticky',
                left: 0,
                zIndex: 1,
              }}
            >
              Module / Resource
            </th>
            <th
              scope="col"
              style={{
                textAlign: 'left',
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 653,
                color: T.subtle,
                background: T.headerBg,
                borderBottom: `2px solid ${T.border}`,
              }}
            >
              Action
            </th>
            {roles.map(role => (
              <th
                key={role.id}
                scope="col"
                style={{
                  textAlign: 'center',
                  padding: '8px 4px',
                  fontSize: 12,
                  fontWeight: 653,
                  color: T.text,
                  background: T.headerBg,
                  borderBottom: `2px solid ${T.border}`,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {role.name}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {modules.map((mod, mi) => {
            const perms = MOCK_PERMISSIONS.filter(p => p.module === mod);

            return (
              <React.Fragment key={mod}>
                {/* Module section header */}
                <tr>
                  <td
                    colSpan={2 + roles.length}
                    style={{
                      padding: '8px 12px 4px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: T.subtle,
                      background: T.sectionBg,
                      borderTop: mi > 0 ? `2px solid ${T.border}` : undefined,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {mod}
                  </td>
                </tr>

                {/* Permission rows */}
                {perms.map((perm, pi) => (
                  <tr key={perm.id}>
                    {/* Resource */}
                    <td
                      style={{
                        padding: '7px 12px',
                        borderBottom: pi < perms.length - 1 ? `1px solid ${T.border}` : undefined,
                        color: T.text,
                        fontWeight: pi === 0 || perms[pi - 1].resource !== perm.resource ? 500 : 400,
                        background: T.surface,
                        position: 'sticky',
                        left: 0,
                        zIndex: 1,
                      }}
                    >
                      {/* Only show resource name when it changes */}
                      {pi === 0 || perms[pi - 1].resource !== perm.resource
                        ? perm.resource
                        : ''}
                    </td>

                    {/* Action badge */}
                    <td
                      style={{
                        padding: '7px 12px',
                        borderBottom: pi < perms.length - 1 ? `1px solid ${T.border}` : undefined,
                        background: T.surface,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 600, color: ACTION_COLORS[perm.action] }}>
                        {ACTION_LABELS[perm.action]}
                      </span>
                    </td>

                    {/* Role cells */}
                    {roles.map(role => {
                      const has = (MOCK_ROLE_PERMISSIONS[role.id] ?? []).includes(perm.id);
                      return (
                        <td
                          key={role.id}
                          style={{
                            textAlign: 'center',
                            padding: '7px 4px',
                            borderBottom: pi < perms.length - 1 ? `1px solid ${T.border}` : undefined,
                            background: has ? 'var(--ds-background-success-hovered, rgba(34,154,84,0.08))' : T.surface,
                          }}
                          aria-label={`${role.name}: ${perm.action} ${perm.resource} — ${has ? 'granted' : 'not granted'}`}
                        >
                          {has ? (
                            <span style={{ color: T.brand, display: 'inline-flex', justifyContent: 'center' }}>
                              <CheckCircleIcon label="" size="small" />
                            </span>
                          ) : (
                            <span style={{ color: T.border, fontSize: 16 }}>·</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      <p style={{ fontSize: 12, color: T.subtlest, marginTop: 8 }}>
        Read-only — mock data representing the future normalized RBAC schema.
        Write access enabled after schema deployment.
      </p>
    </div>
  );
}
