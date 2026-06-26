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

const CYCLE: PermissionLevel[] = ['None', 'Full', 'View only', 'Own only'];

function cycleLevel(current: PermissionLevel | undefined): PermissionLevel {
  const idx = CYCLE.indexOf(current ?? 'None');
  return CYCLE[(idx + 1) % CYCLE.length];
}

const T = {
  text:     'var(--ds-text, #172B4D)',
  subtle:   'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
  border:   'var(--ds-border, #DCDFE4)',
  surface:  'var(--ds-surface, #FFFFFF)',
  headerBg: 'var(--ds-background-neutral, #F1F2F4)',
  selected: 'var(--ds-background-selected, #E9F2FE)',
};

function LevelIcon({ level }: { level: PermissionLevel | undefined }) {
  switch (level) {
    case 'Full':      return <span title="Full" style={{ color: 'var(--ds-icon-brand, #0C66E4)', fontSize: 18, lineHeight: 1 }}>●</span>;
    case 'View only': return <span title="View only" style={{ color: T.subtle, fontSize: 16, lineHeight: 1 }}>◑</span>;
    case 'Own only':  return <span title="Own only" style={{ color: T.subtle, fontSize: 16, lineHeight: 1 }}>◐</span>;
    default:          return <span style={{ color: T.subtlest, fontSize: 13 }}>—</span>;
  }
}

function EditableCell({ level, onClick }: { level: PermissionLevel | undefined; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={`${level ?? 'None'} — click to change`}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '4px 8px', borderRadius: 4,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.selected; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
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
      map[p.permission_group] = p.permission_level;
    }
    setLocalLevels(map);
    setIsDirty(false);
  }, [permissions]);

  const permMap = React.useMemo(() => {
    const map: Record<string, Record<string, PermissionLevel>> = {};
    for (const p of permissions) {
      if (!map[p.role_id]) map[p.role_id] = {};
      map[p.role_id][p.permission_group] = p.permission_level;
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
      await updatePerms.mutateAsync({ roleId: roles[0].id, permissions: localLevels });
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
            {PERMISSION_GROUPS.map(group => (
              <tr key={group}>
                <td
                  style={{ padding: '9px 12px', borderBottom: `1px solid ${T.border}`, color: T.text, fontWeight: 500, background: T.surface, position: 'sticky', left: 0, zIndex: 1 }}
                >
                  {group}
                </td>
                {roles.map(role => {
                  const level = editable
                    ? (localLevels[group] as PermissionLevel | undefined)
                    : permMap[role.id]?.[group];
                  return (
                    <td
                      key={role.id}
                      style={{ textAlign: 'center', padding: '9px 4px', borderBottom: `1px solid ${T.border}`, background: T.surface }}
                      aria-label={`${role.name}: ${group} — ${level ?? 'None'}`}
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
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12, color: T.subtlest, flexWrap: 'wrap' }}>
        <span><span style={{ color: 'var(--ds-icon-brand, #0C66E4)' }}>●</span> Full</span>
        <span><span style={{ color: T.subtle }}>◑</span> View only</span>
        <span><span style={{ color: T.subtle }}>◐</span> Own only</span>
        <span>— None</span>
        {editable && <span style={{ color: T.subtle, marginLeft: 4 }}>· Click any cell to change</span>}
      </div>
    </div>
  );
}
