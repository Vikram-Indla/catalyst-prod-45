/**
 * KanbanSwimlane — Grouped swimlane row with expandable columns
 * Jira-parity: epic key, icon, summary, child count, status lozenge
 */

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { PriorityBars, normalisePriority } from '@/components/shared/PriorityIndicator';
import { KanbanAvatar } from './KanbanAvatar';
import { SortableCard } from './SortableCard';
import { KANBAN_COLUMNS, STATUS_TO_COL_ID } from './kanban-tokens';
import type { BoardIssue, GroupBucket, GroupByMode } from './kanban-types';
import type { KanbanThemeTokens, DensityConfig } from './kanban-tokens';
import type { AssigneeOption } from './AssigneePickerPopover';

/* ── Status Lozenge (3-color guardrail) ── */
function StatusLozenge({ status, category, tk }: { status: string; category: string; tk: KanbanThemeTokens }) {
  const cat = category?.toLowerCase() ?? 'todo';
  let bg: string, fg: string;
  if (cat === 'done') { bg = '#E3FCEF'; fg = '#006644'; }
  else if (cat === 'indeterminate' || cat === 'in_progress' || cat === 'in progress') { bg = '#DEEBFF'; fg = '#0747A6'; }
  else { bg = '#DFE1E6'; fg = '#253858'; }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      height: 20, padding: '0 6px', borderRadius: 3,
      background: bg, color: fg,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
      textTransform: 'uppercase', whiteSpace: 'nowrap',
      fontFamily: "'Inter', sans-serif",
    }}>
      {status}
    </span>
  );
}

export function SwimlaneRow({ group, mode, issuesById, avatarsByName, onCardClick, defaultOpen, d, tk, selectedId, onToggleFlag, onCopyLink, onCopyKey, onChangeStatus, onSaveSummary, onChangeAssignee, assigneeOptions, projectKey, onLabelsUpdated, onParentChange, onArchive, onDelete, onMoved, onLinked }: {
  group: GroupBucket;
  mode: GroupByMode;
  issuesById: Map<string, BoardIssue>;
  avatarsByName: Map<string, string>;
  onCardClick: (id: string) => void;
  defaultOpen: boolean;
  d: DensityConfig;
  tk: KanbanThemeTokens;
  selectedId?: string | null;
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
}) {
  const [open, setOpen] = useState(defaultOpen);

  const colMap = useMemo(() => {
    const m: Record<string, string[]> = {};
    KANBAN_COLUMNS.forEach(c => { m[c.id] = []; });
    group.issueIds.forEach(id => {
      const issue = issuesById.get(id);
      if (!issue) return;
      const cid = STATUS_TO_COL_ID.get(issue.status.toLowerCase());
      if (cid && m[cid]) m[cid].push(id);
    });
    return m;
  }, [group.issueIds, issuesById]);

  /* Look up epic BoardIssue for status lozenge */
  const epicIssue = useMemo(() => {
    if (mode !== 'epic' || group.groupKey === 'NO_EPIC') return null;
    for (const issue of issuesById.values()) {
      if (issue.issueKey === group.groupKey && issue.issueType === 'Epic') return issue;
    }
    return null;
  }, [mode, group.groupKey, issuesById]);

  const icon = () => {
    if (mode === 'assignee') {
      const name = group.groupKey === 'UNASSIGNED' ? null : group.groupLabel;
      return <KanbanAvatar name={name} url={name ? avatarsByName.get(name.toLowerCase()) : null} size={24} tk={tk} />;
    }
    if (mode === 'epic' && group.groupKey !== 'NO_EPIC') return <JiraIssueTypeIcon type="Epic" size={16} />;
    if (mode === 'priority') return <PriorityBars priority={normalisePriority(group.groupLabel)} />;
    return null;
  };

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center w-full text-left"
        style={{
          gap: 8,
          padding: '12px 16px',
          background: tk.surfaceAlt,
          border: 'none',
          borderBottom: `1px solid ${tk.border}`,
          cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
          minHeight: 44,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = tk.surfaceHover; }}
        onMouseLeave={e => { e.currentTarget.style.background = tk.surfaceAlt; }}
      >
        {open ? <ChevronDown size={16} color={tk.textMuted} /> : <ChevronRight size={16} color={tk.textMuted} />}
        {icon()}
        {mode === 'epic' && group.groupKey !== 'NO_EPIC' && (
          <span style={{ fontSize: 13, fontWeight: 600, color: tk.textSecondary, fontFamily: "'JetBrains Mono', monospace" }}>{group.groupKey}</span>
        )}
        <span style={{ fontSize: 14, fontWeight: 500, color: tk.textPrimary }}>{group.groupLabel}</span>
        <span style={{ fontSize: 12, color: tk.textMuted, marginLeft: -2 }}>({group.issueIds.length})</span>
        {/* Epic status lozenge — Jira parity */}
        {epicIssue && (
          <span style={{ marginLeft: 4 }}>
            <StatusLozenge status={epicIssue.status} category={epicIssue.statusCategory} tk={tk} />
          </span>
        )}
      </button>

      {open && (
        <div className="flex" style={{ borderBottom: `1px solid ${tk.border}` }}>
          {KANBAN_COLUMNS.map((col, i) => {
            const ids = colMap[col.id] ?? [];
            return (
              <SwimlaneDndColumn
                key={col.id}
                colId={col.id}
                groupKey={group.groupKey}
                issueIds={ids}
                issuesById={issuesById}
                avatarsByName={avatarsByName}
                onCardClick={onCardClick}
                isFirst={i === 0}
                d={d}
                tk={tk}
                selectedId={selectedId}
                onToggleFlag={onToggleFlag}
                onCopyLink={onCopyLink}
                onCopyKey={onCopyKey}
                onChangeStatus={onChangeStatus}
                onSaveSummary={onSaveSummary}
                onChangeAssignee={onChangeAssignee}
                assigneeOptions={assigneeOptions}
                projectKey={projectKey}
                onLabelsUpdated={onLabelsUpdated}
                onParentChange={onParentChange}
                onArchive={onArchive}
                onDelete={onDelete}
                onMoved={onMoved}
                onLinked={onLinked}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function SwimlaneDndColumn({ colId, groupKey, issueIds, issuesById, avatarsByName, onCardClick, isFirst, d, tk, selectedId, onToggleFlag, onCopyLink, onCopyKey, onChangeStatus, onSaveSummary, onChangeAssignee, assigneeOptions, projectKey, onLabelsUpdated, onParentChange, onArchive, onDelete, onMoved, onLinked }: {
  colId: string; groupKey: string; issueIds: string[];
  issuesById: Map<string, BoardIssue>; avatarsByName: Map<string, string>;
  onCardClick: (id: string) => void; isFirst: boolean;
  d: DensityConfig; tk: KanbanThemeTokens;
  selectedId?: string | null;
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
}) {
  const droppableId = `${groupKey}::${colId}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  return (
    <div className="flex flex-col" style={{
      flex: '1 1 0', minWidth: 180,
      borderLeft: isFirst ? 'none' : `1px solid ${tk.border}`,
    }}>
      <div ref={setNodeRef} className="flex flex-col p-1" style={{
        gap: d.cardGap, minHeight: 40,
        background: isOver ? tk.dropHighlight : tk.surfaceBg,
        transition: 'background 100ms',
      }}>
        <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
          {issueIds.length === 0 && isOver && (
            <div className="flex items-center justify-center" style={{ minHeight: 40, color: tk.textDisabled, fontSize: 11 }}>Drop here</div>
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
              />
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
}
