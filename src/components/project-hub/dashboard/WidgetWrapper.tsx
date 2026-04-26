// @ts-nocheck
/**
 * WidgetWrapper — Dashboard widget chrome.
 *
 * Apr 25, 2026 — Edit-mode via context (RCA fix).
 *   Each widget component owns ONE WidgetWrapper. The grid no longer
 *   adds its own outer wrapper; instead it broadcasts edit-mode state
 *   via `WidgetIdContext` + `GridEditContext`. WidgetWrapper consumes
 *   them and surfaces the drag handle / resize buttons / collapse
 *   chevron when `isEditing` is true. No double chrome.
 *
 *   Card chrome:
 *     - bg:           token('elevation.surface')                   white
 *     - boxShadow:    token('elevation.shadow.raised')             matches Jira
 *     - borderRadius: token('border.radius', '8px')
 *     - no border (was 0.55px subpixel)
 *
 *   Header (52px min):
 *     - h2 / size="small" (16/653) — Atlassian Sans
 *     - subtitle stacked below (12/400 / color.text.subtle)
 *     - LEFT (edit mode): grip-vertical drag handle (24×24)
 *     - RIGHT: Narrower / Wider / Collapse chevron (edit mode) + headerBadges
 */
import { Component, type ReactNode, type ErrorInfo, useEffect, useRef, useState } from 'react';
import { token } from '@atlaskit/tokens';
import { GripVertical, ChevronDown, ChevronRight, Minus, Plus, Maximize2, Download } from 'lucide-react';
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
  flushBody?: boolean;
  /**
   * Click handler for the "Open in UWV" header icon. When provided, the
   * wrapper renders an Atlaskit IconButton (Maximize glyph) on the right
   * side of the header that opens the widget's contents in the Universal
   * Work View drawer for an executive / presentation-mode read.
   */
  onExpand?: () => void;
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
  flushBody = false,
  onExpand,
}: WidgetWrapperProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
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

  // pragmatic-drag-and-drop: card is BOTH draggable + drop target.
  // On drop: insert source BEFORE target (consistent rule, see RCA notes).
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
          // We're the TARGET widget. Source is the dragged widget. Call
          // the page-level reorder with both ids: insert source before
          // this target.
          reorderRaw?.(sourceId, targetId, 'before');
        },
      }),
    );
  }, [isEditing, widgetId, reorderRaw]);

  const canShrink =
    typeof currentSpan === 'number' && currentSpan > (minSpan ?? 1);
  const canGrow = typeof currentSpan === 'number' && currentSpan < 12;

  // In edit mode, swap collapse handler to the draft-mode one if available.
  const collapseHandler = isEditing && onCollapseDraft ? onCollapseDraft : onToggleCollapse;

  return (
    <div
      ref={cardRef}
      role="region"
      aria-label={title}
      data-widget-id={widgetId}
      className="overflow-hidden flex flex-col min-w-0 w-full max-w-full"
      style={{
        minWidth: 0,
        maxWidth: '100%',
        background: token('elevation.surface', '#FFFFFF'),
        boxShadow: token(
          'elevation.shadow.raised',
          '0 1px 1px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)',
        ),
        borderRadius: token('border.radius', '8px'),
        outline: isEditing ? `1px dashed ${token('color.border.brand', '#0C66E4')}` : 'none',
        outlineOffset: isEditing ? '-1px' : '0',
        cursor: isEditing ? 'grab' : 'default',
      }}
    >
      <div
        className="flex items-center justify-between gap-2 min-w-0"
        style={{
          padding: '12px 16px',
          background: token('elevation.surface', '#FFFFFF'),
          borderBottom: collapsed
            ? 'none'
            : `1px solid ${token('color.border', '#E2E8F0')}`,
          minHeight: 52,
        }}
      >
        {/* LEFT: drag handle (edit mode) + headerIcon + title block */}
        <div className="flex-1 min-w-0 flex items-center gap-2 text-left">
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
                color: token('color.text.subtle', '#505258'),
                cursor: 'grab',
                flexShrink: 0,
              }}
            >
              <GripVertical size={16} />
            </span>
          )}
          {headerIcon}
          <div className="min-w-0 flex flex-col">
            <Heading as="h2" size="small" truncate>
              {title}
            </Heading>
            {subtitle && (
              <span
                className="truncate"
                style={{
                  fontSize: 12,
                  fontWeight: 400,
                  color: token('color.text.subtle', '#505258'),
                  lineHeight: '16px',
                  marginTop: 2,
                }}
              >
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* RIGHT: resize controls (edit mode) + collapse chevron + headerBadges */}
        <div className="flex items-center gap-1 shrink-0">
          {isEditing && onResize && (
            <>
              <AkIconButton
                label="Narrower"
                icon={() => <Minus size={14} />}
                appearance="subtle"
                spacing="compact"
                isDisabled={!canShrink}
                onClick={() => onResize('narrower')}
              />
              <AkIconButton
                label="Wider"
                icon={() => <Plus size={14} />}
                appearance="subtle"
                spacing="compact"
                isDisabled={!canGrow}
                onClick={() => onResize('wider')}
              />
            </>
          )}
          {onExpand && (
            <Tooltip content="Open in executive view" position="top">
              {(tp) => (
                <span {...tp} style={{ display: 'inline-flex' }}>
                  <AkIconButton
                    label="Open in executive view"
                    icon={() => <Maximize2 size={14} />}
                    appearance="subtle"
                    spacing="compact"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExpand();
                    }}
                  />
                </span>
              )}
            </Tooltip>
          )}
          {/* Download as PDF — html2canvas + jsPDF, project-tagged filename.
              Lives next to the executive-view button so the two read/share
              actions sit together. Disabled while a capture is in flight to
              prevent double-render. */}
          <Tooltip content="Download as PDF" position="top">
            {(tp) => (
              <span {...tp} style={{ display: 'inline-flex' }}>
                <AkIconButton
                  label="Download as PDF"
                  icon={() => <Download size={14} />}
                  appearance="subtle"
                  spacing="compact"
                  isDisabled={isExporting || collapsed}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!bodyRef.current) return;
                    setIsExporting(true);
                    try {
                      await downloadWidgetAsPdf(bodyRef.current, {
                        title,
                        subtitle,
                      });
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
          <AkIconButton
            label={collapsed ? 'Expand widget' : 'Collapse widget'}
            icon={() =>
              collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />
            }
            appearance="subtle"
            spacing="compact"
            onClick={collapseHandler}
          />
          {headerBadges}
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div
          ref={bodyRef}
          className="flex-1 dashboard-widget-body min-w-0 w-full max-w-full overflow-hidden"
          style={{
            background: token('elevation.surface', '#FFFFFF'),
            padding: flushBody ? 0 : token('space.200', '16px'),
          }}
        >
          <WidgetErrorBoundary title={title}>{children}</WidgetErrorBoundary>
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

