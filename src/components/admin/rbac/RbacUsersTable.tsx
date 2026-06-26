import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import Textfield from '@atlaskit/textfield';
import Spinner from '@atlaskit/spinner';
import SearchIcon from '@atlaskit/icon/core/search';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { UserWithRole } from '@/hooks/useProductRoles';

interface RbacUsersTableProps {
  users: UserWithRole[];
  isLoading?: boolean;
}

const T = {
  text:     'var(--ds-text, #172B4D)',
  subtle:   'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
};

const COLUMNS: Column<UserWithRole>[] = [
  {
    id: 'user',
    label: 'User',
    flex: true,
    alwaysVisible: true,
    cell: ({ row }) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <CatalystAvatar
          name={row.user?.full_name ?? row.user?.email ?? '?'}
          size="small"
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.user?.full_name ?? '—'}
          </div>
          <div style={{ fontSize: 12, color: T.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.user?.email ?? '—'}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'business_lines',
    label: 'Business lines',
    width: 22,
    cell: ({ row }) => {
      const lines = row.business_lines ?? [];
      return lines.length > 0
        ? <span style={{ fontSize: 13, color: T.subtle }}>{lines.join(', ')}</span>
        : <span style={{ fontSize: 13, color: T.subtlest }}>—</span>;
    },
  },
  {
    id: 'overrides',
    label: 'Overrides',
    width: 14,
    cell: ({ row }) => (
      row.has_overrides
        ? <Lozenge appearance="inprogress">Custom</Lozenge>
        : <span style={{ fontSize: 13, color: T.subtlest }}>—</span>
    ),
  },
];

export function RbacUsersTable({ users, isLoading }: RbacUsersTableProps) {
  const [search, setSearch] = React.useState('');

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      (u.user?.full_name ?? '').toLowerCase().includes(q) ||
      (u.user?.email ?? '').toLowerCase().includes(q),
    );
  }, [users, search]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
        <Spinner size="medium" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ maxWidth: 320 }}>
        <Textfield
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
          elemBeforeInput={
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', color: T.subtlest }}>
              <SearchIcon label="" size="small" />
            </span>
          }
        />
      </div>

      <JiraTable<UserWithRole>
        columns={COLUMNS}
        data={filtered}
        getRowId={(u) => u.id}
        density="comfortable"
        ariaLabel="Users in this role"
        showRowCount={false}
        emptyView={
          <div style={{ padding: '40px 16px', textAlign: 'center', color: T.subtle, fontSize: 14 }}>
            {search ? 'No users match your search.' : 'No users assigned to this role.'}
          </div>
        }
      />
    </div>
  );
}
