import React from 'react';
import Spinner from '@atlaskit/spinner';
import { PERMISSION_GROUPS, ProductRole, RolePermission } from '@/hooks/useProductRoles';

interface PermissionsMatrixProps {
  roles: ProductRole[];
  permissions: RolePermission[];
  isLoading?: boolean;
}

const T = {
  text:      'var(--ds-text, #172B4D)',
  subtle:    'var(--ds-text-subtle, #44546F)',
  subtlest:  'var(--ds-text-subtlest, #626F86)',
  border:    'var(--ds-border, #DCDFE4)',
  surface:   'var(--ds-surface, #FFFFFF)',
  headerBg:  'var(--ds-background-neutral, #F1F2F4)',
};

function LevelCell({ level }: { level: string | undefined }) {
  switch (level) {
    case 'Full':
      return <span title="Full" style={{ color: 'var(--ds-icon-brand, #0C66E4)', fontSize: 18, lineHeight: 1 }}>●</span>;
    case 'View only':
      return <span title="View only" style={{ color: T.subtle, fontSize: 16, lineHeight: 1 }}>◑</span>;
    case 'Own only':
      return <span title="Own only" style={{ color: T.subtle, fontSize: 16, lineHeight: 1 }}>◐</span>;
    case 'None':
    default:
      return <span style={{ color: T.subtlest, fontSize: 13 }}>—</span>;
  }
}

export function PermissionsMatrix({ roles, permissions, isLoading }: PermissionsMatrixProps) {
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
        <Spinner size="medium" />
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: T.subtle, fontSize: 14 }}>
        No roles to display.
      </div>
    );
  }

  const permMap = React.useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    for (const p of permissions) {
      if (!map[p.role_id]) map[p.role_id] = {};
      map[p.role_id][p.permission_group] = p.permission_level;
    }
    return map;
  }, [permissions]);

  const colWidth = Math.max(100, Math.floor(640 / Math.max(roles.length, 1)));

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        role="grid"
        aria-label="Role permissions matrix"
        style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}
      >
        <colgroup>
          <col style={{ width: 220 }} />
          {roles.map(r => <col key={r.id} style={{ width: colWidth }} />)}
        </colgroup>

        <thead>
          <tr>
            <th
              scope="col"
              style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, fontWeight: 600, color: T.subtle, background: T.headerBg, borderBottom: `2px solid ${T.border}`, position: 'sticky', left: 0, zIndex: 1 }}
            >
              Permission group
            </th>
            {roles.map(role => (
              <th
                key={role.id}
                scope="col"
                style={{ textAlign: 'center', padding: '8px 10px', fontSize: 12, fontWeight: 600, color: T.text, background: T.headerBg, borderBottom: `2px solid ${T.border}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {role.name}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {PERMISSION_GROUPS.map((group, gi) => (
            <tr key={group}>
              <td
                style={{ padding: '9px 12px', borderBottom: `1px solid ${T.border}`, color: T.text, fontWeight: 500, background: T.surface, position: 'sticky', left: 0, zIndex: 1 }}
              >
                {group}
              </td>
              {roles.map(role => (
                <td
                  key={role.id}
                  style={{ textAlign: 'center', padding: '9px 4px', borderBottom: `1px solid ${T.border}`, background: T.surface }}
                  aria-label={`${role.name}: ${group} — ${permMap[role.id]?.[group] ?? 'None'}`}
                >
                  <LevelCell level={permMap[role.id]?.[group]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12, color: T.subtlest }}>
        <span><span style={{ color: 'var(--ds-icon-brand, #0C66E4)' }}>●</span> Full</span>
        <span><span style={{ color: T.subtle }}>◑</span> View only</span>
        <span><span style={{ color: T.subtle }}>◐</span> Own only</span>
        <span>— None</span>
      </div>
    </div>
  );
}
