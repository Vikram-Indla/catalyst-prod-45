/**
 * EpicBacklogTable — Jira "List" view (image-2) parity, built on
 * @atlaskit/dynamic-table for real Atlassian Design System rendering.
 *
 * Columns (L → R):
 *   Type · Key ↓ · Summary · Status · Comments · Parent ·
 *   Assignee · Due date · Priority
 *
 * Grouping (IN PROGRESS / BACKLOG / etc.) is rendered as one collapsible
 * section per status — each section is a standalone @atlaskit/dynamic-table
 * (the canonical Jira pattern; Atlaskit DT does not ship native grouping).
 * Default sort: Key desc (matches the Jira reference UI).
 */
import { Fragment, useCallback, useState } from 'react';
import DynamicTable from '@atlaskit/dynamic-table';
import type { HeadType, RowType, SortOrderType } from '@atlaskit/dynamic-table/dist/types/types';
import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import type { BacklogEpic, BacklogGroup } from '../../types/backlog.types';
import {
  AssigneeCell,
  CommentsCell,
  DueDateCell,
  KeyCell,
  ParentCell,
  TypeCell,
} from './cells';
import { EditablePriority, EditableStatus, EditableSummary } from './editable-cells';
import { useUpdateEpic, type EpicUpdatePatch } from './hooks/useUpdateEpic';

export interface EpicBacklogTableProps {
  groups: BacklogGroup<BacklogEpic>[];
  avatarsByName: Map<string, string | null>;
  isLoading?: boolean;
  error?: Error | null;
  onRowClick?: (epic: BacklogEpic) => void;
  onEdit?: (epic: BacklogEpic) => void;
  onDelete?: (epic: BacklogEpic) => void;
  emptyState?: React.ReactNode;
  /** Project id, passed into the inline-edit mutation hook. */
  projectId?: string;
  /** When false, every cell renders in read-only mode. */
  canEdit?: boolean;
}

// Column keys (stable — also used as the Atlaskit `sortKey`).
const COL = {
  type: 'type',
  key: 'key',
  summary: 'summary',
  status: 'status',
  comments: 'comments',
  parent: 'parent',
  assignee: 'assignee',
  dueDate: 'dueDate',
  priority: 'priority',
} as const;
type ColKey = (typeof COL)[keyof typeof COL];

const PRIORITY_WEIGHT: Record<string, number> = {
  highest: 0, high: 1, medium: 2, low: 3, lowest: 4,
};
const priorityWeight = (p: string | null | undefined): number =>
  PRIORITY_WEIGHT[(p ?? 'medium').toLowerCase()] ?? 2;

/** Atlaskit DynamicTable `head` definition — shared across every section. */
const HEAD: HeadType = {
  cells: [
    { key: COL.type,     content: 'Type',     isSortable: false, width: 5  },
    { key: COL.key,      content: 'Key',      isSortable: true,  width: 10 },
    { key: COL.summary,  content: 'Summary',  isSortable: true,  width: 25 },
    { key: COL.status,   content: 'Status',   isSortable: true,  width: 10 },
    { key: COL.comments, content: 'Comments', isSortable: false, width: 10 },
    { key: COL.parent,   content: 'Parent',   isSortable: true,  width: 14 },
    { key: COL.assignee, content: 'Assignee', isSortable: true,  width: 12 },
    { key: COL.dueDate,  content: 'Due date', isSortable: true,  width: 8  },
    { key: COL.priority, content: 'Priority', isSortable: true,  width: 8  },
  ],
};

function cmp<T>(a: T, b: T): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function sortRows(rows: BacklogEpic[], key: ColKey, order: SortOrderType): BacklogEpic[] {
  const out = [...rows];
  const dir = order === 'DESC' ? -1 : 1;
  out.sort((a, b) => {
    switch (key) {
      case COL.key:      return dir * cmp(a.epic_key, b.epic_key);
      case COL.summary:  return dir * cmp(a.name, b.name);
      case COL.status:   return dir * cmp(a.status, b.status);
      case COL.parent:   return dir * cmp(a.parent_key, b.parent_key);
      case COL.assignee: return dir * cmp(a.assignee_name, b.assignee_name);
      case COL.dueDate:  return dir * cmp(a.end_date, b.end_date);
      case COL.priority: return dir * (priorityWeight(a.priority) - priorityWeight(b.priority));
      default: return 0;
    }
  });
  return out;
}

interface GroupSectionProps {
  group: BacklogGroup<BacklogEpic>;
  avatarsByName: Map<string, string | null>;
  onRowClick?: (epic: BacklogEpic) => void;
  onEdit?: (epic: BacklogEpic) => void;
  onDelete?: (epic: BacklogEpic) => void;
  sortKey: ColKey;
  sortOrder: SortOrderType;
  onSort: (key: ColKey, order: SortOrderType) => void;
  onEpicPatch?: (id: string, patch: EpicUpdatePatch) => void;
  canEdit?: boolean;
}

