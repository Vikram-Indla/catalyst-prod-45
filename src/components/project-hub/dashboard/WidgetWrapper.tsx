/**
 * WidgetWrapper — V12 Hybrid Precision widget chrome
 * Header: var(--cp-bg-sunken) #F1F5F9, 0.75px border
 * Body: var(--cp-bg-page) #FFFFFF, 14px padding (or 0 for flush)
 * Footer: 0.75px top border, link styling
 * Includes per-widget error boundary.
 */
import { ChevronDown } from 'lucide-react';
import { Component, type ReactNode, type ErrorInfo } from 'react';

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

// Error boundary for individual widgets
class WidgetErrorBoundary extends Component<
  { title: string; children: ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { title: string; children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, error: err.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Widget "${this.props.title}" error:`, error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center py-6 text-center" style={{ padding: 14 }}>
          <div style={{ fontSize: 28, color: 'var(--cp-text-muted)', marginBottom: 8 }}>⚠</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cp-text-secondary)' }}>
            Widget error
          </div>
          <div style={{ fontSize: 12, color: 'var(--cp-text-tertiary)', maxWidth: 260, marginTop: 4 }}>
            {this.state.error || 'Something went wrong loading this widget.'}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
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
              fontFamily: 'var(--cp-font-heading)',
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
          <WidgetErrorBoundary title={title}>
            {children}
          </WidgetErrorBoundary>
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
