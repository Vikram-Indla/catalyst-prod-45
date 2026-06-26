import React, { useState } from 'react';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Textfield from '@atlaskit/textfield';
import Spinner from '@atlaskit/spinner';
import SearchIcon from '@atlaskit/icon/core/search';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { PermissionsMatrix } from '@/components/admin/rbac/PermissionsMatrix';
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
  text:      'var(--ds-text, #172B4D)',
  subtle:    'var(--ds-text-subtle, #44546F)',
  subtlest:  'var(--ds-text-subtlest, #626F86)',
  border:    'var(--ds-border, #DCDFE4)',
  surface:   'var(--ds-surface, #FFFFFF)',
  sectionBg: 'var(--ds-surface-sunken, #F7F8F9)',
};

interface PermGroupRow {
  group: string;
  fullRoles: string[];
  viewRoles: string[];
  ownRoles: string[];
}

function buildCatalogueRows(roles: ProductRole[], permissions: RolePermission[]): PermGroupRow[] {
  const roleMap = Object.fromEntries(roles.map(r => [r.id, r.name]));
  const groupMap: Record<string, { full: string[]; view: string[]; own: string[] }> = {};
  for (const g of PERMISSION_GROUPS) {
    groupMap[g] = { full: [], view: [], own: [] };
  }
  for (const p of permissions) {
    const name = roleMap[p.role_id];
    if (!name) continue;
    const entry = groupMap[p.permission_group];
    if (!entry) continue;
    if (p.permission_level === 'Full') entry.full.push(name);
    else if (p.permission_level === 'View only') entry.view.push(name);
    else if (p.permission_level === 'Own only') entry.own.push(name);
  }
  return PERMISSION_GROUPS.map(g => ({
    group: g,
    fullRoles: groupMap[g]?.full ?? [],
    viewRoles: groupMap[g]?.view ?? [],
    ownRoles:  groupMap[g]?.own ?? [],
  }));
}

const CATALOGUE_COLUMNS: Column<PermGroupRow>[] = [
  {
    id: 'group',
    label: 'Permission group',
    flex: true,
    alwaysVisible: true,
    cell: ({ row }) => (
      <span style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{row.group}</span>
    ),
  },
  {
    id: 'full',
    label: 'Full access',
    width: 22,
    cell: ({ row }) => (
      <span style={{ fontSize: 13, color: row.fullRoles.length > 0 ? T.subtle : T.subtlest }}>
        {row.fullRoles.length > 0 ? row.fullRoles.join(', ') : '—'}
      </span>
    ),
  },
  {
    id: 'view',
    label: 'View only',
    width: 22,
    cell: ({ row }) => (
      <span style={{ fontSize: 13, color: row.viewRoles.length > 0 ? T.subtle : T.subtlest }}>
        {row.viewRoles.length > 0 ? row.viewRoles.join(', ') : '—'}
      </span>
    ),
  },
  {
    id: 'own',
    label: 'Own only',
    width: 16,
    cell: ({ row }) => (
      <span style={{ fontSize: 13, color: row.ownRoles.length > 0 ? T.subtle : T.subtlest }}>
        {row.ownRoles.length > 0 ? row.ownRoles.join(', ') : '—'}
      </span>
    ),
  },
];

function PermissionsCatalogue({ roles, permissions, isLoading }: { roles: ProductRole[]; permissions: RolePermission[]; isLoading: boolean }) {
  const [search, setSearch] = useState('');

  const rows = React.useMemo(() => buildCatalogueRows(roles, permissions), [roles, permissions]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => r.group.toLowerCase().includes(q));
  }, [rows, search]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
        <Spinner size="medium" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ maxWidth: 360 }}>
        <Textfield
          placeholder="Search permission groups…"
          value={search}
          onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
          elemBeforeInput={
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', color: T.subtlest }}>
              <SearchIcon label="" size="small" />
            </span>
          }
        />
      </div>

      <JiraTable<PermGroupRow>
        columns={CATALOGUE_COLUMNS}
        data={filtered}
        getRowId={(r) => r.group}
        density="comfortable"
        ariaLabel="Permission groups catalogue"
        showRowCount={false}
        emptyView={
          <div style={{ padding: '40px 16px', textAlign: 'center', color: T.subtle, fontSize: 14 }}>
            {search ? 'No permission groups match your search.' : 'No permissions found.'}
          </div>
        }
      />
    </div>
  );
}

export default function PermissionsAdminPage() {
  const { roles = [], isLoading: rolesLoading } = useProductRoles();
  const { data: allPerms = [], isLoading: permsLoading } = useAllRolePermissions();

  const isLoading = rolesLoading || permsLoading;

  return (
    <AdminGuard>
      <div style={{ padding: '32px 40px', maxWidth: 1400, margin: '0 auto', background: T.surface, minHeight: '100%' }}>
        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: T.text, lineHeight: '28px' }}>
            Permissions
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: T.subtle }}>
            Permission groups and role access levels across all modules.
          </p>
        </div>

        <Tabs id="permissions-admin-tabs" onChange={() => {}}>
          <TabList>
            <Tab>Permission catalogue</Tab>
            <Tab>Role matrix</Tab>
          </TabList>

          <TabPanel>
            <div style={{ paddingTop: 20 }}>
              <PermissionsCatalogue roles={roles} permissions={allPerms} isLoading={isLoading} />
            </div>
          </TabPanel>

          <TabPanel>
            <div style={{ paddingTop: 20 }}>
              <PermissionsMatrix roles={roles} permissions={allPerms} isLoading={isLoading} />
            </div>
          </TabPanel>
        </Tabs>
      </div>
    </AdminGuard>
  );
}
