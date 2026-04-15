/**
 * KanbanColumn — Column header + droppable area with sortable cards
 */
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableCard } from './SortableCard';
import type { BoardIssue } from './kanban-types';
import type { KanbanThemeTokens, DensityConfig, KanbanColumnDef } from './kanban-tokens';

/* ═══ COLUMN HEADER ═══ */

function ColHeader({ name, count, category, tk }: { name: string; count: number; category: string; tk: KanbanThemeTokens }) {
  const categoryDot = category === 'done' ? '#006644' : category === 'in_progress' ? '#0747A6' : '#5E6C84';
  return (
    <div className="flex items-center gap-1.5 px-2 sticky top-0 z-10" style={{
      height: 32,
      background: tk.headerBg,
      borderBottom: `1px solid ${tk.border}`,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%', background: categoryDot, flexShrink: 0,
      }} />
      <span style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        color: tk.textMuted, letterSpacing: '0.04em',
      }}>{name}</span>
      <span style={{
        fontSize: 11, fontWeight: 600, color: tk.textMuted,
        background: tk.badgeBg, borderRadius: 10,
        padding: '0 5px', lineHeight: '16px',
        minWidth: 16, textAlign: 'center',
      }}>{count}</span>
    </div>
  );
}

/* ═══ DROPPABLE COLUMN ═══ */

export function DroppableColumn({ column, issueIds, issuesById, avatarsByName, onCardClick, isFirst, d, tk, selectedId, onToggleFlag, onCopyLink }: {
  column: KanbanColumnDef;
  issueIds: string[];
  issuesById: Map<string, BoardIssue>;
  avatarsByName: Map<string, string>;
  onCardClick: (id: string) => void;
  isFirst: boolean;
  d: DensityConfig;
  tk: KanbanThemeTokens;
  selectedId?: string | null;
  onToggleFlag?: (id: string) => void;
  onCopyLink?: (issueKey: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div className="flex flex-col flex-shrink-0" style={{
      flex: '1 1 0', minWidth: 180,
      borderLeft: isFirst ? 'none' : `1px solid ${tk.border}`,
    }}>
      <ColHeader name={column.name} count={issueIds.length} category={column.category} tk={tk} />
      <div
        ref={setNodeRef}
        className="flex flex-col p-1 overflow-y-auto"
        style={{
          gap: d.cardGap,
          minHeight: 60,
          maxHeight: 'calc(100vh - 180px)',
          background: isOver ? tk.dropHighlight : 'transparent',
          transition: 'background 100ms',
        }}
      >
        <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
          {issueIds.length === 0 && (
            <div className="flex items-center justify-center" style={{
              minHeight: 40, color: tk.textDisabled, fontSize: 11,
            }}>
              {isOver ? 'Drop here' : ''}
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
                onToggleFlag={onToggleFlag}
                onCopyLink={onCopyLink}
              />
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
}
