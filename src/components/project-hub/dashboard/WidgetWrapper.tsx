// @ts-nocheck
/**
 * WidgetWrapper — Dashboard widget chrome.
 *
 * Rewritten Apr 19, 2026 to use Atlaskit Design System primitives.
 * Blueprint reference: docs/design/BAU-Dashboard-Atlaskit-Conversion.md §5 Commit 4.
 *
 * Chrome
 * ──────
 *   Shell:       <div> with Atlaskit `elevation.surface` + `color.border`
 *   Header:      <button> retained for collapse-toggle affordance; title
 *                rendered via the ADS <Heading> wrapper (size="xsmall" → 14/700)
 *   Body:        scoped padding; on error, renders <SectionMessage>
 *   Footer:      optional footer slot
 *
 * Light/dark
 * ──────────
 *   No more useTheme / isDark branching. All colours flow through
 *   @atlaskit/tokens — AdsThemeProvider flips light ↔ dark at runtime.
 *
 * NOTE: This wrapper is used by every registered widget (see widget-registry.ts).
 *       The parallel legacy `WidgetCard.tsx` (pre-registry shims) was removed
 *       in Commit 8 of the BAU Dashboard Atlaskit migration — see
 *       docs/design/BAU-Dashboard-Atlaskit-Conversion.md §5 Commit 8.
 */
import { Component, type ReactNode, type ErrorInfo } from 'react';
import { token } from '@atlaskit/tokens';
// ChevronDownIcon removed — gadget header no longer renders a collapse chevron.
import { Heading, SectionMessage } from '@/components/ads';

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
        <SectionMessage appearance="error" title="Widget error">
          {this.state.error || 'Something went wrong loading this widget.'}
        </SectionMessage>
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
        background: token('elevation.surface', '#FFFFFF'),
        border: `1px solid ${token('color.border', '#E2E8F0')}`,
        borderRadius: token('border.radius.200', '8px'),
      }}
    >
      {/* Header — split into two siblings so headerBadges (which may contain
          interactive elements like the settings IconButton) are NOT nested
          inside the collapse <button>. Nested interactives are invalid HTML
          and browsers route inner clicks to the outer button. */}
      <div
        className="flex items-center justify-between gap-2"
        style={{
          padding: '10px 14px',
          background: token('elevation.surface', '#FFFFFF'),
          borderBottom: collapsed ? 'none' : `1px solid ${token('color.border', '#E2E8F0')}`,
          minHeight: 38,
        }}
      >
        {/* Title — non-interactive. Header has no collapse affordance. */}
        <div className="flex-1 min-w-0 flex items-center gap-2 text-left">
          {headerIcon}
          <Heading as="h3" size="xsmall" truncate>
            {title}
          </Heading>
          {subtitle && (
            <span
              className="hidden sm:inline truncate"
              style={{
                fontSize: 12,
                color: token('color.text.subtle', '#6B778C'),
              }}
            >
              · {subtitle}
            </span>
          )}
        </div>
        {/* Badges only — no collapse chevron. Settings gear lives inside
            headerBadges and stops propagation on click. */}
        <div className="flex items-center gap-2 shrink-0">
          {headerBadges}
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div
          // dashboard-widget-body class is the hook for the table-layout fix
          // in index.css: Atlaskit DynamicTable renders with table-layout:
          // auto by default, which causes percentage head widths to be
          // ignored when a long title expands the Title cell. We flip it to
          // table-layout: fixed only inside widget bodies so columns respect
          // their widths and TruncateCell's ellipsis actually kicks in.
          // (Caught Apr 19, 2026 — Production Incidents + QA Defects rows
          // were inflating past the 36px canonical height.)
          className="flex-1 dashboard-widget-body"
          style={{
            background: token('elevation.surface', '#FFFFFF'),
            padding: flushBody ? 0 : token('space.200', '16px'),
          }}
        >
          <WidgetErrorBoundary title={title}>
            {children}
          </WidgetErrorBoundary>
        </div>
      )}

      {/* Footer */}
      {!collapsed && footer && (
        <div
          style={{
            background: token('elevation.surface', '#FFFFFF'),
            borderTop: `1px solid ${token('color.border', '#E2E8F0')}`,
            padding: `8px ${token('space.200', '16px')}`,
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
