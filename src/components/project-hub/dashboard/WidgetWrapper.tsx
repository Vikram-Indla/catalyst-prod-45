// @ts-nocheck
/**
 * WidgetWrapper — Dashboard widget chrome.
 *
 * Apr 26, 2026 — Executive density rewrite.
 *   - **Standardised body height**: every widget renders at the same
 *     `--gadget-body-h` (default 620px). Content longer than that
 *     scrolls inside the widget — no more 5-of-many lists with the rest
 *     hidden. The dashboard reads as a uniform vertical rhythm.
 *   - **Bigger header (60px)** with h2 medium typography (was small) so
 *     titles read at executive scale on full-width gadgets.
 *   - **Header click toggles collapse**: the whole title strip is the
 *     hit target, not just the 28px chevron icon. Subtle hover tint via
 *     `color.background.neutral.subtle.hovered` token.
 *   - **Bigger collapse chevron** (14→18px) with rotate animation
 *     instead of two icon swaps.
 *   - **Animated collapse/expand**: cubic-bezier height transition,
 *     respects `prefers-reduced-motion`. Classical motion only — no
 *     bounce.
 *   - **Solo / focus mode**: when `onSolo` is provided (via the dashboard
 *     grid context) a "Focus this widget" button appears. Solo state is
 *     transient (not persisted) — the widget fills the dashboard while
 *     others are hidden. ESC exits.
 *   - All colours route through Atlaskit tokens — no bespoke hex.
 */
