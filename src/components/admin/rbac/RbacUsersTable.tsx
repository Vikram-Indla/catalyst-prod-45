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
  onOverrideClick?: (userId: string) => void;
}

const T = {
  text:     'var(--ds-text)',
  subtle:   'var(--ds-text-subtle)',
  subtlest: 'var(--ds-text-subtlest)',
};

function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function buildColumns(onOverrideClick?: (userId: string) => void): Column<UserWithRole>[] {
  return [
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
      id: 'department',
      label: 'Department',
      width: 22,
      cell: ({ row }) => {
        const dept = row.user?.department_name;
        return dept
          ? <span style={{ fontSize: 13, color: T.subtle }}>{dept}</span>
          : <span style={{ fontSize: 13, color: T.subtlest }}>—</span>;
      },
    },
    {
      id: 'assigned_on',
      label: 'Assigned',
      width: 16,
      cell: ({ row }) => (
        <span style={{ fontSize: 13, color: T.subtlest }}>{formatDate((row as UserWithRole & { created_at?: string }).created_at)}</span>
      ),
    },
    {
      id: 'overrides',
      label: 'Overrides',
      width: 14,
      cell: ({ row }) => {
        if (!row.has_overrides) return <span style={{ fontSize: 13, color: T.subtlest }}>—</span>;
        return onOverrideClick ? (
          <button
            onClick={() => onOverrideClick(row.user_id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            title="View / edit overrides"
          >
            <Lozenge appearance="inprogress">Custom</Lozenge>
          </button>
        ) : (
          <Lozenge appearance="inprogress">Custom</Lozenge>
        );
      },
    },
  ];
}

export function RbacUsersTable({ users, isLoading, onOverrideClick }: RbacUsersTableProps) {
  const [search, setSearch] = React.useState('');

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      (u.user?.full_name ?? '').toLowerCase().includes(q) ||
      (u.user?.email ?? '').toLowerCase().includes(q),
    );
  }, [users, search]);

  const columns = React.useMemo(() => buildColumns(onOverrideClick), [onOverrideClick]);

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
        columns={columns}
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
