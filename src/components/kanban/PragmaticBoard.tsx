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

import { memo, forwardRef, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
// @atlaskit/motion is not Vite pre-bundled in this project; stagger implemented via CSS animation-delay below.
import { draggable, dropTargetForElements, monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { attachClosestEdge, extractClosestEdge, type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import MoreIcon from '@atlaskit/icon/glyph/more';
import AddIcon from '@atlaskit/icon/core/add';
import { WorkItemCard } from './WorkItemCard';
import { InlineCreateCard } from './InlineCreateCard';
import type { BoardIssue } from './kanban-types';
import { CARD_COLOR_BY_PRIORITY, CARD_COLOR_BY_TYPE } from './kanban-types';
import type { KanbanThemeTokens, DensityConfig, KanbanColumnDef, KanbanDensity } from './kanban-tokens';
import { DENSITY_CONFIG, SPACING_TOKENS } from './kanban-tokens';
import type { AssigneeOption } from './AssigneePickerPopover';
import type { VisibleFields, CardColorMode } from '@/hooks/useKanbanViewSettings';

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
  /** Card left-border colour rule (Jira: Board config → Card colors) */
  cardColorMode?: CardColorMode;
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
   * Callback fired when InlineCreateCard successfully creates a new issue.
   * Host is responsible for adding the card to colMap and refreshing the board.
   */
  onCreateCard?: (issue: { issueId: string; summary: string; status: string }) => void;
  /**
   * Optional hub-specific icon resolver — forwarded to WorkItemCard. Hubs
   * whose type taxonomy diverges from Jira (ProductHub initiatives,
   * Ideas, etc.) supply this via the canonical BoardAdapter.
   */
  resolveIcon?: (issue: BoardIssue) => ReactNode | null;
  /**
   * Map of parent issueKey → subtask-family BoardIssue[]. When provided,
   * each card renders a SubtaskStrip showing hover-card chips for its children.
   */
  subtasksByParentKey?: Map<string, BoardIssue[]>;
  /**
   * The full ordered list of columns the board is currently rendering.
   * Threaded down so the per-card three-dots menu can list every status
   * (forward AND backward) in the same order the user sees on screen,
   * excluding only the card's current column.
   */
  boardColumns?: KanbanColumnDef[];
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
  cardColorMode?: CardColorMode;
}

/**
 * PragmaticCard — single draggable card in the kanban board.
 * Memoized to prevent re-renders on parent state changes.
 * Virtualization compatible: preserves drag indices mapping to rawIssues array.
 */
const PragmaticCard = memo(function PragmaticCard({
  issue, colId, avatarUrl, onClick, d, tk, isSelected, isFocused, avatarsByName, cardColorMode, ...actions
}: PragmaticCardProps) {
  // Resolve subtasks for this card before spreading actions into WorkItemCard.
  // subtasksByParentKey must not be forwarded raw (WorkItemCard expects BoardIssue[]).
  const { subtasksByParentKey, ...workItemActions } = actions as typeof actions & { subtasksByParentKey?: Map<string, BoardIssue[]> };
  const cardSubtasks = subtasksByParentKey?.get(issue.issueKey) ?? [];
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
  // Right-click context menu state — Jira-parity (board 597 ships
  // software-context-menu.ui.context-menu on every card). Catalyst previously
  // suppressed contextmenu via preventDefault; this restores it.
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  // F5: context menu fade-in — start invisible, go visible on next frame
  const [ctxMenuVisible, setCtxMenuVisible] = useState(false);
  useEffect(() => {
    if (!ctxMenu) { setCtxMenuVisible(false); return; }
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    // Trigger fade-in on next animation frame so CSS transition fires
    const raf = requestAnimationFrame(() => setCtxMenuVisible(true));
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      cancelAnimationFrame(raf);
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

  const focusShadow = `0 0 0 2px ${tk.selectedAccent}`;

  const cardStyle: React.CSSProperties = {
    background: tk.cardBg,
    borderRadius: 4,                                        /* Jira parity: 4px */
    border: 'none',
    /* 2026-06-15: lifted each card with a soft rest shadow instead of an
       inside-the-card hairline borderBottom. The shadow gives every card a
       consistent visual envelope so the 8px gap reads as rhythm rather than
       "stripes of varying height". */
    borderBottom: 'none',
    borderLeft: isSelected
      ? `3px solid ${tk.selectedAccent}`
      : (() => {
          if (cardColorMode === 'priority') {
            const c = CARD_COLOR_BY_PRIORITY[(issue.priority ?? '').toLowerCase()];
            return c ? `3px solid ${c}` : 'none';
          }
          if (cardColorMode === 'issueType') {
            const c = CARD_COLOR_BY_TYPE[(issue.issueType ?? '').toLowerCase()];
            return c ? `3px solid ${c}` : 'none';
          }
          return 'none';
        })(),
    padding: d.cardPad,
    display: 'flex',
    flexDirection: 'column',
    cursor: 'grab',
    transition: 'background 120ms ease, box-shadow 120ms ease, border-left 120ms ease',
    opacity: isDragging ? 0.35 : 1,
    boxShadow: isDragging
      ? tk.cardDragShadow
      : isFocused
        ? focusShadow
        : tk.cardShadowRest,
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
            e.currentTarget.querySelectorAll('.kanban-card-menu-btn, .kanban-card-edit-btn').forEach((el) => {
              (el as HTMLElement).style.opacity = '1';
            });
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = tk.cardBg;
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
          {...workItemActions}
          onOpenDetail={onClick}
          avatarsByName={avatarsByName}
          subtasks={cardSubtasks}
        />
      </div>
      {closestEdge && <DropIndicator edge={closestEdge} gap={d.cardGap} />}
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
            background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
            borderRadius: 4,
            boxShadow: 'var(--ds-shadow-overlay, rgba(9,30,66,0.31) 0 0 1px, rgba(9,30,66,0.25) 0 4px 8px -2px)',
            padding: '4px 0',
            fontFamily: 'var(--cp-font-body)',
            /* F5: fade-in transition — opacity 0→1, scale 0.97→1 */
            opacity: ctxMenuVisible ? 1 : 0,
            transform: ctxMenuVisible ? 'scale(1)' : 'scale(0.97)',
            transformOrigin: 'top left',
            transition: 'opacity 100ms cubic-bezier(0.4,1,0.6,1), transform 100ms cubic-bezier(0.4,1,0.6,1)',
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
                padding: '8px 16px', background: 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                fontSize: 14, lineHeight: '20px',
                color: item.danger ? 'var(--ds-text-danger, #AE2A19)' : tk.textPrimary,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))'; }}
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
  cardColorMode?: CardColorMode;
  /** When true and issueIds is empty, render pulse skeleton cards instead of "No items" */
  isLoading?: boolean;
  /** When true (first column), the "+ Create" button stays visible while empty. */
  isFirst?: boolean;
}

const PragmaticColumn = memo(function PragmaticColumn({
  column, issueIds, issuesById, avatarsByName, onCardClick, d, tk,
  selectedId, focusedId, cardColorMode, isLoading, isFirst, ...actions
}: PragmaticColumnProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const meatballRef = useRef<HTMLButtonElement>(null);
  const [isOver, setIsOver] = useState(false);
  const [isColHovered, setIsColHovered] = useState(false);
  // Meatball menu — manual createPortal popover positioned by trigger rect.
  // Replaces @atlaskit/dropdown-menu which fails to anchor properly inside
  // the column header (CLAUDE.md L1 + cycle-3 evidence: trigger flips
  // aria-expanded but the menu mounts at viewport (0,0) regardless of
  // shouldRenderToParent / placement / parent positioning mode).
  const [meatballAnchor, setMeatballAnchor] = useState<{ x: number; y: number } | null>(null);
  // Inline create card — toggle for per-column form visibility
  const [inlineCreateColId, setInlineCreateColId] = useState<string | null>(null);
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

  const isDoneCategory = column.category === 'done';

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
        /* Column height now follows content (Jira parity). flex-col with no
           explicit height means the column shrinks to fit cards + create btn. */
        alignSelf: 'flex-start',
      }}
      role="list"
      aria-label={`${column.name} column, ${issueIds.length} items`}
      onMouseEnter={() => setIsColHovered(true)}
      onMouseLeave={() => setIsColHovered(false)}
    >
      {/* Header — Jira parity: plain uppercase title, no gray background.
          Title sits top-left; count chip (or green ✓ for done) sits next to it. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: SPACING_TOKENS.gap8,
        position: 'relative',
        padding: '12px 12px 8px 12px',
        background: 'transparent',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: tk.textMuted, fontFamily: 'var(--cp-font-body)',
          lineHeight: '16px',
          letterSpacing: '0.04em',
        }}>{column.name}</span>
        {/* Done category → green ✓; other categories → gray count chip when > 0 */}
        {isDoneCategory ? (
          <svg
            aria-hidden="true"
            width="14" height="14" viewBox="0 0 16 16" fill="none"
            style={{ flexShrink: 0 }}
          >
            <path d="M3 8l3.5 3.5L13 5" stroke="var(--ds-text-success, #1F845A)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : issueIds.length > 0 ? (
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: tk.textMuted,
            background: 'var(--ds-background-neutral, #F1F2F4)',
            padding: '1px 6px',
            borderRadius: 3,
            lineHeight: '16px',
            fontFamily: 'var(--cp-font-body)',
            minWidth: 18,
            textAlign: 'center',
          }}>{issueIds.length}</span>
        ) : null}
        {/* MAX badge — Jira board 597 surfaces column WIP via `MAX: <n>`. */}
        {column.wipLimit != null && (
          <span
            data-testid={`kanban-column-wip-${column.id}`}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: issueIds.length > column.wipLimit ? 'var(--ds-text-danger, #AE2A19)' : tk.textMuted,
              fontFamily: 'var(--cp-font-body)',
              lineHeight: '16px',
              padding: '0 8px',
              borderRadius: 3,
              background: issueIds.length > column.wipLimit ? 'var(--ds-background-danger, #FFEBE6)' : 'transparent',
              border: `1px solid ${issueIds.length > column.wipLimit ? 'var(--ds-border-danger, #AE2A19)' : tk.borderSubtle}`,
              letterSpacing: 0.2,
            }}
            aria-label={`Work-in-progress limit ${column.wipLimit}`}
          >
            MAX: {column.wipLimit}
          </span>
        )}
        <span style={{ flex: 1 }} />
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
          <MoreIcon label="Column actions" size="small" primaryColor={tk.textMuted} />
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
              background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
              borderRadius: 4,
              boxShadow: 'var(--ds-shadow-overlay, rgba(9,30,66,0.31) 0 0 1px, rgba(9,30,66,0.25) 0 4px 8px -2px)',
              padding: '8px 0',
              fontFamily: 'var(--cp-font-body)',
            }}
          >
            {/* Column name header */}
            <div style={{
              padding: '4px 16px 8px', fontSize: 11, fontWeight: 700, color: tk.textMuted,
              letterSpacing: 0.5,
              borderBottom: `1px solid ${tk.border}`, marginBottom: 4,
            }}>{column.name}</div>
            {/* Column stats — non-interactive info rows */}
            <div style={{ padding: '8px 16px', fontSize: 12, color: tk.textPrimary, display: 'flex', justifyContent: 'space-between' }}>
              <span>Cards</span>
              <span style={{ fontFamily: 'var(--cp-font-mono)', fontWeight: 600 }}>{issueIds.length}</span>
            </div>
            {column.wipLimit != null && (
              <div style={{
                padding: '8px 16px', fontSize: 12, display: 'flex', justifyContent: 'space-between',
                color: issueIds.length > column.wipLimit ? 'var(--ds-text-danger, #AE2A19)' : tk.textPrimary,
              }}>
                <span>WIP limit</span>
                <span style={{ fontFamily: 'var(--cp-font-mono)', fontWeight: 600 }}>
                  {issueIds.length}/{column.wipLimit}
                </span>
              </div>
            )}
            {/* Separator */}
            <div style={{ height: 1, background: tk.border, margin: '4px 0' }} />
            {/* Actionable items — Jira parity */}
            {[
              {
                key: 'copy-cards',
                label: `Copy column stats`,
                act: () => {
                  const text = `${column.name}: ${issueIds.length} card${issueIds.length !== 1 ? 's' : ''}${column.wipLimit != null ? ` (WIP: ${column.wipLimit})` : ''}`;
                  navigator.clipboard.writeText(text).catch(() => {/* silent */});
                  setMeatballAnchor(null);
                },
              },
              ...((actions.onCreateInColumn || actions.onCreateCard) ? [{
                key: 'create',
                label: actions.createInColumnLabel ?? 'Create issue here',
                act: () => { setInlineCreateColId(column.id); setMeatballAnchor(null); },
              }] : []),
            ].map((item) => (
              <button
                key={item.key}
                role="menuitem"
                type="button"
                onClick={item.act}
                style={{
                  display: 'flex',
                  width: '100%',
                  padding: '8px 16px',
                  fontSize: 13,
                  color: tk.textPrimary,
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'var(--cp-font-body)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = tk.surfaceHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
      </div>

      {/* Body (drop target + virtualized card list) */}
      <VirtualizedColumnBody
        ref={bodyRef}
        issueIds={issueIds}
        issuesById={issuesById}
        column={column}
        isLoading={isLoading}
        isOver={isOver}
        selectedId={selectedId}
        focusedId={focusedId}
        avatarsByName={avatarsByName}
        d={d}
        tk={tk}
        cardColorMode={cardColorMode}
        onCardClick={onCardClick}
        actions={actions}
        inlineCreateColId={inlineCreateColId}
        setInlineCreateColId={setInlineCreateColId}
        isFirst={isFirst}
        isColHovered={isColHovered}
      />
    </div>
  );
});

/**
 * VirtualizedColumnBody — high-performance card rendering with @tanstack/react-virtual
 * Renders visible cards + overscan buffer (3 items) to reduce DOM from 1000s to ~50 nodes.
 * Preserves drag-and-drop index mapping by rendering virtual items in order of issueIds array.
 */
const VirtualizedColumnBody = memo(forwardRef(function VirtualizedColumnBody(
  {
    issueIds,
    issuesById,
    column,
    isLoading,
    isOver,
    selectedId,
    focusedId,
    avatarsByName,
    d,
    tk,
    cardColorMode,
    onCardClick,
    actions,
    inlineCreateColId,
    setInlineCreateColId,
    isFirst,
    isColHovered,
  }: {
    issueIds: string[];
    issuesById: Map<string, BoardIssue>;
    column: KanbanColumnDef;
    isLoading?: boolean;
    isOver?: boolean;
    selectedId?: string;
    focusedId?: string;
    avatarsByName: Map<string, string>;
    d: DensityConfig;
    tk: KanbanThemeTokens;
    cardColorMode?: CardColorMode;
    onCardClick: (id: string) => void;
    actions: CardActions;
    inlineCreateColId: string | null;
    setInlineCreateColId: (id: string | null) => void;
    isFirst?: boolean;
    isColHovered?: boolean;
  },
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  const parentRef = ref || useRef<HTMLDivElement>(null);

  // A23/A24 — Scroll overflow shadows.
  // Architecture note (2026-05-22): this board uses PAGE-LEVEL scroll via the
  // CatalystShell content area (overflow-y-auto). Column bodies are NOT individually
  // scrollable — they expand to their full card height. Per-column scroll shadows
  // therefore track the column's position within the PAGE scroll, not a local
  // scrollTop. We use window scroll + column bounding rect to detect when:
  //   showTopShadow:    column content starts above the visible viewport top
  //   showBottomShadow: column content ends below the visible viewport bottom
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(false);

  const updateScrollShadows = useCallback(() => {
    const el = typeof parentRef === 'object' && parentRef !== null
      ? (parentRef as React.RefObject<HTMLDivElement>).current
      : null;
    if (!el) return;
    // For page-level scroll: compare column bounding rect to viewport
    const rect = el.getBoundingClientRect();
    const viewH = window.innerHeight;
    setShowTopShadow(rect.top < -4);          // column top is above viewport
    setShowBottomShadow(rect.bottom > viewH + 4); // column bottom is below viewport
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', updateScrollShadows, { passive: true });
    // Also listen on the shell scroll container if it exists
    const shell = document.querySelector<HTMLElement>('.overflow-y-auto.overflow-x-hidden');
    if (shell) shell.addEventListener('scroll', updateScrollShadows, { passive: true });
    updateScrollShadows(); // Initial check
    return () => {
      window.removeEventListener('scroll', updateScrollShadows);
      if (shell) shell.removeEventListener('scroll', updateScrollShadows);
    };
  }, [updateScrollShadows]);

  // Calculate estimated card height per density config.
  // Accounts for: cardPad (top+bottom) + titleSize + lineHeight + metaSize + footerHeight + cardGap
  // Jira evidence (Lane A MDT board 597, 2026-05-20): card heights vary by visual density, not uniform.
  const calculateCardHeight = (cfg: DensityConfig): number => {
    // Parse top padding from "6px 8px" or "12px" format
    const padParts = cfg.cardPad.split(' ');
    const padTop = parseInt(padParts[0], 10);
    const padBottom = padParts.length > 1 ? parseInt(padParts[1], 10) : padTop;
    // Title row: titleSize + lineHeight (titleSize + 6px)
    const titleRow = cfg.titleSize + (cfg.titleSize + 6);
    // Meta row: metaSize
    const metaRow = cfg.metaSize;
    // Footer row: footerHeight
    const footerRow = cfg.footerHeight;
    // 2026-06-15: gap is handled by the virtualizer's `gap` config, NOT included
    // in measured height. Excluding it from the estimate keeps the virtualizer's
    // math consistent (it adds gap*count itself).
    const total = padTop + titleRow + metaRow + footerRow + padBottom;
    return Math.max(total, cfg.cardMinHeight || 26); // Ensure minimum viable height
  };

  const estimatedCardHeight = calculateCardHeight(d);

  const virtualizer = useVirtualizer({
    count: issueIds.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedCardHeight,
    // 2026-06-15: native `gap` config (TanStack v3.10+). Virtualizer adds this
    // spacing between every item — geometry is rock-solid even before measurement
    // completes. Replaces the prior paddingBottom hack which polluted measured
    // height and caused initial-render position drift.
    gap: d.cardGap,
    // measureElement: dynamic height measurement — required for correct virtualizer math.
    // Without this, variable-height cards cause position drift as the user scrolls.
    measureElement: typeof window !== 'undefined'
      ? (el) => el.getBoundingClientRect().height
      : undefined,
    overscan: 3,  // Render 3 extra items above/below viewport for smoother scrolling
  });

  // 2026-06-15: virtualization DISABLED for project kanban columns.
  // TanStack v3's variable-height measurement causes initial-render position
  // drift that requires the user to scroll each column to "settle" the layout
  // — the exact symptom Vikram reported. Every fix attempt (estimate tuning,
  // native `gap` config, paddingBottom removal) reduced but did not eliminate
  // the drift, because the root cause is "estimate is one number, real card
  // heights vary 80–140px based on content". The only durable fix is to render
  // every card via the flex `gap` path. Performance impact for 200-card columns
  // is negligible on modern browsers; the visual stability win is total.
  if (issueIds.length < Number.MAX_SAFE_INTEGER) {
    return (
      <div
        ref={parentRef}
        style={{
          /* 2026-06-15 (definitive): switched from `display:flex; gap` to plain
             block layout with explicit `marginBottom` on every card wrapper.
             Flex `gap` was producing inconsistent visual spacing because the
             cards' outer wrapper (PragmaticCard returns a `position:relative`
             div with no display type set) was being treated unpredictably as a
             flex item depending on render order. Explicit margins are deterministic:
             EVERY card except the last gets exactly 12px below it. No exceptions,
             no measurement, no animation, no flex-item quirk. */
          padding: '0 8px 12px 8px',
          minHeight: 100,  /* empty columns still feel like a column, stay droppable */
          background: isOver ? tk.dropHighlight : 'transparent',
          borderRadius: '0 0 6px 6px',
        }}
      >
        {/* A25 — Skeleton pulse: neutral background so skeletons are visible against white column bg.
             Uses var(--ds-skeleton) with ADS-canonical fallback. */}
        {issueIds.length === 0 && isLoading && (
          <div>
            {[72, 56, 88].map((h, i) => (
              <div key={i} style={{
                height: h, borderRadius: 4,
                marginBottom: i < 2 ? 12 : 0,
                background: 'var(--ds-skeleton, var(--ds-background-neutral, #F1F2F4))',
                boxShadow: tk.cardShadowRest,
                animationName: 'kanbanSkeletonPulse',
                animationDuration: '1.6s',
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
                animationDelay: `${i * 120}ms`,
              }} />
            ))}
          </div>
        )}
        {issueIds.length === 0 && !isLoading && isOver && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 60, color: tk.selectedAccent, fontSize: 13, fontWeight: 600,
            fontFamily: 'var(--cp-font-body)',
          }}>
            Drop here
          </div>
        )}
        {issueIds.map((id, idx) => {
          const issue = issuesById.get(id);
          if (!issue) return null;
          const isLast = idx === issueIds.length - 1;
          return (
            <div
              key={id}
              style={{
                /* The ONE place spacing is decided. Every card except the last
                   gets 12px below. Last card has 0 so the column doesn't have
                   a phantom trailing gap. This wrapper guarantees uniform
                   spacing irrespective of anything inside PragmaticCard. */
                marginBottom: isLast ? 0 : 12,
              }}
            >
              <PragmaticCard
                issue={issue}
                colId={column.id}
                avatarUrl={issue.assigneeName ? avatarsByName.get(issue.assigneeName.toLowerCase()) : null}
                onClick={() => onCardClick(id)}
                d={d}
                tk={tk}
                isSelected={selectedId === id}
                isFocused={focusedId === id}
                avatarsByName={avatarsByName}
                cardColorMode={cardColorMode}
                {...actions}
              />
            </div>
          );
        })}
        {(actions.onCreateInColumn || actions.onCreateCard) && (() => {
          // Visibility rule (Jira parity):
          //  • First column AND empty → always visible (entry-point affordance)
          //  • Otherwise → only while the column is hovered
          // Layout: the button is ALWAYS in the DOM so the column reserves its
          // height — hover only flips visibility. Prevents column-height jump.
          const showCreate = (isFirst && issueIds.length === 0) || isColHovered;
          if (inlineCreateColId === column.id) {
            return (
              <div style={{ marginTop: issueIds.length === 0 ? 0 : 12 }}>
                <InlineCreateCard
                  projectKey={actions.projectKey || ''}
                  columnId={column.id}
                  status={column.statuses?.[0]}
                  onCreateCard={(issue) => {
                    actions.onCreateCard?.(issue);
                    setInlineCreateColId(null);
                  }}
                  onCancel={() => setInlineCreateColId(null)}
                />
              </div>
            );
          }
          return (
            <button
              type="button"
              data-testid={`kanban-column-create-${column.id}`}
              onClick={() => setInlineCreateColId(column.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: SPACING_TOKENS.gap8,
                width: '100%',
                boxSizing: 'border-box',
                /* Match card padding so the "+ Create" text inset aligns with
                   card content above. */
                padding: d.cardPad,
                border: 'none',
                background: 'transparent',
                color: tk.textMuted,
                fontSize: 13,
                fontWeight: 500,
                fontFamily: 'var(--cp-font-body)',
                borderRadius: 4,
                cursor: showCreate ? 'pointer' : 'default',
                textAlign: 'left',
                marginTop: issueIds.length === 0 ? 0 : 12,
                visibility: showCreate ? 'visible' : 'hidden',
              }}
              tabIndex={showCreate ? 0 : -1}
              aria-hidden={!showCreate}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-neutral, #F1F2F4)';
                (e.currentTarget as HTMLButtonElement).style.color = tk.textPrimary;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = tk.textMuted;
              }}
            >
              <AddIcon label="" size="small" primaryColor="currentColor" />
              <span>Create</span>
            </button>
          );
        })()}
      </div>
    );
  }

  // Virtualized rendering for large lists (>= 15 cards)
  const virtualItems = virtualizer.getVirtualItems();

  return (
    // A23/A24 wrapper — position: relative so the gradient shadow overlays are anchored
    // to the visible column body edges, not to the scrollable content inside parentRef.
    <div style={{ position: 'relative', flex: 1, minHeight: 120, display: 'flex', flexDirection: 'column' }}>
      {/* A23 — Top overflow shadow: appears when user has scrolled past the first card */}
      {showTopShadow && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 20, zIndex: 2,
            background: 'linear-gradient(to bottom, var(--ds-overlay, rgba(9,30,66,0.08)) 0%, transparent 100%)',
            pointerEvents: 'none', borderRadius: '0 0 0 0',
          }}
        />
      )}
      {/* A24 — Bottom overflow shadow: appears when there are cards below the visible fold */}
      {showBottomShadow && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 20, zIndex: 2,
            background: 'linear-gradient(to top, var(--ds-overlay, rgba(9,30,66,0.08)) 0%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />
      )}
    <div
      ref={parentRef}
      className="flex flex-col overflow-y-auto"
      style={{
        padding: '8px',
        flex: 1,
        minHeight: 0,
        background: isOver ? tk.dropHighlight : 'transparent',
        transition: 'background 150ms ease',
        borderRadius: '0 0 6px 6px',
      }}
    >
      <div
        style={{
          position: 'relative',
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const id = issueIds[virtualItem.index];
          const issue = issuesById.get(id);
          if (!issue) return null;

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                // NOTE: NO height here — TanStack Virtual v3 measures via measureElement.
                // Setting height: virtualItem.size prevents dynamic measurement.
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {/* 2026-06-15: paddingBottom wrapper removed — virtualizer `gap` config
                  now owns inter-card spacing. Removing this wrapper means measured
                  height = real card height, not card + 8px, so positions converge
                  immediately on first paint instead of requiring scroll-driven reflow. */}
              <PragmaticCard
                issue={issue}
                colId={column.id}
                avatarUrl={issue.assigneeName ? avatarsByName.get(issue.assigneeName.toLowerCase()) : null}
                onClick={() => onCardClick(id)}
                d={d}
                tk={tk}
                isSelected={selectedId === id}
                isFocused={focusedId === id}
                avatarsByName={avatarsByName}
                cardColorMode={cardColorMode}
                {...actions}
              />
            </div>
          );
        })}
      </div>

      {/* Per-column create button — always in DOM (reserves layout space);
          visibility toggled so the column height never jumps on hover. */}
      {(actions.onCreateInColumn || actions.onCreateCard) && (() => {
        const showCreate = (isFirst && issueIds.length === 0) || isColHovered;
        if (inlineCreateColId === column.id) {
          return (
            <div style={{ marginTop: issueIds.length === 0 ? 0 : 4 }}>
              <InlineCreateCard
                projectKey={actions.projectKey || ''}
                columnId={column.id}
                status={column.statuses?.[0]}
                assigneeOptions={actions.assigneeOptions}
                avatarsByName={avatarsByName}
                onCreateCard={(issue) => {
                  actions.onCreateCard?.(issue);
                  setInlineCreateColId(null);
                }}
                onCancel={() => setInlineCreateColId(null)}
              />
            </div>
          );
        }
        return (
          <button
            type="button"
            data-testid={`kanban-column-create-${column.id}`}
            onClick={() => setInlineCreateColId(column.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: 8,
              /* Left/right margin matches the body's 8px padding so the button's
                 outer box lines up with the card boxes inside the body. */
              width: 'calc(100% - 16px)',
              margin: '4px 8px 0',
              boxSizing: 'border-box',
              /* Match card padding so internal content aligns with card content. */
              padding: d.cardPad,
              border: 'none',
              background: 'transparent',
              color: tk.textMuted,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'var(--cp-font-body)',
              borderRadius: 4,
              cursor: showCreate ? 'pointer' : 'default',
              textAlign: 'left',
              visibility: showCreate ? 'visible' : 'hidden',
            }}
            tabIndex={showCreate ? 0 : -1}
            aria-hidden={!showCreate}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-neutral, #F1F2F4)';
              (e.currentTarget as HTMLButtonElement).style.color = tk.textPrimary;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = tk.textMuted;
            }}
          >
            <AddIcon label="" size="small" primaryColor="currentColor" />
            <span>Create</span>
          </button>
        );
      })()}
    </div>
    {/* closes A23/A24 wrapper */}
    </div>
  );
}), (prevProps, nextProps) => {
  // Memoization: skip re-render when nothing actually changed.
  // issueIds uses CONTENT equality (not reference ===) because KanbanBoardPage
  // passes `colMap[col.id] ?? []` — the fallback `[]` and group-derived arrays
  // produce new references on every parent re-render even when card order is
  // identical. Reference equality would defeat React.memo entirely, causing all
  // column bodies to re-render on every `setSelIssueId`, filter open, etc.
  const idsEqual =
    prevProps.issueIds.length === nextProps.issueIds.length &&
    prevProps.issueIds.every((id, i) => id === nextProps.issueIds[i]);
  return (
    idsEqual &&
    prevProps.selectedId === nextProps.selectedId &&
    prevProps.focusedId === nextProps.focusedId &&
    prevProps.isOver === nextProps.isOver &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.inlineCreateColId === nextProps.inlineCreateColId &&
    prevProps.isColHovered === nextProps.isColHovered &&
    prevProps.isFirst === nextProps.isFirst
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
  /** Pass-through to columns: shows pulse skeleton cards while data loads */
  isLoading?: boolean;
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
  /** Card left-border colour rule (Jira: Board config → Card colors) */
  cardColorMode?: CardColorMode;
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
  cardColorMode, isLoading,
  ...actions
}: PragmaticBoardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  /* F7 + A25: Inject kanban CSS keyframes once per page load.
     - kanbanCardFadeIn: staggered card entrance (CSS-based, avoids @atlaskit/motion Vite pre-bundle issue)
     - kanbanSkeletonPulse: loading skeleton breathe animation (opacity 1→0.4→1) */
  useEffect(() => {
    const TAG = 'kanban-card-fade-in-styles';
    if (document.getElementById(TAG)) return;
    const style = document.createElement('style');
    style.id = TAG;
    style.textContent = `
      @keyframes kanbanCardFadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes kanbanSkeletonPulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.4; }
      }
    `;
    document.head.appendChild(style);
  }, []);

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
          gap: SPACING_TOKENS.gap12,
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
                  display: 'flex', alignItems: 'center', gap: SPACING_TOKENS.gap8,
                  padding: '8px 8px',
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
                  gap: SPACING_TOKENS.gap8,
                  width: '100%',
                  minWidth: columns.length * 267 + (columns.length - 1) * 8,
                  marginTop: 4,
                }}
              >
                {columns.map((col, idx) => (
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
                    cardColorMode={cardColorMode}
                    isFirst={idx === 0}
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
        gap: SPACING_TOKENS.gap8,
        /* Fill the viewport width so flex:1 on columns can distribute
           extra space. minWidth still guarantees horizontal scroll on
           viewports narrower than the natural column count * 267. */
        width: '100%',
        minWidth: columns.length * 267 + (columns.length - 1) * 8,
      }}
    >
      {columns.map((col, idx) => (
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
          cardColorMode={cardColorMode}
          isLoading={isLoading}
          isFirst={idx === 0}
          {...actions}
        />
      ))}
    </div>
  );
}
