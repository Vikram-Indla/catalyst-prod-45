import React from 'react';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import Spinner from '@atlaskit/spinner';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { UserWithRole } from '@/hooks/useProductRoles';

interface RbacAssignmentsTableProps {
  users: UserWithRole[];
  isLoading?: boolean;
}

const T = {
  text:     'var(--ds-text, #172B4D)',
  subtle:   'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
};

function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return '—';
  }
}

type UserWithRoleAndDate = UserWithRole & { created_at?: string };

const COLUMNS: Column<UserWithRoleAndDate>[] = [
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
    id: 'assigned_on',
    label: 'Assigned on',
    width: 16,
    cell: ({ row }) => (
      <span style={{ fontSize: 13, color: T.subtlest }}>{formatDate(row.created_at)}</span>
    ),
  },
];

export function RbacAssignmentsTable({ users, isLoading }: RbacAssignmentsTableProps) {
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
        <Spinner size="medium" />
      </div>
    );
  }

  return (
    <JiraTable<UserWithRoleAndDate>
      columns={COLUMNS}
      data={users as UserWithRoleAndDate[]}
      getRowId={(u) => u.id}
      density="comfortable"
      ariaLabel="Role assignments"
      showRowCount={false}
      emptyView={
        <div style={{ padding: '40px 16px', textAlign: 'center', color: T.subtle, fontSize: 14 }}>
          No users assigned to this role.
        </div>
      }
    />
  );
}
