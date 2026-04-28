/**
 * PragmaticBoard — Jira-parity Kanban built on Pragmatic drag-and-drop.
 *
 * Replaces the @dnd-kit DndContext + DroppableColumn + SortableCard pipeline
 * for the non-swimlane board path. Swimlane mode (groupBy !== 'none') stays
 * on @dnd-kit until its scoped migration lands.
 *
 * Responsibilities:
 *   • draggable() on each card (Pragmatic)
 *   • dropTargetForElements() on each column body (Pragmatic)
 *   • dropTargetForElements() on each card (to compute insert edge)
 *   • monitorForElements() at board scope → reconciles source+target → emits
 *     onReorder (same column) or onMoveAcrossColumns (column change)
 *   • autoScrollForElements() on the horizontally scrolling board viewport
 *
 * Contract with the host page (KanbanBoardPage):
 *   <PragmaticBoard
 *     columns={KANBAN_COLUMNS}
 *     colMap={colMap}                 // { [colId]: string[] of card ids }
 *     issuesById={issuesById}
 *     avatarsByName={avatarsByName}
 *     d={density}                     // DensityConfig
 *     tk={theme}                      // KanbanThemeTokens
 *     selectedId, focusedId, onCardClick
 *     onReorder(cardId, colId, atIndex)        // optimistic local reorder
 *     onMoveAcrossColumns(cardId, fromCol, toCol, atIndex)
 *     ...card action callbacks passed through to WorkItemCard
 *   />
 *
 * Host still owns the supabase round-trip inside persistStatusChange — this
 * component only surfaces the intent; it never mutates DB state itself.
 */

