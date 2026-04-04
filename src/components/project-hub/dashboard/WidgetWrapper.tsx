/**
 * WidgetWrapper — V12 Hybrid Precision widget chrome
 * Dark mode: Nocturne #181A1E surface, flush with page
 */
import { ChevronDown } from 'lucide-react';
import { Component, type ReactNode, type ErrorInfo } from 'react';
import { useTheme } from '@/hooks/useTheme';

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
          <div style={{ fontSize: 28, marginBottom: 8 }} className="dark:text-gray-500 text-gray-400">⚠</div>
          <div style={{ fontSize: 13, fontWeight: 500 }} className="text-gray-500 dark:text-gray-400">
            Widget error
          </div>
          <div style={{ fontSize: 12, maxWidth: 260, marginTop: 4 }} className="text-gray-400 dark:text-gray-500">
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
  const { isDark: dark } = useTheme();

  return (
    <div
      role="region"
      aria-label={title}
      className={`overflow-hidden flex flex-col ${dark ? 'bg-[#181A1E]' : 'bg-[var(--cp-bg-page)]'}`}
      style={{
        gridColumn: `span ${span}`,
        border: dark ? '1px solid rgba(255,255,255,0.12)' : '0.75px solid var(--cp-border-default)',
        borderRadius: 'var(--cp-radius-default)',
        boxShadow: dark ? 'none' : undefined,
      }}
    >
      {/* Header */}
      <button
        onClick={onToggleCollapse}
        className={`w-full flex items-center justify-between gap-2 cursor-pointer border-0 text-left ${dark ? 'bg-white/[0.03]' : 'bg-[var(--cp-bg-sunken)]'}`}
        style={{
          padding: '10px 14px',
          borderBottom: collapsed ? 'none' : dark ? '1px solid rgba(255,255,255,0.08)' : '0.75px solid var(--cp-border-default)',
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
              color: dark ? 'rgba(235,238,245,0.92)' : 'var(--cp-text-primary)',
              fontFamily: 'var(--cp-font-heading)',
            }}
          >
            {title}
          </span>
          {subtitle && (
            <span
              className="hidden sm:inline truncate"
              style={{ fontSize: 12, color: dark ? 'rgba(235,238,245,0.50)' : 'var(--cp-text-tertiary)', fontFamily: 'var(--cp-font-body)' }}
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
              color: dark ? 'rgba(235,238,245,0.40)' : 'var(--cp-text-tertiary)',
              transition: 'transform 200ms ease',
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </button>

      {/* Body */}
      {!collapsed && (
        <div className={`flex-1 ${dark ? 'bg-[#181A1E]' : 'bg-[var(--cp-bg-page)]'}`} style={{ padding: flushBody ? 0 : 14 }}>
          <WidgetErrorBoundary title={title}>
            {children}
          </WidgetErrorBoundary>
        </div>
      )}

      {/* Footer */}
      {!collapsed && footer && (
        <div
          className={dark ? 'bg-[#181A1E]' : 'bg-[var(--cp-bg-page)]'}
          style={{
            borderTop: dark ? '1px solid rgba(255,255,255,0.08)' : '0.75px solid var(--cp-border-subtle)',
            padding: '8px 14px',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
