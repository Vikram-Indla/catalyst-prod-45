import React, { useState } from 'react';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Textfield from '@atlaskit/textfield';
import SearchIcon from '@atlaskit/icon/core/search';
import AdminGuard from '@/components/admin/AdminGuard';
import { RbacSchemaBanner } from '@/components/admin/rbac/RbacSchemaBanner';
import { PermissionsMatrix } from '@/components/admin/rbac/PermissionsMatrix';
import {
  MOCK_PERMISSIONS,
  MOCK_ROLES,
  MOCK_ROLE_PERMISSIONS,
  distinctModules,
  RbacPermission,
} from '@/lib/rbac-mock';

const T = {
  text:      'var(--ds-text, #172B4D)',
  subtle:    'var(--ds-text-subtle, #44546F)',
  subtlest:  'var(--ds-text-subtlest, #626F86)',
  border:    'var(--ds-border, #DCDFE4)',
  surface:   'var(--ds-surface, #FFFFFF)',
  hover:     'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))',
  headerBg:  'var(--ds-background-neutral, #F1F2F4)',
  sectionBg: 'var(--ds-surface-sunken, #F7F8F9)',
};

const ACTION_LABELS: Record<RbacPermission['action'], string> = {
  view: 'View', create: 'Create', edit: 'Edit',
  delete: 'Delete', approve: 'Approve', admin: 'Admin',
};

const ACTION_COLORS: Record<RbacPermission['action'], string> = {
  view:    T.subtle,
  create:  'var(--ds-text-information, #0055CC)',
  edit:    'var(--ds-text-warning, #7A4317)',
  delete:  'var(--ds-text-danger, #AE2A19)',
  approve: 'var(--ds-text-success, #216E4E)',
  admin:   'var(--ds-text-brand, #0C66E4)',
};

function PermissionsCatalogue() {
  const [search, setSearch] = useState('');
  const modules = distinctModules();

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MOCK_PERMISSIONS;
    return MOCK_PERMISSIONS.filter(p =>
      p.module.toLowerCase().includes(q) ||
      p.resource.toLowerCase().includes(q) ||
      p.action.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q)
    );
  }, [search]);

  const byModule = React.useMemo(() => {
    const map: Record<string, RbacPermission[]> = {};
    for (const p of filtered) {
      (map[p.module] ??= []).push(p);
    }
    return map;
  }, [filtered]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Search */}
      <div style={{ maxWidth: 360 }}>
        <Textfield
          placeholder="Search permissions…"
          value={search}
          onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
          elemBeforeInput={
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', color: T.subtlest }}>
              <SearchIcon label="" size="small" />
            </span>
          }
        />
      </div>

      {/* Grouped by module */}
      {modules.filter(m => byModule[m]).map(mod => (
        <div key={mod} style={{ border: `1px solid ${T.border}`, borderRadius: 4, overflow: 'hidden' }}>
          {/* Module header */}
          <div style={{ padding: '8px 16px', background: T.sectionBg, borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.subtle, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {mod}
            </span>
          </div>

          {/* Column header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 80px 2fr 3fr', padding: '5px 16px', background: T.headerBg, borderBottom: `1px solid ${T.border}` }}>
            {['Resource', 'Action', 'Description', 'Granted to roles'].map(h => (
              <span key={h} style={{ fontSize: 12, fontWeight: 653, color: T.subtle }}>{h}</span>
            ))}
          </div>

          {/* Permission rows */}
          {(byModule[mod] ?? []).map((perm, i, arr) => {
            const grantedRoles = MOCK_ROLES.filter(r =>
              (MOCK_ROLE_PERMISSIONS[r.id] ?? []).includes(perm.id)
            );
            return (
              <div
                key={perm.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 80px 2fr 3fr',
                  alignItems: 'center',
                  padding: '9px 16px',
                  borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : undefined,
                  background: T.surface,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = T.hover; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = T.surface; }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{perm.resource}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: ACTION_COLORS[perm.action] }}>
                  {ACTION_LABELS[perm.action]}
                </span>
                <span style={{ fontSize: 13, color: T.subtle }}>{perm.description ?? '—'}</span>
                <span style={{ fontSize: 12, color: T.subtlest }}>
                  {grantedRoles.length === 0
                    ? 'None'
                    : grantedRoles.map(r => r.name).join(', ')}
                </span>
              </div>
            );
          })}
        </div>
      ))}

      {filtered.length === 0 && (
        <p style={{ fontSize: 14, color: T.subtle, textAlign: 'center', padding: '24px 0' }}>
          No permissions match your search.
        </p>
      )}
    </div>
  );
}

export default function PermissionsAdminPage() {
  return (
    <AdminGuard>
      <div
        style={{
          padding: '32px 40px',
          maxWidth: 1400,
          margin: '0 auto',
          background: T.surface,
          minHeight: '100%',
        }}
      >
        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 653, color: T.text, lineHeight: '28px' }}>
            Permissions
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: T.subtle }}>
            Permission catalogue and role-permission matrix for the future RBAC schema.
          </p>
        </div>

        {/* Schema not-deployed banner */}
        <RbacSchemaBanner />

        <Tabs id="permissions-admin-tabs" onChange={() => {}}>
          <TabList>
            <Tab>Permission catalogue</Tab>
            <Tab>Role matrix</Tab>
          </TabList>

          {/* Catalogue tab */}
          <TabPanel>
            <div style={{ paddingTop: 20 }}>
              <PermissionsCatalogue />
            </div>
          </TabPanel>

          {/* Matrix tab */}
          <TabPanel>
            <div style={{ paddingTop: 20 }}>
              <PermissionsMatrix />
            </div>
          </TabPanel>
        </Tabs>
      </div>
    </AdminGuard>
  );
}
