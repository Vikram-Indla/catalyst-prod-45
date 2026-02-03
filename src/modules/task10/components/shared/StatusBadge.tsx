// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ STATUS BADGE
// Pill-shaped badges with filled backgrounds for list status indicators.
// Uses BOTH CSS classes AND inline styles for maximum compatibility.
// ═══════════════════════════════════════════════════════════════════════════

import type { T10ListStatus } from '../../types';

interface StatusBadgeProps {
  status: T10ListStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Active badge: green pill with green dot
  if (status === 'active') {
    return (
      <span
        className={`t10-status-badge t10-status-badge--active ${className || ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          backgroundColor: '#ecfdf5', // emerald-50
          color: '#059669', // emerald-600
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        <span
          className="t10-status-badge__dot"
          style={{
            width: '6px',
            height: '6px',
            backgroundColor: '#10b981', // emerald-500
            borderRadius: '50%',
            flexShrink: 0,
          }}
        />
        Active
      </span>
    );
  }

  // Inactive badge: gray pill, no dot
  if (status === 'inactive') {
    return (
      <span
        className={`t10-status-badge t10-status-badge--inactive ${className || ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 12px',
          backgroundColor: '#f3f4f6', // gray-100
          color: '#6b7280', // gray-500
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        Inactive
      </span>
    );
  }

  // Archived badge: darker gray pill, no dot
  return (
    <span
      className={`t10-status-badge t10-status-badge--archived ${className || ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 12px',
        backgroundColor: '#e5e7eb', // gray-200
        color: '#4b5563', // gray-600
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      Archived
    </span>
  );
}

export default StatusBadge;
