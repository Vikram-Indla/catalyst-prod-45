// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ STATUS BADGE
// Enforces filled pill backgrounds + optional dot for Active.
// Uses Task10 scoped CSS variables to avoid hardcoded colors in components.
// ═══════════════════════════════════════════════════════════════════════════

import type { CSSProperties } from 'react';
import type { T10ListStatus } from '../../types';

interface StatusBadgeProps {
  status: T10ListStatus;
  className?: string;
}

const labelByStatus: Record<T10ListStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  archived: 'Archived',
};

const styleByStatus: Record<T10ListStatus, CSSProperties> = {
  active: {
    backgroundColor: 'var(--t10-success-50)',
    color: 'var(--t10-success)',
  },
  inactive: {
    backgroundColor: 'var(--t10-gray-100)',
    color: 'var(--t10-gray-500)',
  },
  archived: {
    backgroundColor: 'var(--t10-gray-200)',
    color: 'var(--t10-gray-600)',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={[
        't10-status-badge',
        `t10-status-badge--${status}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={styleByStatus[status]}
    >
      {status === 'active' && (
        <span
          className="t10-status-badge__dot"
          style={{ backgroundColor: 'var(--t10-success)' }}
        />
      )}
      {labelByStatus[status]}
    </span>
  );
}

export default StatusBadge;
