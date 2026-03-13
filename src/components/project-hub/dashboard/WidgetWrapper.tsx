/**
 * WidgetWrapper — V12 Hybrid Precision widget chrome
 * Header: #F1F5F9 sunken, 0.75px border
 * Body: #FFFFFF, 14px padding (or 0 for flush tables)
 * Footer: 0.75px top border, link styling
 */
import { ChevronDown } from 'lucide-react';
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
  flushBody?: boolean;
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
  flushBody = false,
}: WidgetWrapperProps) {
  return (
    <div
      role="region"
      aria-label={title}
      className="overflow-hidden flex flex-col"
      style={{
        gridColumn: `span ${span}`,
        background: 'var(--cp-bg-page)',
        border: '0.75px solid var(--cp-border-default)',
        borderRadius: 'var(--cp-radius-default)',
      }}
    >
      {/* Header */}
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between gap-2 cursor-pointer border-0 text-left"
        style={{
          padding: '10px 14px',
          background: 'var(--cp-bg-sunken)',
          borderBottom: collapsed ? 'none' : '0.75px solid var(--cp-border-default)',
          minHeight: 38,
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {headerIcon}
          <span
            className="truncate"
            style={{
              fontSize: 13,
              fontWeight: 650,
              color: 'var(--cp-text-primary)',
              fontFamily: "var(--cp-font-heading)",
            }}
          >
            {title}
          </span>
          {subtitle && (
            <span
              className="hidden sm:inline truncate"
              style={{ fontSize: 12, color: 'var(--cp-text-tertiary)', fontFamily: 'var(--cp-font-body)' }}
            >
              · {subtitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {headerBadges}
          <ChevronDown
            size={14}
            style={{
              color: 'var(--cp-text-tertiary)',
              transition: 'transform 200ms ease',
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="flex-1" style={{ padding: flushBody ? 0 : 14, background: 'var(--cp-bg-page)' }}>
          {children}
        </div>
      )}

      {/* Footer */}
      {!collapsed && footer && (
        <div
          style={{
            borderTop: '0.75px solid var(--cp-border-subtle)',
            padding: '8px 14px',
            background: 'var(--cp-bg-page)',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
