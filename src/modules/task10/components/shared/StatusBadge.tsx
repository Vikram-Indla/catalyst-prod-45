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
  // Uses inline styles for maximum compatibility (CSS overrides were breaking this)
  if (status === 'active') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          backgroundColor: '#ecfdf5',
          color: '#059669',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
        className={className}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            backgroundColor: '#10b981',
            borderRadius: '50%',
          }}
        />
        Active
      </span>
    );
  }

  if (status === 'inactive') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 12px',
          backgroundColor: '#f3f4f6',
          color: '#6b7280',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
        className={className}
      >
        Inactive
      </span>
    );
  }

  // Archived
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 12px',
        backgroundColor: '#e5e7eb',
        color: '#374151',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}
      className={className}
    >
      Archived
    </span>
  );
}

export default StatusBadge;
