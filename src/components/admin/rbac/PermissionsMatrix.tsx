import React from 'react';
import Button from '@atlaskit/button/new';
import Spinner from '@atlaskit/spinner';
import {
  PERMISSION_GROUPS,
  PermissionLevel,
  ProductRole,
  RolePermission,
  useUpdateRolePermissions,
} from '@/hooks/useProductRoles';

interface PermissionsMatrixProps {
  roles: ProductRole[];
  permissions: RolePermission[];
  isLoading?: boolean;
}

const CYCLE: PermissionLevel[] = ['Deny', 'Allow'];

const CATEGORY_GROUPS: { label: string; groups: string[] }[] = [
  {
    label: 'Project',
    groups: [
      'Project: Create',
      'Project: Delete',
      'Project: Archive',
      'Project: Rename',
      'Project: Manage Members',
      'Project: Change Lead',
      'Project: Edit Settings',
      'Project: Export Data',
      'Project: View All Projects',
      'Project: Change Icon',
    ],
  },
  {
    label: 'Product — Stories',
    groups: [
      'Product: Create Story',
      'Product: Delete Story',
      'Product: Edit Story',
      'Product: Rename Story',
      'Product: Assign Story',
      'Product: Change Story Status',
      'Product: Change Story Priority',
      'Product: Move Story to Sprint',
      'Product: Clone Story',
    ],
  },
  {
    label: 'Product — Epics & Sprints',
    groups: [
      'Product: Create Epic',
      'Product: Delete Epic',
      'Product: Edit Epic',
      'Product: Create Sprint',
      'Product: Start Sprint',
      'Product: Close Sprint',
      'Product: Delete Sprint',
    ],
  },
  {
    label: 'Product — Board & General',
    groups: [
      'Product: View Backlog',
      'Product: Manage Board',
      'Product: Add Comment',
      'Product: Delete Comment',
      'Product: Link Issues',
      'Product: Export Stories',
    ],
  },
];

function cycleLevel(current: PermissionLevel | undefined): PermissionLevel {
  const idx = CYCLE.indexOf(current ?? 'Deny');
  return CYCLE[(idx + 1) % CYCLE.length];
}

const T = {
  text:     'var(--ds-text)',
  subtle:   'var(--ds-text-subtle)',
  subtlest: 'var(--ds-text-subtlest)',
  border:   'var(--ds-border)',
  surface:  'var(--ds-surface)',
  headerBg: 'var(--ds-background-neutral)',
  selected: 'var(--ds-background-selected)',
  allow:    'var(--ds-icon-success)',
};

function LevelIcon({ level }: { level: PermissionLevel | undefined }) {
  if (level === 'Allow') {
    return (
      <span title="Allow" style={{ color: T.allow, fontSize: 18, lineHeight: 1, fontWeight: 700 }}>✓</span>
    );
  }
  return <span style={{ color: T.subtlest, fontSize: 13 }}>—</span>;
}

function EditableCell({ level, onClick }: { level: PermissionLevel | undefined; onClick: () => void }) {
  const isAllow = level === 'Allow';
  return (
    <button
      onClick={onClick}
      title={`${level ?? 'Deny'} — click to toggle`}
      style={{
        background: isAllow ? 'var(--ds-background-success)' : 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px 8px',
        borderRadius: 4,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => {
        if (!isAllow) (e.currentTarget as HTMLElement).style.background = T.selected;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = isAllow ? 'var(--ds-background-success)' : 'none';
      }}
    >
      <LevelIcon level={level} />
    </button>
  );
}

export function PermissionsMatrix({ roles, permissions, isLoading }: PermissionsMatrixProps) {
  const editable = roles.length === 1;
  const updatePerms = useUpdateRolePermissions();

  const [localLevels, setLocalLevels] = React.useState<Record<string, PermissionLevel>>({});
  const [isDirty, setIsDirty] = React.useState(false);

  React.useEffect(() => {
    const map: Record<string, PermissionLevel> = {};
    for (const p of permissions) {
      map[p.permission_group] = p.permission_level as PermissionLevel;
    }
    setLocalLevels(map);
    setIsDirty(false);
  }, [permissions]);

  const permMap = React.useMemo(() => {
    const map: Record<string, Record<string, PermissionLevel>> = {};
    for (const p of permissions) {
      if (!map[p.role_id]) map[p.role_id] = {};
      map[p.role_id][p.permission_group] = p.permission_level as PermissionLevel;
    }
    return map;
  }, [permissions]);

  function handleCellClick(group: string) {
    setLocalLevels(prev => ({ ...prev, [group]: cycleLevel(prev[group] as PermissionLevel | undefined) }));
    setIsDirty(true);
  }

  async function handleSave() {
    if (!editable || !roles[0]) return;
    try {
      await updatePerms.mutateAsync({ roleId: roles[0].id, permissions: localLevels as Record<string, PermissionLevel> });
      setIsDirty(false);
    } catch {
      // toast fired by mutation onError
    }
  }

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

  const colWidth = Math.max(100, Math.floor(640 / Math.max(roles.length, 1)));

  return (
    <div>
      {editable && isDirty && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <Button
            appearance="primary"
            spacing="compact"
            isLoading={updatePerms.isPending}
            onClick={handleSave}
          >
            Save permissions
          </Button>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table
          role="grid"
          aria-label="Role permissions matrix"
          style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}
        >
          <colgroup>
            <col style={{ width: 260 }} />
            {roles.map(r => <col key={r.id} style={{ width: colWidth }} />)}
          </colgroup>

          <thead>
            <tr>
              <th
                scope="col"
                style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, fontWeight: 600, color: T.subtle, background: T.headerBg, borderBottom: `2px solid ${T.border}`, position: 'sticky', left: 0, zIndex: 1 }}
              >
                Action
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
            {CATEGORY_GROUPS.map(category => (
              <React.Fragment key={category.label}>
                <tr>
                  <td
                    colSpan={roles.length + 1}
                    style={{
                      padding: '10px 12px 4px',
                      background: T.headerBg,
                      color: T.subtlest,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      borderBottom: `1px solid ${T.border}`,
                      position: 'sticky',
                      left: 0,
                    }}
                  >
                    {category.label}
                  </td>
                </tr>
                {category.groups.map(group => {
                  const label = group.replace(/^(Project|Product): /, '');
                  return (
                    <tr key={group}>
                      <td
                        style={{ padding: '9px 12px 9px 20px', borderBottom: `1px solid ${T.border}`, color: T.text, fontWeight: 400, background: T.surface, position: 'sticky', left: 0, zIndex: 1 }}
                      >
                        {label}
                      </td>
                      {roles.map(role => {
                        const level = editable
                          ? (localLevels[group] as PermissionLevel | undefined)
                          : permMap[role.id]?.[group];
                        return (
                          <td
                            key={role.id}
                            style={{ textAlign: 'center', padding: '9px 4px', borderBottom: `1px solid ${T.border}`, background: T.surface }}
                            aria-label={`${role.name}: ${group} — ${level ?? 'Deny'}`}
                          >
                            {editable ? (
                              <EditableCell level={level} onClick={() => handleCellClick(group)} />
                            ) : (
                              <LevelIcon level={level} />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12, color: T.subtlest, flexWrap: 'wrap' }}>
        <span><span style={{ color: T.allow, fontWeight: 700 }}>✓</span> Allow</span>
        <span>— Deny</span>
        {editable && <span style={{ color: T.subtle, marginLeft: 4 }}>· Click any cell to toggle</span>}
      </div>
    </div>
  );
}