import { Component, type ReactNode, type ErrorInfo, useEffect, useRef, useState } from 'react';
import { token } from '@atlaskit/tokens';
import {
  GripVertical,
  ChevronDown,
  Minus,
  Plus,
  Download,
  Focus,
  RefreshCw,
  Link2,
  MoreHorizontal,
  Maximize2,
} from '@/lib/atlaskit-icons';
import { IconButton as AkIconButton } from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { attachClosestEdge, extractClosestEdge, type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { SectionMessage } from '@/components/ads';
import { useWidgetEditState } from './DashboardWidgetGrid';
import { downloadWidgetAsPdf } from '@/lib/widget-pdf';
import { downloadWidgetAsCsv } from '@/lib/widget-csv';

/** Jira-parity highlight colors for the gadget top border bar. */
// 2026-06-09 Spec parity — ADS B400 #0052CC for the blue accent (was
// #2684FF B200). Other category colors aligned to ADS canonical palette.
const HIGHLIGHT_COLORS: Record<string, string> = {
  blue: '#0052CC',
  red: '#DE350B',
  orange: '#FF8B00',
  green: '#006644',
  teal: '#00B8D9',
  purple: '#6554C0',
  grey: '#6B778C',
  white: 'transparent',
};

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
  onExpand?: () => void;
  bodyHeight?: number | 'auto';
  highlightColor?: string;
  onRefresh?: () => void;
  lastRefreshed?: Date | null;
  /**
   * When true, the widget is rendering an empty state. CSS uses
   * data-empty="true" to push empty widgets to the bottom of the grid
   * via `order: 100` so the user sees populated widgets first.
   * (2026-06-09 — Vikram dashboard parity directive.)
   */
  empty?: boolean;
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

/** Default standardised body max-height. Tuned for: 1440×900 viewport
 *  → 1 widget per row + page chrome leaves ≈ 720px usable, of which
 *  100px is gadget chrome (header 60 + padding 24 + footer ~16). */
/** No default fixed height — widgets grow to fit content (Jira parity). */

export default function WidgetWrapper({
  title,
  subtitle,
  collapsed,
  onToggleCollapse,
  headerBadges,
  headerIcon,
  footer,
  children,
  flushBody = false,
  onExpand,
  bodyHeight,
  highlightColor = 'blue',
  onRefresh,
  lastRefreshed,
  empty,
}: WidgetWrapperProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [headerHovered, setHeaderHovered] = useState(false);
  const editState = useWidgetEditState();
  const isEditing = editState.isEditing;
  const widgetId = editState.widgetId;
  const currentSpan = editState.currentSpan;
  const minSpan = editState.minSpan ?? 3;
  const onResize = editState.onResize;
  const reorderRaw = (editState as any).reorderRaw as
    | ((sourceId: string, targetId: string, edge: 'before' | 'after') => void)
    | undefined;
  const onCollapseDraft = editState.onCollapseDraft;
  // Solo / focus mode — transient, lives on the grid context.
  const soloWidgetId = (editState as any).soloWidgetId as string | null | undefined;
  const onSolo = (editState as any).onSolo as ((id: string | null) => void) | undefined;
  const isSoloed = !!soloWidgetId && soloWidgetId === widgetId;
  const otherIsSoloed = !!soloWidgetId && soloWidgetId !== widgetId;

  // pragmatic-drag-and-drop wiring with closest-edge drop indicator
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
  useEffect(() => {
    if (!isEditing || !widgetId || !cardRef.current) return;
    const el = cardRef.current;
    return combine(
      draggable({
        element: el,
        getInitialData: () => ({ widgetId, kind: 'dashboard-widget' }),
      }),
      dropTargetForElements({
        element: el,
        canDrop: ({ source }) =>
          source.data.kind === 'dashboard-widget' && source.data.widgetId !== widgetId,
        getData: ({ input, element }) =>
          attachClosestEdge(
            { widgetId, kind: 'dashboard-widget' },
            { input, element, allowedEdges: ['left', 'right'] },
          ),
        getIsSticky: () => true,
        onDragEnter: (args) => setClosestEdge(extractClosestEdge(args.self.data)),
        onDrag: (args) => setClosestEdge(extractClosestEdge(args.self.data)),
        onDragLeave: () => setClosestEdge(null),
        onDrop: ({ source, self }) => {
          const sourceId = source.data.widgetId as string | undefined;
          const targetId = self.data.widgetId as string | undefined;
          const edge = extractClosestEdge(self.data);
          setClosestEdge(null);
          if (!sourceId || !targetId || sourceId === targetId) return;
          const side: 'before' | 'after' = edge === 'right' ? 'after' : 'before';
          reorderRaw?.(sourceId, targetId, side);
        },
      }),
    );
  }, [isEditing, widgetId, reorderRaw]);

  // ESC exits solo
  useEffect(() => {
    if (!isSoloed || !onSolo) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSolo(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isSoloed, onSolo]);

  // If another widget is soloed, this one is hidden via display:none so
  // it doesn't take grid space. We keep it mounted to preserve query
  // cache + scroll positions.
  if (otherIsSoloed) return null;

  const canShrink = typeof currentSpan === 'number' && currentSpan > (minSpan ?? 1);
  const canGrow = typeof currentSpan === 'number' && currentSpan < 12;

  // Edit mode: collapse handler routes to the draft helper if available.
  const collapseHandler = isEditing && onCollapseDraft ? onCollapseDraft : onToggleCollapse;

  // Body height resolution — `bodyHeight === 'auto'` lets the widget
  // grow naturally (matrix widgets manage their own internal scroll).
  // When soloed, take the full viewport: 100vh minus page header (~64),
  // dashboard padding + scope-disclaimer banner (~120), edit toolbar (~16),
  // soloed widget header (~60), and a bit of bottom breathing room.
  const resolvedBodyHeight = isSoloed
    ? 'calc(100vh - 260px)'
    : typeof bodyHeight === 'number'
      ? `${bodyHeight}px`
      : undefined;

  return (
    <div
      ref={cardRef}
      role="region"
      aria-label={title}
      data-widget-id={widgetId}
      data-soloed={isSoloed ? 'true' : undefined}
      data-empty={empty ? 'true' : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        minWidth: 0,
        width: '100%',
        maxWidth: '100%',
        // Cap soloed width at 1440px so the gadget reads with a
        // measured horizontal rhythm on ultra-wide displays — auto
        // margins below center it. 100% on every other state.
        maxWidth: isSoloed ? 'min(1440px, 100%)' : '100%',
        marginInline: isSoloed ? 'auto' : undefined,
        background: token('elevation.surface', '#FFFFFF'),
        boxShadow: isSoloed
          ? token('elevation.shadow.overlay', '0 4px 8px -2px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)')
          : token('elevation.shadow.raised', '0 1px 1px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)'),
        // 2026-06-09 Spec parity (Filter Results gadget v1) — radius 8px,
        // top accent 3px #0052CC, 1px ds-border on remaining sides + shadow.
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderTop: `3px solid ${HIGHLIGHT_COLORS[highlightColor] ?? HIGHLIGHT_COLORS.blue}`,
        borderRadius: token('border.radius.200', '8px'),
        outline: isEditing ? `1px dashed ${token('color.border.brand', '#0C66E4')}` : 'none',
        outlineOffset: isEditing ? '-1px' : '0',
        cursor: isEditing ? 'grab' : 'default',
        transition: 'box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1), max-width 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div
        onMouseEnter={() => setHeaderHovered(true)}
        onMouseLeave={() => setHeaderHovered(false)}
        onClick={(e) => {
          // Whole-header click toggles collapse — but only when the
          // click landed on the bare header surface (not on any of the
          // action buttons). We test for an interactive ancestor via
          // closest('button,[role="button"]').
          const target = e.target as HTMLElement;
          if (target.closest('button,[role="button"]')) return;
          if (isEditing) return; // Edit mode owns the chrome — no click-collapse
          collapseHandler();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          minWidth: 0,
          padding: '16px 20px 12px 20px',
          background: headerHovered && !isEditing
            ? token('color.background.neutral.subtle.hovered', '#F1F2F4')
            : token('elevation.surface', '#FFFFFF'),
          borderBottom: collapsed
            ? 'none'
            : `1px solid ${token('color.border', '#DFE1E6')}`,
          minHeight: 40,
          cursor: isEditing ? 'inherit' : 'pointer',
          transition: 'background 120ms ease',
        }}
      >
        {/* LEFT — drag handle (edit mode) + headerIcon + title block */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
          {isEditing && (
            <span
              aria-label="Drag widget"
              title="Drag to reorder"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                color: token('color.text.subtle', '#44546F'),
                cursor: 'grab',
                flexShrink: 0,
              }}
            >
              <GripVertical size={16} />
            </span>
          )}
          {headerIcon}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {/* 2026-06-09 Spec parity — semantic h2 + 16/600/#172B4D
                /-0.006em letter-spacing per Filter Results gadget spec. */}
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: token('color.text', '#172B4D'), lineHeight: '20px', letterSpacing: '-0.006em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title}
            </h2>
            {subtitle && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 400,
                  color: token('color.text.subtle', '#44546F'),
                  lineHeight: '16px',
                  marginTop: 4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* RIGHT — actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {isEditing && onResize && (
            <>
              <AkIconButton
                label="Narrower"
                icon={() => <Minus size={16} />}
                appearance="subtle"
                spacing="compact"
                isDisabled={!canShrink}
                onClick={() => onResize('narrower')}
              />
              <AkIconButton
                label="Wider"
                icon={() => <Plus size={16} />}
                appearance="subtle"
                spacing="compact"
                isDisabled={!canGrow}
                onClick={() => onResize('wider')}
              />
            </>
          )}
          <Tooltip content={collapsed ? 'Maximize' : 'Minimize'} position="top">
            {(tp) => (
              <span {...tp} style={{ display: 'inline-flex' }}>
                <AkIconButton
                  label={collapsed ? 'Maximize' : 'Minimize'}
                  icon={() => (
                    <ChevronDown
                      size={16}
                      style={{
                        transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      }}
                    />
                  )}
                  appearance="subtle"
                  spacing="compact"
                  onClick={(e) => {
                    e.stopPropagation();
                    collapseHandler();
                  }}
                />
              </span>
            )}
          </Tooltip>
          {onSolo && widgetId && (
            <Tooltip content={isSoloed ? 'Exit fullscreen (Esc)' : 'Maximize'} position="top">
              {(tp) => (
                <span {...tp} style={{ display: 'inline-flex' }}>
                  <AkIconButton
                    label={isSoloed ? 'Exit fullscreen' : 'Maximize'}
                    icon={() => <Maximize2 size={14} />}
                    appearance={isSoloed ? 'primary' : 'subtle'}
                    spacing="compact"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSolo(isSoloed ? null : widgetId);
                    }}
                  />
                </span>
              )}
            </Tooltip>
          )}
          {onRefresh && (
            <Tooltip content="Refresh" position="top">
              {(tp) => (
                <span {...tp} style={{ display: 'inline-flex' }}>
                  <AkIconButton
                    label="Refresh"
                    icon={() => <RefreshCw size={14} />}
                    appearance="subtle"
                    spacing="compact"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefresh();
                    }}
                  />
                </span>
              )}
            </Tooltip>
          )}
          <Tooltip content="Copy link" position="top">
            {(tp) => (
              <span {...tp} style={{ display: 'inline-flex' }}>
                <AkIconButton
                  label="Copy link"
                  icon={() => <Link2 size={14} />}
                  appearance="subtle"
                  spacing="compact"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(window.location.href);
                  }}
                />
              </span>
            )}
          </Tooltip>
          {isEditing && (
            <DropdownMenu
              trigger={({ triggerRef, ...triggerProps }) => (
                <AkIconButton
                  ref={triggerRef}
                  {...triggerProps}
                  label={`More actions for ${title} gadget`}
                  icon={() => <MoreHorizontal size={16} />}
                  appearance="subtle"
                  spacing="compact"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                />
              )}
            >
              <DropdownItemGroup>
                <DropdownItem onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                }}>Copy link</DropdownItem>
              </DropdownItemGroup>
              <DropdownItemGroup>
                <DropdownItem onClick={async () => {
                  if (!bodyRef.current) return;
                  setIsExporting(true);
                  try {
                    await downloadWidgetAsPdf(bodyRef.current, { title, subtitle });
                  } catch (err) {
                    console.error('[WidgetWrapper] PDF export failed', err);
                  } finally {
                    setIsExporting(false);
                  }
                }}>Download as PDF</DropdownItem>
                <DropdownItem onClick={() => {
                  if (!bodyRef.current) return;
                  const ok = downloadWidgetAsCsv(bodyRef.current, { title, subtitle });
                  if (!ok) {
                    console.warn('[WidgetWrapper] CSV export skipped — no <table> in widget body');
                  }
                }}>Download as CSV</DropdownItem>
              </DropdownItemGroup>
            </DropdownMenu>
          )}
          {headerBadges}
        </div>
      </div>

      {/* ─── Body ───────────────────────────────────────────────────── */}
      {!collapsed && (
        <div
          ref={bodyRef}
          className="dashboard-widget-body"
          style={{
            minWidth: 0,
            width: '100%',
            maxWidth: '100%',
            background: token('elevation.surface', '#FFFFFF'),
            // Bump padding when soloed so the focused gadget breathes —
            // 32px instead of the default 24px. Flush-body widgets keep
            // 0 (their inner tables own the edge alignment).
            padding: flushBody
              ? 0
              : isSoloed
                ? token('space.300', '24px')
                : token('space.200', '16px'),
            // Standardised height — overflow-y inside the body so the
            // dashboard never exposes a 'half a widget' viewport.
            maxHeight: resolvedBodyHeight,
            overflowY: typeof bodyHeight === 'number' ? 'auto' : 'visible',
            // Smooth fade-in when soloed
            animation: isSoloed
              ? 'dashboardFadeIn 220ms cubic-bezier(0.4, 0, 0.2, 1)'
              : undefined,
            transition: 'padding 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <WidgetErrorBoundary title={title}>{children}</WidgetErrorBoundary>
        </div>
      )}

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      {!collapsed && footer && (
        <div
          style={{
            background: token('elevation.surface', '#FFFFFF'),
            borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
            padding: `8px ${token('space.200', '16px')}`,
          }}
        >
          {footer}
        </div>
      )}
      {!collapsed && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: `4px ${token('space.200', '16px')} 8px`,
            fontSize: 12,
            fontWeight: 400,
            color: token('color.text.subtlest', '#6B778C'),
          }}
        >
          <span
            key={lastRefreshed ? lastRefreshed.getTime() : 'init'}
            className="dashboard-refresh-pulse"
            style={{ display: 'inline-flex' }}
          >
            <RefreshCw size={12} />
          </span>
          <span>Last refreshed {lastRefreshed ? formatTimeAgo(lastRefreshed) : 'just now'}</span>
        </div>
      )}
      {isEditing && closestEdge && <DropIndicator edge={closestEdge} gap="8px" />}
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  return `${hours} hours ago`;
}
