/**
 * CatalystKanbanBoard — Hub-agnostic DnD board.
 *
 * Structural twin of PragmaticBoard.tsx but typed to `KanbanCardData`
 * instead of `BoardIssue`, so ProductHub / IncidentHub / Team / Program
 * can mount the same component. Columns, cards, avatar map and theme
 * all flow in as props — the component never reads from Supabase.
 *
 * The DnD engine (Atlaskit Pragmatic) is shared with PragmaticBoard via
 * different source-data types ('catalyst-card' vs 'kanban-card') so the
 * two can coexist on the same page without cross-contaminating drops.
 */
import { memo, useEffect, useRef, useState } from 'react';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { Inbox } from 'lucide-react';
import { CatalystKanbanCard } from './CatalystKanbanCard';
import type { KanbanCardData } from './catalyst-types';
import type { KanbanThemeTokens, DensityConfig, KanbanColumnDef } from './kanban-tokens';

/* ═════════════════════════════════════════════════════════════════════
   resolveDropTarget — pure reconciliation, shared with PragmaticBoard
   logic but scoped to 'catalyst-card' events.
   ═════════════════════════════════════════════════════════════════════ */
export function resolveCatalystDrop(args: {
  sourceCardId: string;
  sourceColumnId: string;
  targetType: 'catalyst-card' | 'catalyst-column';
  targetColumnId: string;
  targetCardId?: string;
  edge?: Edge | null;
  columnMap: Record<string, string[]>;
}): { destColumnId: string; insertIndex: number } | null {
  const { sourceCardId, sourceColumnId, targetType, targetColumnId, targetCardId, edge, columnMap } = args;

  let insertIndex: number;
  if (targetType === 'catalyst-card') {
    const ids = columnMap[targetColumnId] ?? [];
    if (!targetCardId) return null;
    const targetIdx = ids.indexOf(targetCardId);
    if (targetIdx < 0) return null;
    insertIndex = edge === 'bottom' ? targetIdx + 1 : targetIdx;
  } else {
    insertIndex = (columnMap[targetColumnId] ?? []).length;
  }

  if (targetColumnId === sourceColumnId) {
    const currentIdx = (columnMap[sourceColumnId] ?? []).indexOf(sourceCardId);
    if (currentIdx >= 0 && insertIndex > currentIdx) insertIndex -= 1;
    if (currentIdx === insertIndex) return null;
  }
  return { destColumnId: targetColumnId, insertIndex };
}

/* ═════════════════════════════════════════════════════════════════════
   Column
   ═════════════════════════════════════════════════════════════════════ */
interface CatalystColumnProps {
  column: KanbanColumnDef;
  cardIds: string[];
  cardsById: Map<string, KanbanCardData>;
  avatarsByName: Map<string, string>;
  onCardClick: (id: string) => void;
  d: DensityConfig;
  tk: KanbanThemeTokens;
  selectedId?: string | null;
  focusedId?: string | null;
  renderCardFooter?: (card: KanbanCardData) => React.ReactNode;
}

