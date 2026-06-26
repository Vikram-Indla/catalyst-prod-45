import React from 'react';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { RbacAssignment, userById, roleById } from '@/lib/rbac-mock';

interface RbacAssignmentsTableProps {
  assignments: RbacAssignment[];
}

const T = {
  text:     'var(--ds-text, #172B4D)',
  subtle:   'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
};

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

const COLUMNS: Column<RbacAssignment>[] = [
  {
    id: 'user',
    label: 'User',
    flex: true,
    alwaysVisible: true,
    cell: ({ row }) => {
      const user = userById(row.userId);
      return (
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
            {user ? initials(user.name) : '?'}
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: T.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user?.name ?? row.userId}
          </span>
        </div>
      );
    },
  },
  {
    id: 'role',
    label: 'Role',
    width: 20,
    cell: ({ row }) => {
      const role = roleById(row.roleId);
      return (
        <span style={{ fontSize: 13, color: T.subtle }}>{role?.name ?? row.roleId}</span>
      );
    },
  },
  {
    id: 'assignedBy',
    label: 'Assigned by',
    width: 18,
    cell: ({ row }) => {
      const byUser =
        row.assignedBy === 'system' ? null
        : row.assignedBy ? userById(row.assignedBy)
        : null;
      const label =
        byUser?.name ?? (row.assignedBy === 'system' ? 'System' : row.assignedBy ?? '—');
      return <span style={{ fontSize: 13, color: T.subtle }}>{label}</span>;
    },
  },
  {
    id: 'date',
    label: 'Date',
    width: 14,
    cell: ({ row }) => (
      <span style={{ fontSize: 13, color: T.subtlest }}>{formatDate(row.assignedAt)}</span>
    ),
  },
];

export function RbacAssignmentsTable({ assignments }: RbacAssignmentsTableProps) {
  return (
    <JiraTable<RbacAssignment>
      columns={COLUMNS}
      data={assignments}
      getRowId={(a) => a.id}
      density="comfortable"
      ariaLabel="Role assignments"
      showRowCount={false}
      emptyView={
        <div
          style={{
            padding: '40px 16px',
            textAlign: 'center',
            color: 'var(--ds-text-subtle, #44546F)',
            fontSize: 14,
          }}
        >
          No assignments for this role.
        </div>
      }
    />
  );
}
