/**
 * KanbanColumn — Fixed-width column with header + droppable area (memoized)
 * Jira parity: 267px width, #F8F8F8 surface, 48px header with 6px top radius,
 * column name 12px / weight 500 / no letter-spacing, count as plain text.
 */
import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Inbox } from 'lucide-react';
import { SortableCard } from './SortableCard';
import type { BoardIssue } from './kanban-types';
import type { KanbanThemeTokens, DensityConfig, KanbanColumnDef } from './kanban-tokens';
import type { AssigneeOption } from './AssigneePickerPopover';
import type { VisibleFields } from '@/hooks/useKanbanViewSettings';

/* ═══ COLUMN HEADER ═══ */

function ColHeader({ name, count, category, tk }: { name: string; count: number; category: string; tk: KanbanThemeTokens }) {
  // Jira-parity column dot colour. Maps legacy 3-category + the 6-category
  // Atlaskit categories (default/inprogress/success/removed/new/moved) onto
  // the exact Atlaskit colour tokens. Single source of truth lives in
  // /src/components/workflow — this header just mirrors the same palette
  // so column dots match the lozenges rendered on cards/rows elsewhere.
  const c = category?.toLowerCase?.();
  const categoryDot =
    c === 'done' || c === 'success'           ? '#006644' :  // Atlaskit "success"
    c === 'in_progress' || c === 'inprogress' ? '#0747A6' :  // Atlaskit "inprogress"
    c === 'removed'                           ? '#AE2A19' :  // Atlaskit "removed"
    c === 'new'                               ? '#5E4DB2' :  // Atlaskit "new"
    c === 'moved'                             ? '#A54800' :  // Atlaskit "moved"
    '#5E6C84';                                                // Atlaskit "default" / todo
  return (
    <div className="flex items-center gap-2 sticky top-0 z-10" style={{
      height: 48,                                       /* Jira parity: 48px */
      padding: '0 12px',
      background: tk.headerBg,
      borderRadius: '6px 6px 0 0',                      /* top-only radius */
      flexShrink: 0,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%', background: categoryDot, flexShrink: 0,
      }} />
      <span style={{
        fontSize: 12, fontWeight: 500, textTransform: 'uppercase',
        color: tk.textMuted,                            /* no letter-spacing (Jira: normal) */
        fontFamily: 'var(--ds-font-family-body)',
        lineHeight: '16px',
        flex: 1,
      }}>{name}</span>
      <span style={{
        /* Jira parity: plain text, no pill */
        fontSize: 12, fontWeight: 500,
        color: tk.textPrimary,
        background: 'transparent',
        padding: 0, lineHeight: '16px',
        fontFamily: 'var(--ds-font-family-body)',
      }}>{count}</span>
    </div>
  );
}

/* ═══ DROPPABLE COLUMN ═══ */

export const DroppableColumn = memo(function DroppableColumn({ column, issueIds, issuesById, avatarsByName, onCardClick, isFirst, d, tk, selectedId, focusedId, onToggleFlag, onCopyLink, onCopyKey, onChangeStatus, onSaveSummary, onChangeAssignee, assigneeOptions, projectKey, onLabelsUpdated, onParentChange, onArchive, onDelete, onMoved, onLinked, visibleFields }: {
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
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div
      className="flex flex-col flex-shrink-0"
      style={{
        /* Jira parity: 267px fixed column, #F8F8F8 surface, no dividing border */
        width: 267,
        minWidth: 267,
        maxWidth: 267,
        background: tk.surfaceAlt,
        borderRadius: 6,                                /* full column radius; header overlays top */
      }}
      role="list"
      aria-label={`${column.name} column, ${issueIds.length} items`}
    >
      <ColHeader name={column.name} count={issueIds.length} category={column.category} tk={tk} />
      <div
        ref={setNodeRef}
        className="flex flex-col overflow-y-auto"
        style={{
          padding: '0 10px 10px 10px',                  /* 10px side gutters, no top (header sits above) */
          gap: d.cardGap,
          flex: 1,
          minHeight: 120,
          background: isOver ? tk.dropHighlight : 'transparent',
          transition: 'background 150ms ease',
          borderRadius: '0 0 6px 6px',
        }}
      >
        <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
          {issueIds.length === 0 && (
            <div className="flex flex-col items-center justify-center" style={{
              minHeight: 100, color: tk.textDisabled, fontSize: 12, gap: 6,
              fontFamily: 'var(--ds-font-family-body)',
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
                onCopyKey={onCopyKey}
                onChangeStatus={onChangeStatus}
                onOpenDetail={onCardClick}
                onSaveSummary={onSaveSummary}
                onChangeAssignee={onChangeAssignee}
                assigneeOptions={assigneeOptions}
                avatarsByName={avatarsByName}
                projectKey={projectKey}
                onLabelsUpdated={onLabelsUpdated}
                onParentChange={onParentChange}
                onArchive={onArchive}
                onDelete={onDelete}
                onMoved={onMoved}
                onLinked={onLinked}
                visibleFields={visibleFields}
              />
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
});