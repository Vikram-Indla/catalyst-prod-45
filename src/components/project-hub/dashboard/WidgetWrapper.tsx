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
} from 'lucide-react';
import { IconButton as AkIconButton } from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { Heading, SectionMessage } from '@/components/ads';
import { useWidgetEditState } from './DashboardWidgetGrid';
import { downloadWidgetAsPdf } from '@/lib/widget-pdf';

interface WidgetWrapperProps {
  title: string;
  subtitle?: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  headerBadges?: ReactNode;
  headerIcon?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** Backwards-compat — span is owned by the outer grid cell now. Ignored. */
  span?: 1 | 2 | 3;
  /**
   * If true, drop the body padding (table + tab bars own their own
   * paddings). Standard widgets keep `space.200` (16px) padding.
   */
  flushBody?: boolean;
  /**
   * @deprecated Apr 26, 2026 — the in-header Maximize2 button was removed.
   * It used to open UWV, which was wrong: UWV is a flat-list viewer that
   * strips each gadget's bespoke layout (KPI strip, progress bars, filter
   * pills). The primary "go fullscreen" action is now the Focus/Solo
   * button (renders the gadget itself at full viewport, design preserved).
   *
   * UWV access remains intact via each widget's footer "View all in X ↗"
   * link — that's the canonical path when the user wants the cross-context
   * flat-list view.
   *
   * Prop kept for backwards-compat with widget files that still pass it;
   * it's a no-op now. Safe to drop from widget callsites in the next sweep.
   */
  onExpand?: () => void;
  /**
   * Override the standard 620px body height. Used by the matrix
   * widgets (Time in Status) which manage their own scrolling.
   */
  bodyHeight?: number | 'auto';
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
const DEFAULT_BODY_HEIGHT = 620;

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

  // pragmatic-drag-and-drop wiring (unchanged)
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
        getData: () => ({ widgetId, kind: 'dashboard-widget' }),
        onDrop: ({ source, self }) => {
          const sourceId = source.data.widgetId as string | undefined;
          const targetId = self.data.widgetId as string | undefined;
          if (!sourceId || !targetId || sourceId === targetId) return;
          reorderRaw?.(sourceId, targetId, 'before');
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
    : bodyHeight === 'auto'
      ? 'auto'
      : `${bodyHeight ?? DEFAULT_BODY_HEIGHT}px`;

  return (
    <div
      ref={cardRef}
      role="region"
      aria-label={title}
      data-widget-id={widgetId}
      data-soloed={isSoloed ? 'true' : undefined}
      className="overflow-hidden flex flex-col min-w-0 w-full max-w-full"
      style={{
        minWidth: 0,
        // Cap soloed width at 1440px so the gadget reads with a
        // measured horizontal rhythm on ultra-wide displays — auto
        // margins below center it. 100% on every other state.
        maxWidth: isSoloed ? 'min(1440px, 100%)' : '100%',
        marginInline: isSoloed ? 'auto' : undefined,
        background: token('elevation.surface', '#FFFFFF'),
        boxShadow: isSoloed
          ? token('elevation.shadow.overlay', '0 4px 8px -2px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)')
          : token('elevation.shadow.raised', '0 1px 1px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)'),
        // Slightly larger radius when soloed gives the focused card a
        // more deliberate, "card-as-page" feel.
        borderRadius: isSoloed
          ? token('border.radius.200', '8px')
          : token('border.radius', '8px'),
        outline: isEditing ? `1px dashed ${token('color.border.brand', '#0C66E4')}` : 'none',
        outlineOffset: isEditing ? '-1px' : '0',
        cursor: isEditing ? 'grab' : 'default',
        transition: 'box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1), max-width 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between gap-2 min-w-0"
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
          padding: '14px 18px',
          background: headerHovered && !isEditing
            ? token('color.background.neutral.subtle.hovered', '#F1F2F4')
            : token('elevation.surface', '#FFFFFF'),
          borderBottom: collapsed
            ? 'none'
            : `1px solid ${token('color.border', '#DFE1E6')}`,
          minHeight: 60,
          cursor: isEditing ? 'inherit' : 'pointer',
          transition: 'background 120ms ease',
        }}
      >
        {/* LEFT — drag handle (edit mode) + headerIcon + title block */}
        <div className="flex-1 min-w-0 flex items-center gap-3 text-left">
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
          <div className="min-w-0 flex flex-col">
            <Heading as="h2" size="medium" truncate>
              {title}
            </Heading>
            {subtitle && (
              <span
                className="truncate"
                style={{
                  fontSize: 13,
                  fontWeight: 400,
                  color: token('color.text.subtle', '#44546F'),
                  lineHeight: '18px',
                  marginTop: 2,
                }}
              >
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* RIGHT — actions */}
        <div className="flex items-center gap-1 shrink-0">
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
          {onSolo && widgetId && (
            <Tooltip
              content={isSoloed ? 'Exit fullscreen (Esc)' : 'View this widget fullscreen'}
              position="top"
            >
              {(tp) => (
                <span {...tp} style={{ display: 'inline-flex' }}>
                  <AkIconButton
                    label={isSoloed ? 'Exit fullscreen' : 'View fullscreen'}
                    icon={() => <Focus size={16} />}
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
          {/* In-header Maximize2 button removed Apr 26, 2026 — it routed
              to UWV (flat-list viewer) which stripped each gadget's
              bespoke design. Focus/Solo above is now the primary
              fullscreen action; UWV remains accessible via each widget's
              footer "View all ↗" link. */}
          <Tooltip content="Download as PDF" position="top">
            {(tp) => (
              <span {...tp} style={{ display: 'inline-flex' }}>
                <AkIconButton
                  label="Download as PDF"
                  icon={() => <Download size={16} />}
                  appearance="subtle"
                  spacing="compact"
                  isDisabled={isExporting || collapsed}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!bodyRef.current) return;
                    setIsExporting(true);
                    try {
                      await downloadWidgetAsPdf(bodyRef.current, { title, subtitle });
                    } catch (err) {
                      console.error('[WidgetWrapper] PDF export failed', err);
                    } finally {
                      setIsExporting(false);
                    }
                  }}
                />
              </span>
            )}
          </Tooltip>
          <Tooltip content={collapsed ? 'Expand widget' : 'Collapse widget'} position="top">
            {(tp) => (
              <span {...tp} style={{ display: 'inline-flex' }}>
                <AkIconButton
                  label={collapsed ? 'Expand widget' : 'Collapse widget'}
                  icon={() => (
                    <ChevronDown
                      size={18}
                      style={{
                        transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                        transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
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
          {headerBadges}
        </div>
      </div>

      {/* ─── Body ───────────────────────────────────────────────────── */}
      {!collapsed && (
        <div
          ref={bodyRef}
          className="dashboard-widget-body min-w-0 w-full max-w-full"
          style={{
            background: token('elevation.surface', '#FFFFFF'),
            // Bump padding when soloed so the focused gadget breathes —
            // 32px instead of the default 24px. Flush-body widgets keep
            // 0 (their inner tables own the edge alignment).
            padding: flushBody
              ? 0
              : isSoloed
                ? token('space.400', '32px')
                : token('space.300', '24px'),
            // Standardised height — overflow-y inside the body so the
            // dashboard never exposes a 'half a widget' viewport.
            maxHeight: resolvedBodyHeight,
            overflowY: bodyHeight === 'auto' ? 'visible' : 'auto',
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
            padding: `10px ${token('space.300', '24px')}`,
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