const CatalystColumn = memo(function CatalystColumn({
  column, cardIds, cardsById, avatarsByName, onCardClick, d, tk, selectedId, focusedId, renderCardFooter,
}: CatalystColumnProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    return dropTargetForElements({
      element: el,
      canDrop: ({ source }) => source.data.type === 'catalyst-card',
      getData: () => ({ type: 'catalyst-column', columnId: column.id }),
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
      canScroll: ({ source }) => source.data.type === 'catalyst-card',
    });
  }, [column.id]);

  const categoryDot = column.category === 'done' ? '#006644'
    : column.category === 'in_progress' ? '#0747A6'
    : '#5E6C84';

  return (
    <div
      className="flex flex-col"
      style={{
        flex: '1 1 267px',
        minWidth: 267,
        maxWidth: 360,
        background: tk.surfaceAlt,
        borderRadius: 6,
      }}
      role="list"
      aria-label={`${column.name} column, ${cardIds.length} items`}
    >
      <div className="flex items-center gap-2 sticky top-0 z-10" style={{
        height: 48, padding: '0 12px', background: tk.headerBg,
        borderRadius: '6px 6px 0 0', flexShrink: 0,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: categoryDot, flexShrink: 0 }} />
        <span style={{
          fontSize: 12, fontWeight: 500, textTransform: 'uppercase',
          color: tk.textMuted, fontFamily: "'Inter', sans-serif",
          lineHeight: '16px', flex: 1,
        }}>{column.name}</span>
        <span style={{
          fontSize: 12, fontWeight: 500, color: tk.textPrimary,
          fontFamily: "'Inter', sans-serif", lineHeight: '16px',
          fontVariantNumeric: 'tabular-nums',
        }}>{cardIds.length}</span>
      </div>

      <div
        ref={bodyRef}
        className="flex flex-col overflow-y-auto"
        style={{
          padding: '0 10px 10px 10px',
          gap: d.cardGap, flex: 1, minHeight: 120,
          background: isOver ? tk.dropHighlight : 'transparent',
          transition: 'background 150ms ease',
          borderRadius: '0 0 6px 6px',
        }}
      >
        {cardIds.length === 0 && (
          <div className="flex flex-col items-center justify-center" style={{
            minHeight: 100, color: tk.textDisabled, fontSize: 12, gap: 6,
            fontFamily: "'Inter', sans-serif",
          }}>
            {isOver
              ? <span style={{ color: tk.selectedAccent, fontWeight: 600, fontSize: 13 }}>Drop here</span>
              : <><Inbox size={20} style={{ opacity: 0.4 }} /><span>No work items</span></>
            }
          </div>
        )}
        {cardIds.map(id => {
          const card = cardsById.get(id);
          if (!card) return null;
          return (
            <CatalystKanbanCard
              key={id}
              card={card}
              columnId={column.id}
              avatarUrl={card.assigneeName ? avatarsByName.get(card.assigneeName.toLowerCase()) : null}
              onClick={() => onCardClick(id)}
              d={d}
              tk={tk}
              isSelected={selectedId === id}
              isFocused={focusedId === id}
              renderFooter={renderCardFooter}
            />
          );
        })}
      </div>
    </div>
  );
});

/* ═════════════════════════════════════════════════════════════════════
   Board
   ═════════════════════════════════════════════════════════════════════ */
export interface CatalystKanbanBoardProps {
  columns: KanbanColumnDef[];
  columnMap: Record<string, string[]>;
  cardsById: Map<string, KanbanCardData>;
  avatarsByName: Map<string, string>;
  onCardClick: (id: string) => void;
  d: DensityConfig;
  tk: KanbanThemeTokens;
  selectedId?: string | null;
  focusedId?: string | null;
  renderCardFooter?: (card: KanbanCardData) => React.ReactNode;
}

/**
 * Pure renderer. The drop monitor is owned by CatalystKanban so that
 * when the host enables swimlane grouping (multiple board mounts) a
 * single drop fires a single onDrop instead of N.
 */
export function CatalystKanbanBoard({
  columns, columnMap, cardsById, avatarsByName, onCardClick,
  d, tk, selectedId, focusedId, renderCardFooter,
}: CatalystKanbanBoardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    return autoScrollForElements({
      element: el,
      canScroll: ({ source }) => source.data.type === 'catalyst-card',
    });
  }, []);

  return (
    <div
      ref={scrollRef}
      className="flex"
      style={{
        gap: 8, width: '100%',
        minWidth: columns.length * 267 + (columns.length - 1) * 8,
        padding: '8px 24px 16px',
        overflowX: 'auto',
        alignItems: 'stretch',
      }}
    >
      {columns.map(col => (
        <CatalystColumn
          key={col.id}
          column={col}
          cardIds={columnMap[col.id] ?? []}
          cardsById={cardsById}
          avatarsByName={avatarsByName}
          onCardClick={onCardClick}
          d={d}
          tk={tk}
          selectedId={selectedId}
          focusedId={focusedId}
          renderCardFooter={renderCardFooter}
        />
      ))}
    </div>
  );
}
