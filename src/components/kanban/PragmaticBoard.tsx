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
import { createPortal } from 'react-dom';
import { draggable, dropTargetForElements, monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { attachClosestEdge, extractClosestEdge, type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { MoreHorizontal, Inbox, Plus } from 'lucide-react';
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
   * Per-column inline create — Jira-parity affordance. Renders a
   * "+ Create issue" button at the bottom of every column (subtle,
   * uses textMuted color, full column width). Click hands the column id
   * to the host so it can open a typed create flow with the destination
   * status pre-filled. Optional — column omits the button when not set.
   */
  onCreateInColumn?: (colId: string) => void;
  /** Label for the per-column create button. Default: "+ Create issue". */
  createInColumnLabel?: string;
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
  // Right-click context menu state — Jira-parity (board 597 ships
  // software-context-menu.ui.context-menu on every card). Catalyst previously
  // suppressed contextmenu via preventDefault; this restores it.
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [ctxMenu]);

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
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setCtxMenu({ x: e.clientX, y: e.clientY });
        }}
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
      {ctxMenu && (
        <div
          data-testid={`kanban-card-context-menu-${issue.id}`}
          role="menu"
          aria-label={`Actions for ${issue.issueKey}`}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            position: 'fixed',
            left: ctxMenu.x,
            top: ctxMenu.y,
            zIndex: 9999,
            minWidth: 180,
            background: 'var(--ds-surface, #FFFFFF)',
            borderRadius: 4,
            boxShadow: 'rgba(9,30,66,0.31) 0 0 1px, rgba(9,30,66,0.25) 0 4px 8px -2px',
            padding: '4px 0',
            fontFamily: 'var(--cp-font-body)',
          }}
        >
          {[
            { key: 'open',    label: 'Open',         act: () => onClick() },
            { key: 'copyKey', label: 'Copy issue key', act: () => actions.onCopyKey?.(issue.issueKey) },
            { key: 'copyLink',label: 'Copy link',    act: () => actions.onCopyLink?.(issue.issueKey) },
            { key: 'flag',    label: issue.isFlagged ? 'Unflag' : 'Flag', act: () => actions.onToggleFlag?.(issue.id) },
            { key: 'archive', label: 'Archive',      act: () => actions.onArchive?.(issue.id) },
            { key: 'delete',  label: 'Delete',       act: () => actions.onDelete?.(issue.id), danger: true },
          ].map((item) => (
            <button
              key={item.key}
              role="menuitem"
              data-testid={`kanban-card-context-menu-${item.key}`}
              onClick={() => { item.act(); setCtxMenu(null); }}
              style={{
                display: 'block', width: '100%',
                padding: '6px 16px', background: 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                fontSize: 14, lineHeight: '20px',
                color: item.danger ? '#AE2A19' : tk.textPrimary,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-surface-sunken, #F4F5F7)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
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
  const meatballRef = useRef<HTMLButtonElement>(null);
  const [isOver, setIsOver] = useState(false);
  // Meatball menu — manual createPortal popover positioned by trigger rect.
  // Replaces @atlaskit/dropdown-menu which fails to anchor properly inside
  // the column header (CLAUDE.md L1 + cycle-3 evidence: trigger flips
  // aria-expanded but the menu mounts at viewport (0,0) regardless of
  // shouldRenderToParent / placement / parent positioning mode).
  const [meatballAnchor, setMeatballAnchor] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!meatballAnchor) return;
    const close = (e?: Event) => {
      // Don't close if click is inside the meatball menu itself
      if (e && e.target && (e.target as HTMLElement).closest?.('[data-testid^="kanban-column-meatball-menu-"]')) return;
      setMeatballAnchor(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMeatballAnchor(null); };
    setTimeout(() => window.addEventListener('click', close), 0);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [meatballAnchor]);

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
      {/* Header — 48h, 6px top-radius, plain-text count.
          Note: previously `sticky top-0` — removed because Atlaskit Floating UI
          inside @atlaskit/dropdown-menu computes the wrong reference frame
          when its trigger lives in a position:sticky parent (cycle-3 evidence:
          menu mounts at viewport (0,0) instead of below trigger). The sticky
          behaviour can be reintroduced once Floating UI's reference resolution
          is fixed (open Atlaskit issue) or a `@atlaskit/popup` swap is in. */}
      <div className="flex items-center gap-2" style={{
        position: 'relative',
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
        {/* Per-column meatball — manual popover via createPortal. */}
        <button
          ref={meatballRef}
          type="button"
          aria-label={`${column.name} column actions`}
          aria-expanded={!!meatballAnchor}
          data-testid={`kanban-column-meatball-${column.id}`}
          onClick={(e) => {
            e.stopPropagation();
            const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
            setMeatballAnchor((prev) => prev ? null : { x: r.right, y: r.bottom + 4 });
          }}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, padding: 0,
            border: 'none', background: 'transparent', borderRadius: 3,
            cursor: 'pointer', color: tk.textMuted, flexShrink: 0,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = tk.surfaceHover; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <MoreHorizontal size={14} />
        </button>
        {meatballAnchor && createPortal(
          <div
            data-testid={`kanban-column-meatball-menu-${column.id}`}
            role="menu"
            aria-label={`${column.name} column actions menu`}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: Math.max(8, meatballAnchor.x - 200),
              top: meatballAnchor.y,
              zIndex: 9999,
              minWidth: 200,
              background: 'var(--ds-surface, #FFFFFF)',
              borderRadius: 4,
              boxShadow: 'rgba(9,30,66,0.31) 0 0 1px, rgba(9,30,66,0.25) 0 4px 8px -2px',
              padding: '6px 0',
              fontFamily: 'var(--cp-font-body)',
            }}
          >
            <div style={{
              padding: '4px 16px 6px', fontSize: 11, fontWeight: 600, color: tk.textMuted,
              textTransform: 'uppercase', letterSpacing: 0.4,
            }}>{column.name}</div>
            <div style={{ padding: '4px 16px', fontSize: 13, color: tk.textPrimary }}>
              {`Cards in column: ${issueIds.length}`}
            </div>
            <div style={{ padding: '4px 16px', fontSize: 13, color: tk.textPrimary }}>
              {column.wipLimit != null
                ? `WIP limit: ${column.wipLimit}${issueIds.length > column.wipLimit ? ' (exceeded)' : ''}`
                : 'No WIP limit'}
            </div>
            <div style={{ padding: '4px 16px 6px', fontSize: 13, color: tk.textPrimary }}>
              {`Statuses mapped: ${column.statuses.length}`}
            </div>
          </div>,
          document.body,
        )}
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
        {/*
          Per-column create — Jira-parity "+ Create issue" affordance,
          rendered at the bottom of every column. Subtle by default;
          becomes more prominent on hover. Hidden if no `onCreateInColumn`
          handler is wired by the host. Click forwards the column id to
          the host so it can open a typed create flow with the
          destination status pre-filled.
        */}
        {actions.onCreateInColumn && (
          <button
            type="button"
            data-testid={`kanban-column-create-${column.id}`}
            onClick={() => actions.onCreateInColumn?.(column.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: 6,
              padding: '6px 8px',
              border: 'none',
              background: 'transparent',
              color: tk.textMuted,
              fontSize: 12,
              fontWeight: 500,
              fontFamily: 'var(--cp-font-body)',
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'background 120ms ease, color 120ms ease',
              marginTop: issueIds.length === 0 ? 0 : 4,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = tk.surfaceHover ?? 'rgba(0,0,0,0.04)';
              (e.currentTarget as HTMLButtonElement).style.color = tk.textPrimary;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = tk.textMuted;
            }}
          >
            <Plus size={14} />
            <span>{actions.createInColumnLabel ?? 'Create issue'}</span>
          </button>
        )}
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
   * Optional swimlane resolver. When set, the board renders one
   * "lane band" per distinct value returned by `swimlaneOf(issue)`,
   * each band repeating the column row with only that lane's cards.
   * `swimlaneLabel` may humanise the lane key for the header.
   *
   * Drag-and-drop continues to operate at the column level — drops
   * change `status`, not the lane attribute. To move a card across
   * lanes the user must explicitly edit the lane field on the card
   * (assignee, quarter, etc.). Mirrors Jira board 597's swimlane
   * behaviour, which also pins lane membership to the underlying
   * field rather than to the lane the card was dropped on.
   */
  swimlaneOf?: (issue: BoardIssue) => string | null;
  swimlaneLabel?: (key: string) => string;
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
  d, tk, selectedId, focusedId, onDrop, swimlaneOf, swimlaneLabel,
  ...actions
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

  /* ── Swimlane decomposition.
     When `swimlaneOf` is provided we slice the cross-column `colMap`
     into one sub-colMap per lane key, then render N lane bands stacked
     vertically. Each lane re-uses PragmaticColumn — the same drop
     targets are registered N times (once per lane), and the global
     monitor reconciles by colId. Cards never cross lanes via DnD;
     lane membership is read-only. */
  const lanes = (() => {
    if (!swimlaneOf) return null;
    const buckets = new Map<string, { label: string; subColMap: Record<string, string[]> }>();
    const ensure = (key: string, label: string) => {
      let b = buckets.get(key);
      if (!b) {
        const seed: Record<string, string[]> = {};
        for (const c of columns) seed[c.id] = [];
        b = { label, subColMap: seed };
        buckets.set(key, b);
      }
      return b;
    };
    for (const col of columns) {
      for (const id of colMap[col.id] ?? []) {
        const issue = issuesById.get(id);
        if (!issue) continue;
        const rawKey = swimlaneOf(issue);
        const key = rawKey ?? '__unassigned__';
        const label = (swimlaneLabel?.(key)) ?? (rawKey ?? 'Unassigned');
        ensure(key, label).subColMap[col.id].push(id);
      }
    }
    return Array.from(buckets.entries())
      .sort((a, b) => a[1].label.localeCompare(b[1].label))
      .map(([key, v]) => ({ key, label: v.label, subColMap: v.subColMap }));
  })();

  if (lanes && lanes.length > 0) {
    return (
      <div
        ref={scrollRef}
        style={{
          width: '100%',
          minWidth: columns.length * 267 + (columns.length - 1) * 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {lanes.map((lane) => {
          const total = Object.values(lane.subColMap).reduce((s, a) => s + a.length, 0);
          return (
            <div key={lane.key}>
              {/* Swimlane header — sticky at the top of the scroll
                  container so the lane label stays visible while the
                  user scans down a long lane. */}
              <div
                role="rowheader"
                aria-label={`Swimlane: ${lane.label}, ${total} card${total === 1 ? '' : 's'}`}
                style={{
                  position: 'sticky', top: 0, zIndex: 4,
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 8px',
                  background: tk.surfaceAlt,
                  borderBottom: `1px solid ${tk.border}`,
                  borderRadius: 4,
                  fontSize: 12, fontWeight: 600,
                  color: tk.textPrimary,
                  fontFamily: 'var(--cp-font-body)',
                  letterSpacing: '0.02em',
                }}
              >
                <span>{lane.label}</span>
                <span style={{ fontWeight: 500, color: tk.textMuted }}>·</span>
                <span style={{ fontWeight: 500, color: tk.textMuted }}>{total}</span>
              </div>
              <div
                className="flex"
                style={{
                  gap: 8,
                  width: '100%',
                  minWidth: columns.length * 267 + (columns.length - 1) * 8,
                  marginTop: 6,
                }}
              >
                {columns.map((col) => (
                  <PragmaticColumn
                    key={`${lane.key}-${col.id}`}
                    column={col}
                    issueIds={lane.subColMap[col.id] ?? []}
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
            </div>
          );
        })}
      </div>
    );
  }

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
