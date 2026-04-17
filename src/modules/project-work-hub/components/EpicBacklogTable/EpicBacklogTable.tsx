/**
 * EpicBacklogTable — V2 composition of DynamicTable for /project-hub/:key/epic-backlog.
 *
 * Replaces the legacy div-grid in EpicBacklogPage. Wires directly to the
 * existing useEpicBacklog hook + BacklogEpic type + EPIC_STATUS_LOZENGE so
 * there is ZERO domain/data/permissions shift — only the presentation and
 * interaction substrate is upgraded.
 *
 * Parity coverage (vs. the user's Atlaskit spec):
 *   ✔ Sortable columns (aria-sort emitted per header)
 *   ✔ Column visibility menu ("+" header affordance, persisted per user)
 *   ✔ Column resize via drag-to-resize borders (persisted)
 *   ✔ Sticky header aligned under horizontal scroll
 *   ✔ Virtualized row body (auto when ≥60 rows)
 *   ✔ Row select with tri-state header (opt-in, off by default until bulk
 *     actions are wired — regression-safe)
 *   ✔ Grouped rows (by STATUS) with collapsible headers
 *   ✔ Tooltip on truncated summary
 *   ✔ Row hover affordances (Pencil/Trash, opacity-0 → 1 on hover)
 *   ✔ Click row → opens CatalystDetailRouter drawer (same wiring as V1)
 *   ✔ Empty / loading / error states
 *   ✔ Keyboard: Enter opens row; ↑/↓ via tab order; Space toggles group
 */
import { useCallback, useMemo } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { DynamicTable, type DynamicTableColumn, type DynamicTableRowGroup } from '@/components/shared/dynamic-table';
import { useTablePersistence } from '@/components/shared/dynamic-table/useTablePersistence';
import type { BacklogEpic, BacklogGroup } from '../../types/backlog.types';
import { AssigneeCell, DateCell, DueDateCell, KeyCell, StatusLozengeCell, SummaryCell } from './cells';

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
  key: 'key',
  summary: 'summary',
  status: 'status',
  assignee: 'assignee',
  created: 'created',
  updated: 'updated',
  dueDate: 'dueDate',
} as const;

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

  // ─── Column model ───────────────────────────────────────────────────
  const columns = useMemo<DynamicTableColumn<BacklogEpic>[]>(
    () => [
      {
        id: COLUMN_IDS.key,
        accessorKey: 'epic_key',
        header: 'Key',
        label: 'Key',
        size: 138,
        minSize: 110,
        alwaysVisible: true,
        cell: ({ row }) => <KeyCell epic={row.original} />,
      },
      {
        id: COLUMN_IDS.summary,
        accessorKey: 'name',
        header: 'Summary',
        label: 'Summary',
        size: 420,
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
        id: COLUMN_IDS.created,
        accessorKey: 'jira_created_at',
        header: 'Created',
        label: 'Created',
        size: 108,
        minSize: 88,
        cell: ({ row }) => <DateCell value={row.original.jira_created_at} />,
        sortingFn: 'datetime',
      },
      {
        id: COLUMN_IDS.updated,
        accessorKey: 'jira_updated_at',
        header: 'Updated',
        label: 'Updated',
        size: 108,
        minSize: 88,
        cell: ({ row }) => <DateCell value={row.original.jira_updated_at} />,
        sortingFn: 'datetime',
      },
      {
        id: COLUMN_IDS.dueDate,
        accessorKey: 'end_date',
        header: 'Due date',
        label: 'Due date',
        size: 108,
        minSize: 88,
        cell: ({ row }) => <DueDateCell value={row.original.end_date} status={row.original.status ?? null} />,
        sortingFn: 'datetime',
      },
    ],
    [avatarsByName]
  );

  // ─── Map BacklogGroup → DynamicTableRowGroup ────────────────────────
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

  const renderRowActions = useMemo(
    () => {
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
    },
    [onEdit, onDelete]
  );

  return (
    <DynamicTable<BacklogEpic>
      tableId={TABLE_ID}
      ariaLabel="Epic backlog"
      columns={columns}
      groups={dtGroups}
      getRowId={getRowId}
      onRowClick={onRowClick}
      renderRowActions={renderRowActions}
      sortable
      resizable
      columnVisibility={visibility}
      onColumnVisibilityChange={onVisibilityChange}
      columnSizing={sizing}
      onColumnSizingChange={onSizingChange}
      rowHeight={50}
      minTableWidth={1200}
      stickyHeader
      isLoading={isLoading}
      error={error ?? null}
      emptyState={emptyState}
    />
  );
}

export default EpicBacklogTable;