function GroupSection({
  group,
  avatarsByName,
  onRowClick,
  onEdit,
  onDelete,
  sortKey,
  sortOrder,
  onSort,
  onEpicPatch,
  canEdit = true,
}: GroupSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  const sorted = sortRows(group.items, sortKey, sortOrder);

  const rows: RowType[] = sorted.map((epic) => {
    const name = epic.assignee_name ?? null;
    const avatarUrl = name ? avatarsByName.get(name.toLowerCase()) ?? null : null;
    return {
      key: epic.id,
      onClick: () => onRowClick?.(epic),
      onKeyPress: (e) => {
        if (e.key === 'Enter') onRowClick?.(epic);
      },
      cells: [
        { key: COL.type,     content: <TypeCell issueType={epic.issue_type ?? 'Epic'} /> },
        { key: COL.key,      content: <KeyCell epic={epic} /> },
        { key: COL.summary,  content: (
          <EditableSummary
            value={epic.name}
            disabled={!canEdit}
            onChange={(next) => onEpicPatch?.(epic.id, { summary: next })}
          />
        ) },
        { key: COL.status,   content: (
          <EditableStatus
            value={epic.status ?? null}
            disabled={!canEdit}
            onChange={(status, category) => onEpicPatch?.(epic.id, { status, status_category: category })}
          />
        ) },
        { key: COL.comments, content: <CommentsCell count={epic.comment_count ?? null} /> },
        { key: COL.parent,   content: <ParentCell parentKey={epic.parent_key ?? null} parentSummary={epic.parent_summary ?? null} /> },
        { key: COL.assignee, content: <AssigneeCell name={name} avatarUrl={avatarUrl} /> },
        { key: COL.dueDate,  content: <DueDateCell value={epic.end_date} status={epic.status ?? null} /> },
        { key: COL.priority, content: (
          <span className="inline-flex items-center justify-between gap-2 w-full">
            <EditablePriority
              value={epic.priority ?? null}
              disabled={!canEdit}
              onChange={(priority) => onEpicPatch?.(epic.id, { priority })}
            />
            <span className="pointer-events-auto hidden items-center gap-1 group-hover:flex" onClick={(e) => e.stopPropagation()}>
              {onEdit && (
                <button
                  type="button"
                  aria-label={`Edit ${epic.epic_key ?? 'epic'}`}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
                  onClick={() => onEdit(epic)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  aria-label={`Delete ${epic.epic_key ?? 'epic'}`}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                  onClick={() => onDelete(epic)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          </span>
        ) },
      ],
    };
  });

  return (
    <div className="group">
      <button
        type="button"
        className="flex w-full cursor-pointer select-none items-center gap-2 border-b bg-muted/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((c) => !c)}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        <span>{group.label}</span>
        <span className="ml-1 inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-semibold text-foreground/80">
          {group.items.length}
        </span>
      </button>

      {!collapsed && (
        <DynamicTable
          head={HEAD}
          rows={rows}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={(data: { key: string; sortOrder: SortOrderType }) => onSort(data.key as ColKey, data.sortOrder)}
          isFixedSize
        />
      )}
    </div>
  );
}

export function EpicBacklogTable({
  groups,
  avatarsByName,
  isLoading,
  error,
  onRowClick,
  onEdit,
  onDelete,
  emptyState,
  projectId,
  canEdit = true,
}: EpicBacklogTableProps) {
  const [sortKey, setSortKey] = useState<ColKey>(COL.key);
  const [sortOrder, setSortOrder] = useState<SortOrderType>('DESC');
  const updateEpic = useUpdateEpic(projectId);

  const handleSort = useCallback((key: ColKey, order: SortOrderType) => {
    setSortKey(key);
    setSortOrder(order);
  }, []);

  const handleEpicPatch = useCallback(
    (id: string, patch: EpicUpdatePatch) => {
      updateEpic.mutate({ id, patch });
    },
    [updateEpic]
  );

  if (error) {
    return (
      <div role="alert" className="flex h-40 items-center justify-center text-sm text-destructive">
        Failed to load epics: {error.message}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <DynamicTable head={HEAD} rows={[]} isLoading loadingSpinnerSize="large" />
      </div>
    );
  }

  const hasAny = groups.some((g) => g.items.length > 0);
  if (!hasAny) {
    return <div className="flex min-h-[200px] items-center justify-center">{emptyState}</div>;
  }

  return (
    <div role="region" aria-label="Epic backlog" className="h-full overflow-auto">
      {groups.map((g) => (
        <Fragment key={g.status}>
          <GroupSection
            group={g}
            avatarsByName={avatarsByName}
            onRowClick={onRowClick}
            onEdit={onEdit}
            onDelete={onDelete}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={handleSort}
            onEpicPatch={handleEpicPatch}
            canEdit={canEdit}
          />
        </Fragment>
      ))}
    </div>
  );
}

export default EpicBacklogTable;
