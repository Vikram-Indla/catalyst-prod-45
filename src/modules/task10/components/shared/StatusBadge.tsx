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
  // NOTE: This intentionally uses Tailwind utility classes (not text bullets)
  // to guarantee a pill background + dot.
  if (status === 'active') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-full bg-emerald-50 text-emerald-700 ${className || ''}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  }

  if (status === 'inactive') {
    return (
      <span
        className={`inline-flex items-center px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-full bg-gray-100 text-gray-600 ${className || ''}`}
      >
        Inactive
      </span>
    );
  }

  // Archived
  return (
    <span
      className={`inline-flex items-center px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-full bg-gray-200 text-gray-700 ${className || ''}`}
    >
      Archived
    </span>
  );
}

export default StatusBadge;
