/**
 * KrListItem — Key Result row for lists and drawers
 */

import type { OkrStatus } from '@/types/strategy';
import { STATUS_COLORS } from '@/types/strategy';

interface KrListItemProps {
  status: OkrStatus;
  title: string;
  meta: string;
  progress?: number;
  onClick?: () => void;
  className?: string;
}

export function KrListItem({ status, title, meta, progress, onClick, className = '' }: KrListItemProps) {
  const dotColor = STATUS_COLORS[status] ?? STATUS_COLORS.not_started;

  return (
    <div
      className={`flex items-center gap-3 ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
      style={{
        padding: '10px 0',
        borderBottom: '1px solid var(--catalyst-border-default, var(--bd-default, rgba(255,255,255,0.10)))',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 150ms',
      }}
      onMouseEnter={onClick ? (e) => { e.currentTarget.style.background = 'var(--catalyst-bg-hover, #1A1A1A)'; } : undefined}
      onMouseLeave={onClick ? (e) => { e.currentTarget.style.background = 'transparent'; } : undefined}
    >
      {/* Status dot */}
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: dotColor,
          flexShrink: 0,
        }}
      />

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--catalyst-text-primary, rgba(237,237,237,0.93))',
            lineHeight: 1.4,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--catalyst-text-tertiary, rgba(237,237,237,0.40))',
            lineHeight: 1.4,
          }}
        >
          {meta}
        </div>
      </div>

      {/* Progress */}
      {progress !== undefined && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: dotColor,
            flexShrink: 0,
          }}
        >
          {Math.round(progress)}%
        </span>
      )}
    </div>
  );
}
