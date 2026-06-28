/**
 * Column primitives: ColumnHeader (status dot + name + count/WIP) and
 * ColumnBody (scrollable droppable card list). Split so swimlane mode can
 * render headers once at the top and bodies per lane (Jira-accurate).
 */
import React, { forwardRef, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { token } from '@atlaskit/tokens';
import { SIZES } from '../constants';
import type { BoardIssue, KanbanColumn, WipState } from '../types';

function wipState(count: number, max: number | null): WipState {
  if (max == null) return 'normal';
  if (count > max) return 'exceeded';
  if (count === max) return 'warning';
  return 'normal';
}

export const ColumnHeader: React.FC<{ column: KanbanColumn; count: number }> = ({ column, count }) => {
  const wip = wipState(count, column.max);
  const countColor = wip === 'exceeded'
    ? token('color.text.danger', 'var(--ds-text-danger, #AE2A19)')
    : wip === 'warning'
      ? token('color.text.warning', 'var(--ds-text-warning, #974F0C)')
      : token('color.text.subtlest', 'var(--ds-icon-subtle, #626F86)');
  // Jira board column header: NO status dot — name (uppercase, subtle) + count.
  // Width is owned by the parent column wrapper in Board.
  return (
    <div style={{
      width: '100%', flexShrink: 0,
      display: 'flex', alignItems: 'center', gap: 8,
      height: SIZES.COLUMN_HEADER_HEIGHT, padding: '12px 12px 8px 12px',
    }}>
      <span style={{
        fontSize: 'var(--ds-font-size-200)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3,
        color: token('color.text.subtlest', 'var(--ds-icon-subtle, #626F86)'),
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, lineHeight: '16px',
      }}>
        {column.name}
      </span>
      <span style={{
        fontSize: 'var(--ds-font-size-200)', fontWeight: 500, lineHeight: '16px', flexShrink: 0, color: countColor,
        background: wip === 'normal' ? token('color.background.neutral', '#091E420F') : 'transparent',
        borderRadius: 10, padding: '0 6px', minWidth: 18, textAlign: 'center',
      }}>
        {count}{column.max != null ? `/${column.max}` : ''}
      </span>
    </div>
  );
};

interface ColumnBodyProps {
  ariaLabel: string;
  isDragOver?: boolean;
  items: BoardIssue[];
  renderItem: (issue: BoardIssue, index: number) => React.ReactNode;
  footer?: React.ReactNode;
  /** lane bodies size to content; flat single-lane fills height */
  fill?: boolean;
}

/** Below this count, render the plain flex list (virtualization overhead not worth it). */
const VIRTUALIZE_THRESHOLD = 20;
/** Initial per-card height estimate (card body + gap); measureElement corrects it live. */
const ESTIMATED_CARD_HEIGHT = 104;

/**
 * ColumnBody — the scrollable, droppable card list.
 *
 * The outer scroll <div> is BOTH the pragmatic-dnd drop target (forwarded ref)
 * AND the virtualizer scroll element. Virtualization kicks in only for flat-mode
 * columns (`fill`) with many cards — grouped lanes are content-sized (no internal
 * scroll) and small, so they render the plain list. Only visible cards mount, so
 * drag/click/menu behaviour on them is identical; drop is column-level (the body),
 * so off-screen cards never need to be mounted to receive a drop.
 */
export const ColumnBody = forwardRef<HTMLDivElement, ColumnBodyProps>(
  ({ ariaLabel, isDragOver, items, renderItem, footer, fill }, forwardedRef) => {
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const setRef = (el: HTMLDivElement | null) => {
      scrollRef.current = el;
      if (typeof forwardedRef === 'function') forwardedRef(el);
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    };

    // 2026-06-15: virtualization DISABLED. TanStack v3's variable-height
    // measurement positions cards using `estimateSize × index` on first paint,
    // then re-measures on mount. Real card heights vary 80–140px depending on
    // content (labels, points, assignee). The estimate (~104px) is wrong for
    // every card, producing visibly inconsistent gaps. Scrolling triggers
    // `measureElement` to re-run and positions reflow — Vikram's "scroll fixes
    // it" symptom. The only durable fix is to render every card via flex `gap`.
    // 200-card columns render in single-digit ms on modern browsers.
    const virtualize = false;
    const virtualizer = useVirtualizer({
      count: items.length,
      getScrollElement: () => scrollRef.current,
      estimateSize: () => ESTIMATED_CARD_HEIGHT,
      measureElement: typeof window !== 'undefined' ? (el) => el.getBoundingClientRect().height : undefined,
      overscan: 6,
      enabled: virtualize,
    });

    // Re-measure when the scroll element resizes. Critical on first paint: the
    // body starts unbounded (parent height not yet applied) so the virtualizer's
    // first viewport read is the full content; once it bounds to the real height
    // this recomputes the visible range. Also handles window resize.
    useEffect(() => {
      const el = scrollRef.current;
      if (!el || !virtualize) return;
      const ro = new ResizeObserver(() => virtualizer.measure());
      ro.observe(el);
      return () => ro.disconnect();
    }, [virtualize, virtualizer]);

    return (
      <div style={{
        width: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column',
        maxHeight: '100%',
        /* 2026-06-16: flex:1 + minHeight:0 in flat mode so this wrapper
           expands to fill the column container. Without it the wrapper
           is content-sized, kb-column-body's flex:1 has nothing to expand
           into, and the column's empty space below the cards is part of
           the column container — NOT the drop target. Drops into that
           empty space miss → dropTargets:0 → snap back. */
        ...(fill ? { flex: 1, minHeight: 0 } : { minHeight: 40 }),
      }}>
        <div
          ref={setRef}
          role="list"
          aria-label={ariaLabel}
          className="kb-column-body"
          style={{
            flex: fill ? 1 : undefined, overflowY: 'auto', overflowX: 'hidden',
            padding: `${SIZES.CARD_GAP}px 8px`,
            background: isDragOver ? token('color.background.selected', 'var(--ds-background-selected, #E9F2FF)') : 'transparent',
            borderRadius: 6, transition: 'background-color 150ms ease',
            minHeight: fill ? 0 : 24,
            ...(virtualize ? {} : { display: 'flex', flexDirection: 'column', gap: SIZES.CARD_GAP }),
          }}
        >
          {virtualize ? (
            <div style={{ position: 'relative', width: '100%', height: virtualizer.getTotalSize() }}>
              {virtualizer.getVirtualItems().map((vi) => (
                <div
                  key={vi.key}
                  data-index={vi.index}
                  ref={virtualizer.measureElement}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vi.start}px)`, paddingBottom: SIZES.CARD_GAP }}
                >
                  {renderItem(items[vi.index], vi.index)}
                </div>
              ))}
            </div>
          ) : (
            items.map((it, i) => renderItem(it, i))
          )}
        </div>
        {footer}
      </div>
    );
  },
);
ColumnBody.displayName = 'ColumnBody';