import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { draggable, dropTargetForElements, monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { attachClosestEdge, extractClosestEdge, type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { Inbox } from 'lucide-react';
import { WorkItemCard } from './WorkItemCard';
import type { BoardIssue } from './kanban-types';
import type { KanbanThemeTokens, DensityConfig, KanbanColumnDef } from './kanban-tokens';
import type { AssigneeOption } from './AssigneePickerPopover';
import type { VisibleFields } from '@/hooks/useKanbanViewSettings';

/* ═════════════════════════════════════════════════════════════════════════
   Shared card-action prop bundle — mirrors existing SortableCard surface so
   KanbanBoardPage can forward the same callbacks with zero shape changes.
   ═════════════════════════════════════════════════════════════════════════ */
interface CardActions {
  onToggleFlag?: (id: string) => void;
  onCopyLink?: (issueKey: string) => void;
  onCopyKey?: (issueKey: string) => void;
  onChangeStatus?: (issueId: string, newStatus: string) => void;
  onSaveSummary?: (id: string, newSummary: string) => void;
  onChangeAssignee?: (issueId: string, newAssignee: string | null) => void;
  assigneeOptions?: AssigneeOption[];
  projectKey?: string;
  onLabelsUpdated?: (issueId: string, newLabels: string[]) => void;
  onParentChange?: (issueId: string, newParentKey: string | null) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onMoved?: (issueId: string, newProjectKey: string) => void;
  onLinked?: () => void;
  visibleFields?: VisibleFields;
  /**
   * Optional hub-specific icon resolver — forwarded to WorkItemCard. Hubs
   * whose type taxonomy diverges from Jira (ProductHub initiatives,
   * Ideas, etc.) supply this via the canonical BoardAdapter.
   */
  resolveIcon?: (issue: BoardIssue) => ReactNode | null;
}

/* ═════════════════════════════════════════════════════════════════════════
   PragmaticCard — single draggable + drop target (for insert-edge detection)
   ═════════════════════════════════════════════════════════════════════════ */
interface PragmaticCardProps extends CardActions {
  issue: BoardIssue;
  colId: string;
  avatarUrl?: string | null;
  onClick: () => void;
  d: DensityConfig;
  tk: KanbanThemeTokens;
  isSelected?: boolean;
  isFocused?: boolean;
  avatarsByName: Map<string, string>;
}

const PragmaticCard = memo(function PragmaticCard({
  issue, colId, avatarUrl, onClick, d, tk, isSelected, isFocused, avatarsByName, ...actions
}: PragmaticCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return draggable({
      element: el,
      getInitialData: () => ({ type: 'kanban-card', cardId: issue.id, colId }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });
  }, [issue.id, colId]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return dropTargetForElements({
      element: el,
      canDrop: ({ source }) => source.data.type === 'kanban-card' && source.data.cardId !== issue.id,
      getData: ({ input, element }) =>
        attachClosestEdge(
          { type: 'kanban-card', cardId: issue.id, colId },
          { input, element, allowedEdges: ['top', 'bottom'] },
        ),
      getIsSticky: () => true,
      onDragEnter: (args) => setClosestEdge(extractClosestEdge(args.self.data)),
      onDrag: (args) => setClosestEdge(extractClosestEdge(args.self.data)),
      onDragLeave: () => setClosestEdge(null),
      onDrop: () => setClosestEdge(null),
    });
  }, [issue.id, colId]);

  const restShadow = tk.cardShadowRest;
  const hoverShadow = tk.cardHoverShadow;
  const focusShadow = `0 0 0 2px ${tk.selectedAccent}`;

  const cardStyle: React.CSSProperties = {
    background: tk.cardBg,
    borderRadius: 4,                                        /* Jira parity: 4px */
    border: 'none',                                         /* shadow-only */
    borderLeft: isSelected ? `3px solid ${tk.selectedAccent}` : 'none',
    padding: d.cardPad,
    display: 'flex',
    flexDirection: 'column',
    cursor: 'grab',
    transition: 'background 150ms ease, box-shadow 150ms ease, border-left 120ms ease',
    opacity: isDragging ? 0.35 : 1,
    boxShadow: isDragging ? tk.cardDragShadow : isFocused ? focusShadow : restShadow,
    position: 'relative',
    outline: 'none',
    overflow: 'visible',
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={ref}
        style={cardStyle}
        onClick={() => { if (!isDragging) onClick(); }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onMouseEnter={(e) => {
          if (!isDragging) {
            e.currentTarget.style.background = tk.cardHoverBg;
            e.currentTarget.style.boxShadow = hoverShadow;
            e.currentTarget.querySelectorAll('.kanban-card-menu-btn, .kanban-card-edit-btn').forEach((el) => {
              (el as HTMLElement).style.opacity = '1';
            });
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = tk.cardBg;
          e.currentTarget.style.boxShadow = isDragging ? tk.cardDragShadow : isFocused ? focusShadow : restShadow;
          e.currentTarget.querySelectorAll('.kanban-card-menu-btn, .kanban-card-edit-btn').forEach((el) => {
            (el as HTMLElement).style.opacity = '0';
          });
        }}
        tabIndex={-1}
        role="listitem"
        aria-label={`${issue.issueKey}: ${issue.summary}`}
        aria-selected={isSelected}
        aria-grabbed={isDragging}
        data-issue-id={issue.id}
      >
        <WorkItemCard
          issue={issue}
          avatarUrl={avatarUrl}
          d={d}
          tk={tk}
          isSelected={isSelected}
          {...actions}
          onOpenDetail={onClick}
          avatarsByName={avatarsByName}
        />
      </div>
      {closestEdge && <DropIndicator edge={closestEdge} gap="4px" />}
    </div>
  );
});

/* ═════════════════════════════════════════════════════════════════════════
   PragmaticColumn — droppable column with sticky header and insertion
   indicator when dragging over an empty area below the last card.
   ═════════════════════════════════════════════════════════════════════════ */
interface PragmaticColumnProps extends CardActions {
  column: KanbanColumnDef;
  issueIds: string[];
  issuesById: Map<string, BoardIssue>;
  avatarsByName: Map<string, string>;
  onCardClick: (id: string) => void;
  d: DensityConfig;
  tk: KanbanThemeTokens;
  selectedId?: string | null;
  focusedId?: string | null;
}

const PragmaticColumn = memo(function PragmaticColumn({
  column, issueIds, issuesById, avatarsByName, onCardClick, d, tk,
  selectedId, focusedId, ...actions
}: PragmaticColumnProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    return dropTargetForElements({
      element: el,
      canDrop: ({ source }) => source.data.type === 'kanban-card',
      getData: () => ({ type: 'kanban-column', colId: column.id }),
      onDragEnter: () => setIsOver(true),
      onDragLeave: () => setIsOver(false),
      onDrop: () => setIsOver(false),
    });
  }, [column.id]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    return autoScrollForElements({
      element: el,
      canScroll: ({ source }) => source.data.type === 'kanban-card',
    });
  }, [column.id]);

  const categoryDot = column.category === 'done' ? '#006644'
    : column.category === 'in_progress' ? '#0747A6'
    : '#5E6C84';

  return (
    <div
      className="flex flex-col"
      style={{
        /* Jira parity baseline: 267px min so narrow viewports still scroll
           horizontally like Jira. On wider viewports columns flex-grow to
           fill the board — prevents the ~950px right-side dead gutter
           that appears on 2K+ monitors when 6 fixed-width columns only
           occupy ~1650px. Cap at 360 so columns don't balloon past a
           scannable card width. */
        flex: '1 1 267px',
        minWidth: 267,
        maxWidth: 360,
        background: tk.surfaceAlt,
        borderRadius: 6,
      }}
      role="list"
      aria-label={`${column.name} column, ${issueIds.length} items`}
    >
      {/* Header — 48h, 6px top-radius, plain-text count */}
      <div className="flex items-center gap-2 sticky top-0 z-10" style={{
        height: 48,
        padding: '0 12px',
        background: tk.headerBg,
        borderRadius: '6px 6px 0 0',
        flexShrink: 0,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', background: categoryDot, flexShrink: 0,
        }} />
        <span style={{
          fontSize: 12, fontWeight: 500, textTransform: 'uppercase',
          color: tk.textMuted, fontFamily: 'var(--cp-font-body)',
          lineHeight: '16px', flex: 1,
        }}>{column.name}</span>
        {/* MAX badge — Jira board 597 surfaces column WIP via `MAX: <n>`. */}
        {column.wipLimit != null && (
          <span
            data-testid={`kanban-column-wip-${column.id}`}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: issueIds.length > column.wipLimit ? '#AE2A19' : tk.textMuted,
              fontFamily: 'var(--cp-font-body)',
              lineHeight: '16px',
              padding: '0 6px',
              borderRadius: 3,
              background: issueIds.length > column.wipLimit ? '#FFEBE6' : 'transparent',
              border: `1px solid ${issueIds.length > column.wipLimit ? '#AE2A19' : tk.borderSubtle}`,
              letterSpacing: 0.2,
            }}
            aria-label={`Work-in-progress limit ${column.wipLimit}`}
          >
            MAX: {column.wipLimit}
          </span>
        )}
        <span style={{
          fontSize: 12, fontWeight: 500, color: tk.textPrimary,
          fontFamily: 'var(--cp-font-body)', lineHeight: '16px',
        }}>{issueIds.length}</span>
      </div>

      {/* Body (drop target) */}
      <div
        ref={bodyRef}
        className="flex flex-col overflow-y-auto"
        style={{
          padding: '0 10px 10px 10px',
          gap: d.cardGap,
          flex: 1,
          minHeight: 120,
          background: isOver ? tk.dropHighlight : 'transparent',
          transition: 'background 150ms ease',
          borderRadius: '0 0 6px 6px',
        }}
      >
        {issueIds.length === 0 && (
          <div className="flex flex-col items-center justify-center" style={{
            minHeight: 100, color: tk.textDisabled, fontSize: 12, gap: 6,
            fontFamily: 'var(--cp-font-body)',
          }}>
            {isOver ? (
              <span style={{ color: tk.selectedAccent, fontWeight: 600, fontSize: 13 }}>Drop here</span>
            ) : (
              <>
                <Inbox size={20} style={{ opacity: 0.4 }} />
                <span>No work items</span>
              </>
            )}
          </div>
        )}
        {issueIds.map((id) => {
          const issue = issuesById.get(id);
          if (!issue) return null;
          return (
            <PragmaticCard
              key={id}
              issue={issue}
              colId={column.id}
              avatarUrl={issue.assigneeName ? avatarsByName.get(issue.assigneeName.toLowerCase()) : null}
              onClick={() => onCardClick(id)}
              d={d}
              tk={tk}
              isSelected={selectedId === id}
              isFocused={focusedId === id}
              avatarsByName={avatarsByName}
              {...actions}
            />
          );
        })}
      </div>
    </div>
  );
});

