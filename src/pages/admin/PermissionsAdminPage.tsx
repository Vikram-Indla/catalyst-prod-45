import React from 'react';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import Textfield from '@atlaskit/textfield';
import SearchIcon from '@atlaskit/icon/core/search';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import {
  useProductRoles,
  useAllRolePermissions,
  PERMISSION_GROUPS,
  ProductRole,
  RolePermission,
} from '@/hooks/useProductRoles';

const T = {
  text:     'var(--ds-text, #172B4D)',
  subtle:   'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
};

interface ActionRow {
  group: string;
  module: string;
  label: string;
  allowRoles: string[];
  denyRoles: string[];
}

function buildRows(roles: ProductRole[], permissions: RolePermission[]): ActionRow[] {
  const roleMap = Object.fromEntries(roles.map(r => [r.id, r.name]));
  return PERMISSION_GROUPS.map(group => {
    const colonIdx = group.indexOf(':');
    const module = colonIdx > -1 ? group.slice(0, colonIdx).trim() : 'Other';
    const label = colonIdx > -1 ? group.slice(colonIdx + 1).trim() : group;
    const allowRoles: string[] = [];
    const denyRoles: string[] = [];
    for (const p of permissions) {
      if (p.permission_group !== group) continue;
      const name = roleMap[p.role_id];
      if (!name) continue;
      if (p.permission_level === 'Allow') allowRoles.push(name);
      else denyRoles.push(name);
    }
    return { group, module, label, allowRoles, denyRoles };
  });
}

const COLUMNS: Column<ActionRow>[] = [
  {
    id: 'action',
    label: 'Action',
    flex: true,
    alwaysVisible: true,
    cell: ({ row }) => (
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{row.label}</div>
        <div style={{ fontSize: 11, color: T.subtlest, marginTop: 1 }}>{row.module}</div>
      </div>
    ),
  },
  {
    id: 'allow',
    label: 'Roles with Allow',
    width: 40,
    cell: ({ row }) =>
      row.allowRoles.length === 0 ? (
        <span style={{ fontSize: 12, color: T.subtlest }}>None</span>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {row.allowRoles.map(r => (
            <Lozenge key={r} appearance="success">{r}</Lozenge>
          ))}
        </div>
      ),
  },
  {
    id: 'deny_count',
    label: 'Roles with Deny',
    width: 20,
    cell: ({ row }) => (
      <span style={{ fontSize: 12, color: T.subtlest }}>
        {row.denyRoles.length > 0 ? `${row.denyRoles.length} role${row.denyRoles.length > 1 ? 's' : ''}` : '—'}
      </span>
    ),
  },
];

export default function PermissionsAdminPage() {
  const [search, setSearch] = React.useState('');
  const { roles = [], isLoading: rolesLoading } = useProductRoles();
  const { data: permissions = [], isLoading: permsLoading } = useAllRolePermissions();

  const isLoading = rolesLoading || permsLoading;

  const rows = React.useMemo(() => buildRows(roles, permissions), [roles, permissions]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.label.toLowerCase().includes(q) ||
      r.module.toLowerCase().includes(q) ||
      r.allowRoles.some(n => n.toLowerCase().includes(q)),
    );
  }, [rows, search]);

  return (
    <AdminGuard>
      <div style={{ padding: '24px 32px', minHeight: '100%' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: T.text, lineHeight: '28px' }}>
          Permissions
        </h1>
        <p style={{ margin: '4px 0 24px', fontSize: 14, color: T.subtle }}>
          Action-level permission catalogue. Edit permissions in the Roles page.
        </p>

        <div style={{ maxWidth: 360, marginBottom: 16 }}>
          <Textfield
            placeholder="Search actions or roles…"
            value={search}
            onChange={e => setSearch((e.target as HTMLInputElement).value)}
            elemBeforeInput={
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', color: T.subtlest }}>
                <SearchIcon label="" size="small" />
              </span>
            }
          />
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <Spinner size="large" />
          </div>
        ) : (
          <JiraTable<ActionRow>
            columns={COLUMNS}
            data={filtered}
            getRowId={r => r.group}
            density="comfortable"
            ariaLabel="Permission catalogue"
            showRowCount={false}
            emptyView={
              <div style={{ padding: '40px 16px', textAlign: 'center', color: T.subtle, fontSize: 14 }}>
                {search ? 'No actions match your search.' : 'No permissions configured.'}
              </div>
            }
          />
        )}
      </div>
    </AdminGuard>
  );
}
