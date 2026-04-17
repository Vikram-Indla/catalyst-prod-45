/**
 * EpicBacklogTable — Jira "List" view (image-2) parity composition.
 *
 * Columns (left → right):
 *   ☐ select  ·  Type  ·  Key ↓  ·  Summary  ·  Status  ·  Comments  ·
 *   Parent  ·  Assignee  ·  Due date  ·  Priority  ·  + column menu
 *
 * Every column is sortable (except select, Type-icon, Comments).
 * Default sort: Key descending, matching the Jira reference UI.
 */
import { useCallback, useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { SortingState } from '@tanstack/react-table';
import { DynamicTable, type DynamicTableColumn, type DynamicTableRowGroup } from '@/components/shared/dynamic-table';
import { useTablePersistence } from '@/components/shared/dynamic-table/useTablePersistence';
import type { BacklogEpic, BacklogGroup } from '../../types/backlog.types';
import {
  AssigneeCell,
  CommentsCell,
  DueDateCell,
  KeyCell,
  ParentCell,
  PriorityCell,
  StatusLozengeCell,
  SummaryCell,
  TypeCell,
} from './cells';

export interface EpicBacklogTableProps {
  groups: BacklogGroup<BacklogEpic>[];
  avatarsByName: Map<string, string | null>;
  isLoading?: boolean;
  error?: Error | null;
  onRowClick?: (epic: BacklogEpic) => void;
  onEdit?: (epic: BacklogEpic) => void;
  onDelete?: (epic: BacklogEpic) => void;
  emptyState?: React.ReactNode;
}

const TABLE_ID = 'project-hub/epic-backlog';

const COLUMN_IDS = {
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

// ─── Priority sort weight (highest → lowest) ────────────────────────────
const PRIORITY_WEIGHT: Record<string, number> = {
  highest: 0,
  high: 1,
  medium: 2,
  low: 3,
  lowest: 4,
};

function priorityWeight(p: string | null | undefined): number {
  return PRIORITY_WEIGHT[(p ?? 'medium').toLowerCase()] ?? 2;
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
}: EpicBacklogTableProps) {
  const { visibility, onVisibilityChange, sizing, onSizingChange } = useTablePersistence(TABLE_ID, {
    visibility: {},
    sizing: {},
  });

  // Default sort: Key desc (matches Jira "List" view reference).
  const [sorting, setSorting] = useState<SortingState>([{ id: COLUMN_IDS.key, desc: true }]);

  const columns = useMemo<DynamicTableColumn<BacklogEpic>[]>(
    () => [
      {
        id: COLUMN_IDS.type,
        header: 'Type',
        label: 'Type',
        size: 54,
        minSize: 48,
        maxSize: 60,
        align: 'center',
        disableSort: true,
        disableResize: true,
        cell: ({ row }) => <TypeCell issueType={row.original.issue_type ?? 'Epic'} />,
      },
      {
        id: COLUMN_IDS.key,
        accessorKey: 'epic_key',
        header: 'Key',
        label: 'Key',
        size: 120,
        minSize: 100,
        alwaysVisible: true,
        cell: ({ row }) => <KeyCell epic={row.original} />,
      },
      {
        id: COLUMN_IDS.summary,
        accessorKey: 'name',
        header: 'Summary',
        label: 'Summary',
        size: 360,
        minSize: 220,
        alwaysVisible: true,
        cell: ({ row }) => <SummaryCell epic={row.original} />,
      },
      {
        id: COLUMN_IDS.status,
        accessorKey: 'status',
        header: 'Status',
        label: 'Status',
        size: 148,
        minSize: 110,
        cell: ({ row }) => <StatusLozengeCell status={row.original.status ?? null} />,
      },
      {
        id: COLUMN_IDS.comments,
        header: 'Comments',
        label: 'Comments',
        size: 132,
        minSize: 110,
        disableSort: true,
        cell: ({ row }) => <CommentsCell count={row.original.comment_count ?? null} />,
      },
      {
        id: COLUMN_IDS.parent,
        accessorKey: 'parent_key',
        header: 'Parent',
        label: 'Parent',
        size: 200,
        minSize: 140,
        cell: ({ row }) => (
          <ParentCell
            parentKey={row.original.parent_key ?? null}
            parentSummary={row.original.parent_summary ?? null}
          />
        ),
      },
      {
        id: COLUMN_IDS.assignee,
        accessorKey: 'assignee_name',
        header: 'Assignee',
        label: 'Assignee',
        size: 180,
        minSize: 120,
        cell: ({ row }) => {
          const name = row.original.assignee_name ?? null;
          const avatarUrl = name ? avatarsByName.get(name.toLowerCase()) ?? null : null;
          return <AssigneeCell name={name} avatarUrl={avatarUrl} />;
        },
      },
      {
        id: COLUMN_IDS.dueDate,
        accessorKey: 'end_date',
        header: 'Due date',
        label: 'Due date',
        size: 112,
        minSize: 96,
        cell: ({ row }) => <DueDateCell value={row.original.end_date} status={row.original.status ?? null} />,
        sortingFn: 'datetime',
      },
      {
        id: COLUMN_IDS.priority,
        accessorKey: 'priority',
        header: 'Priority',
        label: 'Priority',
        size: 120,
        minSize: 96,
        cell: ({ row }) => <PriorityCell priority={row.original.priority ?? null} />,
        sortingFn: (a, b) => priorityWeight(a.original.priority) - priorityWeight(b.original.priority),
      },
    ],
    [avatarsByName]
  );

  const dtGroups = useMemo<DynamicTableRowGroup<BacklogEpic>[]>(
    () =>
      groups.map((g) => ({
        id: g.status,
        label: g.label,
        rows: g.items,
      })),
    [groups]
  );

  const getRowId = useCallback((epic: BacklogEpic) => epic.id, []);

  const renderRowActions = useMemo(() => {
    if (!onEdit && !onDelete) return undefined;
    return (epic: BacklogEpic) => (
      <>
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
      </>
    );
  }, [onEdit, onDelete]);

  return (
    <DynamicTable<BacklogEpic>
      tableId={TABLE_ID}
      ariaLabel="Epic backlog"
      columns={columns}
      groups={dtGroups}
      getRowId={getRowId}
      onRowClick={onRowClick}
      renderRowActions={renderRowActions}
      selectable
      sortable
      sorting={sorting}
      onSortingChange={setSorting}
      resizable
      columnVisibility={visibility}
      onColumnVisibilityChange={onVisibilityChange}
      columnSizing={sizing}
      onColumnSizingChange={onSizingChange}
      rowHeight={44}
      minTableWidth={1460}
      stickyHeader
      isLoading={isLoading}
      error={error ?? null}
      emptyState={emptyState}
    />
  );
}

export default EpicBacklogTable;