/* ═════════════════════════════════════════════════════════════════════════
   resolveDropTarget — pure reconciliation used by the board monitor AND by
   focused unit tests. Keep exported so tests don't re-implement the math.
   Returns null when the drop should be a no-op.
   ═════════════════════════════════════════════════════════════════════════ */
export function resolveDropTarget(args: {
  sourceCardId: string;
  sourceColId: string;
  targetType: 'kanban-card' | 'kanban-column';
  targetColId: string;
  targetCardId?: string;                   /* required when targetType='kanban-card' */
  edge?: Edge | null;                      /* required when targetType='kanban-card' */
  colMap: Record<string, string[]>;
}): { destColId: string; insertIndex: number } | null {
  const { sourceCardId, sourceColId, targetType, targetColId, targetCardId, edge, colMap } = args;

  let insertIndex: number;
  if (targetType === 'kanban-card') {
    const ids = colMap[targetColId] ?? [];
    if (!targetCardId) return null;
    const targetIdx = ids.indexOf(targetCardId);
    if (targetIdx < 0) return null;
    insertIndex = edge === 'bottom' ? targetIdx + 1 : targetIdx;
  } else {
    /* Drop onto column body → append at end. */
    insertIndex = (colMap[targetColId] ?? []).length;
  }

  /* Within same column, removal of the source opens a gap — adjust so the
     card lands visually where the user aimed. */
  if (targetColId === sourceColId) {
    const currentIdx = (colMap[sourceColId] ?? []).indexOf(sourceCardId);
    if (currentIdx >= 0 && insertIndex > currentIdx) insertIndex -= 1;
    if (currentIdx === insertIndex) return null;          /* no-op */
  }

  return { destColId: targetColId, insertIndex };
}

