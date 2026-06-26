import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import Textfield from '@atlaskit/textfield';
import SearchIcon from '@atlaskit/icon/core/search';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { RbacUser, roleById } from '@/lib/rbac-mock';

interface RbacUsersTableProps {
  users: RbacUser[];
}

const T = {
  text:     'var(--ds-text, #172B4D)',
  subtle:   'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
};

const STATUS_LABEL: Record<RbacUser['status'], string> = {
  active:   'Active',
  inactive: 'Inactive',
  pending:  'Pending',
};

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const COLUMNS: Column<RbacUser>[] = [
  {
    id: 'name',
    label: 'User',
    flex: true,
    alwaysVisible: true,
    cell: ({ row }) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div
          aria-hidden="true"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--ds-background-brand-bold, #0C66E4)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {initials(row.name)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: T.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.name}
          </div>
          <div
            style={{
              fontSize: 12,
              color: T.subtle,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.email}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'department',
    label: 'Department',
    width: 15,
    cell: ({ row }) => (
      <span style={{ fontSize: 13, color: T.subtle }}>{row.department ?? '—'}</span>
    ),
  },
  {
    id: 'status',
    label: 'Status',
    width: 12,
    cell: ({ row }) => (
      <Lozenge appearance="default">{STATUS_LABEL[row.status]}</Lozenge>
    ),
  },
  {
    id: 'roles',
    label: 'Roles',
    width: 22,
    cell: ({ row }) => {
      const shown = row.roles.slice(0, 2);
      const extra = row.roles.length - 2;
      if (row.roles.length === 0) {
        return <span style={{ fontSize: 12, color: T.subtlest }}>No roles</span>;
      }
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          {shown.map((rid) => {
            const role = roleById(rid);
            return role ? (
              <span
                key={rid}
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  background: 'var(--ds-background-information, #E9F2FE)',
                  color: 'var(--ds-text-information, #0055CC)',
                  padding: '1px 6px',
                  borderRadius: 2,
                  whiteSpace: 'nowrap',
                }}
              >
                {role.name}
              </span>
            ) : null;
          })}
          {extra > 0 && (
            <span style={{ fontSize: 11, color: T.subtlest }}>+{extra} more</span>
          )}
        </div>
      );
    },
  },
];

export function RbacUsersTable({ users }: RbacUsersTableProps) {
  const [search, setSearch] = React.useState('');

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department ?? '').toLowerCase().includes(q),
    );
  }, [users, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Search */}
      <div style={{ maxWidth: 320 }}>
        <Textfield
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
          elemBeforeInput={
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px',
                color: T.subtlest,
              }}
            >
              <SearchIcon label="" size="small" />
            </span>
          }
        />
      </div>

      <JiraTable<RbacUser>
        columns={COLUMNS}
        data={filtered}
        getRowId={(u) => u.id}
        density="comfortable"
        ariaLabel="Users in this role"
        showRowCount={false}
        emptyView={
          <div
            style={{
              padding: '40px 16px',
              textAlign: 'center',
              color: T.subtle,
              fontSize: 14,
            }}
          >
            {search ? 'No users match your search.' : 'No users in this role.'}
          </div>
        }
      />
    </div>
  );
}
