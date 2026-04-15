/**
 * KanbanColumn — Fixed-width column with header + droppable area (memoized)
 * Width: 300px fixed. Vertical scroll inside. Proper empty state.
 */
import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableCard } from './SortableCard';
import type { BoardIssue } from './kanban-types';
import type { KanbanThemeTokens, DensityConfig, KanbanColumnDef } from './kanban-tokens';

/* ═══ COLUMN HEADER ═══ */

function ColHeader({ name, count, category, tk }: { name: string; count: number; category: string; tk: KanbanThemeTokens }) {
  const categoryDot = category === 'done' ? '#006644' : category === 'in_progress' ? '#0747A6' : '#5E6C84';
  return (
    <div className="flex items-center gap-2 px-3 sticky top-0 z-10" style={{
      height: 36,
      background: tk.headerBg,
      borderBottom: `1px solid ${tk.border}`,
      flexShrink: 0,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%', background: categoryDot, flexShrink: 0,
      }} />
      <span style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        color: tk.textMuted, letterSpacing: '0.04em',
        fontFamily: "'Inter', sans-serif",
      }}>{name}</span>
      <span style={{
        fontSize: 11, fontWeight: 600, color: tk.textSecondary,
        background: tk.badgeBg, borderRadius: 10,
        padding: '1px 7px', lineHeight: '18px',
        minWidth: 20, textAlign: 'center',
        fontFamily: "'JetBrains Mono', monospace",
      }}>{count}</span>
    </div>
  );
}

/* ═══ DROPPABLE COLUMN ═══ */

export const DroppableColumn = memo(function DroppableColumn({ column, issueIds, issuesById, avatarsByName, onCardClick, isFirst, d, tk, selectedId, focusedId, onToggleFlag, onCopyLink, onChangeStatus }: {
  column: KanbanColumnDef;
  issueIds: string[];
  issuesById: Map<string, BoardIssue>;
  avatarsByName: Map<string, string>;
  onCardClick: (id: string) => void;
  isFirst: boolean;
  d: DensityConfig;
  tk: KanbanThemeTokens;
  selectedId?: string | null;
  focusedId?: string | null;
  onToggleFlag?: (id: string) => void;
  onCopyLink?: (issueKey: string) => void;
  onChangeStatus?: (issueId: string, newStatus: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div
      className="flex flex-col flex-shrink-0"
      style={{
        width: 300,
        minWidth: 300,
        maxWidth: 300,
        height: '100%',
        background: tk.surfaceAlt,
        borderRight: `1px solid ${tk.border}`,
      }}
      role="list"
      aria-label={`${column.name} column, ${issueIds.length} items`}
    >
      <ColHeader name={column.name} count={issueIds.length} category={column.category} tk={tk} />
      <div
        ref={setNodeRef}
        className="flex flex-col overflow-y-auto"
        style={{
          padding: 6,
          gap: d.cardGap,
          flex: '1 1 0',
          minHeight: 0,
          scrollbarGutter: 'stable' as any,
          background: isOver ? tk.dropHighlight : 'transparent',
          transition: 'background 100ms',
        }}
      >
        <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
          {issueIds.length === 0 && (
            <div className="flex flex-col items-center justify-center" style={{
              minHeight: 80, color: tk.textDisabled, fontSize: 12, gap: 4,
              fontFamily: "'Inter', sans-serif",
            }}>
              {isOver ? (
                <span style={{ color: tk.selectedAccent, fontWeight: 500 }}>Drop here</span>
              ) : (
                <span>No work items</span>
              )}
            </div>
          )}
          {issueIds.map(id => {
            const issue = issuesById.get(id);
            if (!issue) return null;
            return (
              <SortableCard
                key={id}
                issue={issue}
                avatarUrl={issue.assigneeName ? avatarsByName.get(issue.assigneeName.toLowerCase()) : null}
                onClick={() => onCardClick(id)}
                d={d}
                tk={tk}
                isSelected={selectedId === id}
                isFocused={focusedId === id}
                onToggleFlag={onToggleFlag}
                onCopyLink={onCopyLink}
                onChangeStatus={onChangeStatus}
                onOpenDetail={onCardClick}
              />
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
});