/* ═════════════════════════════════════════════════════════════════════════
   PragmaticBoard — wraps N columns with a single monitorForElements that
   reconciles drops into (colId, insertIndex) calls on the host.
   ═════════════════════════════════════════════════════════════════════════ */
export interface PragmaticBoardProps extends CardActions {
  columns: KanbanColumnDef[];
  colMap: Record<string, string[]>;
  issuesById: Map<string, BoardIssue>;
  avatarsByName: Map<string, string>;
  onCardClick: (id: string) => void;
  d: DensityConfig;
  tk: KanbanThemeTokens;
  selectedId?: string | null;
  focusedId?: string | null;
  /**
   * Called whenever a drop resolves to a concrete (destColId, insertIndex).
   * Host is responsible for:
   *   - updating local colMap optimistically
   *   - persisting status change to Supabase (when destColId !== sourceColId)
   *   - rolling back on failure + firing toast
   */
  onDrop: (args: {
    cardId: string;
    sourceColId: string;
    destColId: string;
    insertIndex: number;
  }) => void;
}

export function PragmaticBoard({
  columns, colMap, issuesById, avatarsByName, onCardClick,
  d, tk, selectedId, focusedId, onDrop, ...actions
}: PragmaticBoardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  /* Horizontal auto-scroll on the board viewport. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    return autoScrollForElements({
      element: el,
      canScroll: ({ source }) => source.data.type === 'kanban-card',
    });
  }, []);

  /* Single monitor reconciles every drop into an intent. */
  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => source.data.type === 'kanban-card',
      onDrop: ({ source, location }) => {
        const sourceCardId = source.data.cardId as string;
        const sourceColId = source.data.colId as string;
        const dropTargets = location.current.dropTargets;
        if (dropTargets.length === 0) return;

        /* Precedence: first (most specific) drop target wins. Card targets
           come before column targets because they're nested deeper. */
        const firstTarget = dropTargets[0];
        const targetType = firstTarget.data.type as 'kanban-card' | 'kanban-column';
        const targetColId = firstTarget.data.colId as string;

        const resolved = resolveDropTarget({
          sourceCardId,
          sourceColId,
          targetType,
          targetColId,
          targetCardId: targetType === 'kanban-card' ? (firstTarget.data.cardId as string) : undefined,
          edge: targetType === 'kanban-card' ? extractClosestEdge(firstTarget.data) : null,
          colMap,
        });
        if (!resolved) return;

        onDrop({
          cardId: sourceCardId,
          sourceColId,
          destColId: resolved.destColId,
          insertIndex: resolved.insertIndex,
        });
      },
    });
  }, [colMap, onDrop]);

  return (
    <div
      ref={scrollRef}
      className="flex"
      style={{
        gap: 8,
        /* Fill the viewport width so flex:1 on columns can distribute
           extra space. minWidth still guarantees horizontal scroll on
           viewports narrower than the natural column count * 267. */
        width: '100%',
        minWidth: columns.length * 267 + (columns.length - 1) * 8,
      }}
    >
      {columns.map((col) => (
        <PragmaticColumn
          key={col.id}
          column={col}
          issueIds={colMap[col.id] ?? []}
          issuesById={issuesById}
          avatarsByName={avatarsByName}
          onCardClick={onCardClick}
          d={d}
          tk={tk}
          selectedId={selectedId}
          focusedId={focusedId}
          {...actions}
        />
      ))}
    </div>
  );
}
