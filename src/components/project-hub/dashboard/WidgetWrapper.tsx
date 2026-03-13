/**
 * WidgetWrapper — Standard widget chrome with collapsible header/body/footer
 */
import { ChevronDown, MoreVertical } from 'lucide-react';
import type { ReactNode } from 'react';

interface WidgetWrapperProps {
  title: string;
  subtitle?: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  headerBadges?: ReactNode;
  headerIcon?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  span?: 1 | 2 | 3;
}

export default function WidgetWrapper({
  title,
  subtitle,
  collapsed,
  onToggleCollapse,
  headerBadges,
  headerIcon,
  footer,
  children,
  span = 1,
}: WidgetWrapperProps) {
  return (
    <div
      role="region"
      aria-label={title}
      className="overflow-hidden flex flex-col"
      style={{
        gridColumn: `span ${span}`,
        background: 'var(--cp-bg)',
        border: '1px solid var(--cp-bd)',
        borderRadius: 8,
      }}
    >
      {/* Header */}
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2 cursor-pointer border-0 text-left"
        style={{
          background: 'var(--cp-bg-sunken)',
          borderBottom: collapsed ? 'none' : '0.75px solid var(--cp-bd)',
          minHeight: 38,
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {headerIcon}
          <span
            className="truncate"
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--cp-t1)',
              fontFamily: "'Sora', sans-serif",
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </span>
          {subtitle && (
            <span
              className="hidden sm:inline truncate"
              style={{ fontSize: 11, color: 'var(--cp-t3)', fontWeight: 500 }}
            >
              · {subtitle}
            </span>
          )}
          {headerBadges}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ChevronDown
            size={14}
            style={{
              color: 'var(--cp-t3)',
              transition: 'transform 200ms ease',
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="flex-1" style={{ padding: 14, background: 'var(--cp-bg)' }}>
          {children}
        </div>
      )}

      {/* Footer */}
      {!collapsed && footer && (
        <div
          style={{
            borderTop: '0.75px solid var(--cp-bd)',
            padding: '6px 14px',
            background: 'var(--cp-bg)',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
