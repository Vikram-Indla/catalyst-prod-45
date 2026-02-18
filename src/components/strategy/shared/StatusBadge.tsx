/**
 * StatusBadge — OKR status pill with optional dot
 */

import type { OkrStatus } from '@/types/strategy';
import { STATUS_COLORS, STATUS_LABELS } from '@/types/strategy';

interface StatusBadgeProps {
  status: OkrStatus;
  size?: 'sm' | 'md';
  showDot?: boolean;
  showLabel?: boolean;
  className?: string;
}

export function StatusBadge({ status, size = 'sm', showDot = true, showLabel = true, className = '' }: StatusBadgeProps) {
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.not_started;
  const label = STATUS_LABELS[status] ?? status;
  const fontSize = size === 'sm' ? 10 : 12;

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      style={{
        fontSize,
        fontWeight: 500,
        color,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        borderRadius: 9999,
        padding: size === 'sm' ? '1px 8px' : '2px 10px',
        whiteSpace: 'nowrap',
        lineHeight: 1.6,
      }}
    >
      {showDot && (
        <span
          style={{
            width: size === 'sm' ? 6 : 7,
            height: size === 'sm' ? 6 : 7,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
          }}
        />
      )}
      {showLabel && label}
    </span>
  );
}
