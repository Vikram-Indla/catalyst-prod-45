import React from 'react';
import { RbacAssignment, userById, roleById } from '@/lib/rbac-mock';

interface RbacAssignmentsTableProps {
  assignments: RbacAssignment[];
}

const T = {
  text:      'var(--ds-text, #172B4D)',
  subtle:    'var(--ds-text-subtle, #44546F)',
  subtlest:  'var(--ds-text-subtlest, #626F86)',
  border:    'var(--ds-border, #DCDFE4)',
  surface:   'var(--ds-surface, #FFFFFF)',
  hover:     'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))',
  headerBg:  'var(--ds-background-neutral, #F1F2F4)',
};

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function RbacAssignmentsTable({ assignments }: RbacAssignmentsTableProps) {
  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 4, overflow: 'hidden' }}>
      {/* Column headings */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr',
          padding: '6px 16px',
          background: T.headerBg,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        {['User', 'Role', 'Assigned by', 'Date'].map(h => (
          <span key={h} style={{ fontSize: 12, fontWeight: 653, color: T.subtle }}>
            {h}
          </span>
        ))}
      </div>

      {assignments.map(a => {
        const user = userById(a.userId);
        const role = roleById(a.roleId);
        const assignedByUser = a.assignedBy === 'system' ? null : (a.assignedBy ? userById(a.assignedBy) : null);

        return (
          <div
            key={a.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr',
              alignItems: 'center',
              padding: '10px 16px',
              borderBottom: `1px solid ${T.border}`,
              background: T.surface,
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = T.hover; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = T.surface; }}
          >
            <span style={{ fontSize: 14, color: T.text }}>
              {user?.name ?? a.userId}
            </span>
            <span style={{ fontSize: 13, color: T.subtle }}>
              {role?.name ?? a.roleId}
            </span>
            <span style={{ fontSize: 13, color: T.subtle }}>
              {assignedByUser?.name ?? (a.assignedBy === 'system' ? 'System' : a.assignedBy ?? '—')}
            </span>
            <span style={{ fontSize: 13, color: T.subtlest }}>
              {formatDate(a.assignedAt)}
            </span>
          </div>
        );
      })}

      {assignments.length === 0 && (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: T.subtle, fontSize: 14 }}>
          No role assignments yet.
        </div>
      )}
    </div>
  );
}
