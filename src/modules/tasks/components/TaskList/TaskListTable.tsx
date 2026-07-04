/**
 * Task List Table - Planner V9
 * Main table component with sorting, selection, keyboard nav
 * Migrated to canonical JiraTable (CAT-CANON-JIRATABLE) — preserves every
 * column, sort field, group-by, selection, and row-action behavior from the
 * hand-rolled <table> implementation.
 */

import { useMemo, useState } from 'react';
import { Lock, MoreHorizontal, ExternalLink, Copy, Trash2 } from '@/lib/atlaskit-icons';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column, RowGroup } from '@/components/shared/JiraTable/types';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { getWorkstreamColor } from '@/lib/workstream-colors';
import { PRIORITY_CONFIG } from '../../types';
import { useTaskListKeyboard } from '../../hooks/useTaskListKeyboard';
import type { TaskListTask, TaskListSorting } from '../../hooks/useTaskList';
import type { GroupByOption } from '../../types';
import { format } from 'date-fns';
import { catalystToast } from '@/lib/catalystToast';

interface TaskListTableProps {
  tasks: TaskListTask[];
  isLoading: boolean;
  sorting: TaskListSorting;
  onSortChange: (sorting: TaskListSorting) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onTaskClick: (task: TaskListTask) => void;
  onTaskDelete: (id: string) => void;
  visibleColumns: Set<string>;
  groupBy: GroupByOption | 'none';
}

type SortField = 'task_key' | 'title' | 'status_name' | 'priority' | 'workstream_name' | 'assignee_name' | 'due_date' | 'progress';

interface ColumnDef {
  id: string;
  label: string;
  field: SortField;
  width: number;
}

const COLUMNS: ColumnDef[] = [
  { id: 'key', label: 'ID', field: 'task_key', width: 8 },
  { id: 'title', label: 'Title', field: 'title', width: 28 },
  { id: 'status', label: 'Status', field: 'status_name', width: 12 },
  { id: 'priority', label: 'Priority', field: 'priority', width: 10 },
  { id: 'workstream', label: 'Workstream', field: 'workstream_name', width: 14 },
  { id: 'assignee', label: 'Assignee', field: 'assignee_name', width: 13 },
  { id: 'dueDate', label: 'Due Date', field: 'due_date', width: 10 },
  { id: 'progress', label: 'Progress', field: 'progress', width: 10 },
];

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  return format(new Date(dateStr), 'MMM d');
}

function getDueDateBackground(task: TaskListTask) {
  if (!task.due_date) return null;
  if (task.is_overdue) return 'var(--ds-background-danger)';
  if (task.is_due_today) return 'var(--ds-background-warning)';
  if (task.is_due_soon) return 'var(--ds-background-information)';
  return null;
}

function getDueDateTextColor(task: TaskListTask) {
  if (!task.due_date) return 'var(--ds-text-subtlest)';
  if (task.is_overdue) return 'var(--ds-text-danger)';
  if (task.is_due_today) return 'var(--ds-text-warning)';
  if (task.is_due_soon) return 'var(--ds-text-information)';
  return 'var(--ds-text-subtle)';
}

export function TaskListTable({
  tasks,
  isLoading,
  sorting,
  onSortChange,
  selectedIds,
  onSelectionChange,
  onTaskClick,
  onTaskDelete,
  visibleColumns,
  groupBy,
}: TaskListTableProps) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Keyboard navigation
  useTaskListKeyboard({
    tasks,
    focusedIndex,
    setFocusedIndex,
    selectedIds,
    onSelectionChange,
    onOpenTask: onTaskClick,
    enabled: true,
  });

  const handleCopyKey = (task: TaskListTask) => {
    navigator.clipboard.writeText(task.task_key);
    catalystToast.success(`Copied ${task.task_key}`);
  };

  // Group tasks if needed — mirrors the previous groupBy switch exactly.
  const groups: RowGroup<TaskListTask>[] | undefined = useMemo(() => {
    if (groupBy === 'none') return undefined;

    const buckets: Record<string, TaskListTask[]> = {};

    tasks.forEach(task => {
      let groupKey: string;

      switch (groupBy) {
        case 'status':
          groupKey = task.status_name || 'No Status';
          break;
        case 'priority':
          groupKey = task.priority || 'No Priority';
          break;
        case 'assignee':
          groupKey = task.assignee_name || 'Unassigned';
          break;
        default:
          groupKey = 'Other';
      }

      if (!buckets[groupKey]) buckets[groupKey] = [];
      buckets[groupKey].push(task);
    });

    return Object.entries(buckets).map(([key, groupTasks]) => ({
      id: key,
      label: key,
      rows: groupTasks,
      isCollapsed: collapsedGroups.has(key),
    }));
  }, [tasks, groupBy, collapsedGroups]);

  const handleToggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const visibleColumnDefs = COLUMNS.filter(col => visibleColumns.has(col.id));

  const columns: Column<TaskListTask>[] = useMemo(() => {
    const cols: Column<TaskListTask>[] = [];

    for (const col of visibleColumnDefs) {
      switch (col.id) {
        case 'key':
          cols.push({
            id: col.id,
            label: col.label,
            width: col.width,
            sortable: true,
            alwaysVisible: true,
            accessor: (row) => row.task_key,
            cell: ({ row }) => (
              <span
                style={{
                  fontFamily: 'var(--ds-font-family-code, monospace)',
                  fontSize: 'var(--ds-font-size-075, 11px)',
                  fontWeight: 600,
                  color: 'var(--ds-text-brand)',
                }}
              >
                {row.task_key}
              </span>
            ),
          });
          break;
        case 'title':
          cols.push({
            id: col.id,
            label: col.label,
            flex: true,
            sortable: true,
            alwaysVisible: true,
            accessor: (row) => row.title,
            cell: ({ row }) => (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                {row.blocked && (
                  <Lock
                    style={{ width: 14, height: 14, flexShrink: 0, color: 'var(--ds-icon-danger)' }}
                  />
                )}
                <span
                  style={{
                    fontWeight: 500,
                    color: 'var(--ds-text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.title}
                </span>
              </span>
            ),
          });
          break;
        case 'status':
          cols.push({
            id: col.id,
            label: col.label,
            width: col.width,
            sortable: true,
            accessor: (row) => row.status_name,
            cell: ({ row }) => (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 'var(--ds-border-radius, 3px)',
                  border: `1px solid ${row.status_color ? `${row.status_color}40` : 'var(--ds-border)'}`,
                  fontSize: 'var(--ds-font-size-075, 11px)',
                  fontWeight: 600,
                  color: row.status_color || 'var(--ds-text-subtlest)',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: row.status_color || 'var(--ds-text-subtlest)',
                  }}
                />
                {row.status_name || 'Unknown'}
              </span>
            ),
          });
          break;
        case 'priority':
          cols.push({
            id: col.id,
            label: col.label,
            width: col.width,
            sortable: true,
            accessor: (row) => row.priority,
            cell: ({ row }) => {
              const priorityConfig = PRIORITY_CONFIG[row.priority] || PRIORITY_CONFIG.medium;
              return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--ds-font-size-075, 11px)', fontWeight: 500 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: priorityConfig.color,
                    }}
                  />
                  <span style={{ color: priorityConfig.color }}>{priorityConfig.label}</span>
                </span>
              );
            },
          });
          break;
        case 'workstream':
          cols.push({
            id: col.id,
            label: col.label,
            width: col.width,
            sortable: true,
            accessor: (row) => row.workstream_name,
            cell: ({ row }) => {
              if (!row.workstream_name) {
                return <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
              }
              const workstreamColors = getWorkstreamColor(row.workstream_name);
              return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--ds-font-size-075, 11px)', fontWeight: 500 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: workstreamColors.hex,
                    }}
                  />
                  <span style={{ color: workstreamColors.hex }}>{row.workstream_name}</span>
                </span>
              );
            },
          });
          break;
        case 'assignee':
          cols.push({
            id: col.id,
            label: col.label,
            width: col.width,
            sortable: true,
            accessor: (row) => row.assignee_name,
            cell: ({ row }) => {
              if (!row.assignee_name) {
                return <span style={{ color: 'var(--ds-text-subtlest)' }}>Unassigned</span>;
              }
              return (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                  <CatalystAvatar name={row.assignee_name} src={row.assignee_avatar} size="xsmall" appearance="circle" />
                  <span
                    style={{
                      color: 'var(--ds-text-subtle)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.assignee_name}
                  </span>
                </span>
              );
            },
          });
          break;
        case 'dueDate':
          cols.push({
            id: col.id,
            label: col.label,
            width: col.width,
            sortable: true,
            accessor: (row) => row.due_date,
            cell: ({ row }) => {
              if (!row.due_date) {
                return <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
              }
              const bg = getDueDateBackground(row);
              return (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: 'var(--ds-font-size-075, 11px)',
                    fontWeight: 600,
                    padding: '4px 8px',
                    borderRadius: 'var(--ds-border-radius, 3px)',
                    backgroundColor: bg ?? 'transparent',
                    color: getDueDateTextColor(row),
                  }}
                >
                  {formatDate(row.due_date)}
                </span>
              );
            },
          });
          break;
        case 'progress':
          cols.push({
            id: col.id,
            label: col.label,
            width: col.width,
            sortable: true,
            accessor: (row) => row.progress,
            cell: ({ row }) => (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 999,
                    overflow: 'hidden',
                    backgroundColor: 'var(--ds-background-neutral)',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      height: '100%',
                      borderRadius: 999,
                      width: `${row.progress}%`,
                      backgroundColor: row.progress >= 50 ? 'var(--ds-text-success)' : 'var(--ds-text-subtlest)',
                    }}
                  />
                </span>
                <span style={{ fontSize: 'var(--ds-font-size-075, 11px)', fontWeight: 500, color: 'var(--ds-text-subtle)', width: 32, textAlign: 'right' }}>
                  {row.progress}%
                </span>
              </span>
            ),
          });
          break;
      }
    }

    return cols;
  }, [visibleColumnDefs]);

  const sortKey = sorting.field;
  const sortOrder = sorting.direction === 'asc' ? 'ASC' : 'DESC';

  const handleSortChange = (key: string, order: 'ASC' | 'DESC') => {
    onSortChange({ field: key as SortField, direction: order === 'ASC' ? 'asc' : 'desc' });
  };

  const contextMenuActions = visibleColumns.has('actions')
    ? [
        {
          id: 'open',
          label: 'Open',
          icon: <ExternalLink style={{ width: 16, height: 16 }} />,
          onClick: (row: TaskListTask) => onTaskClick(row),
        },
        {
          id: 'copy-id',
          label: 'Copy ID',
          icon: <Copy style={{ width: 16, height: 16 }} />,
          onClick: (row: TaskListTask) => handleCopyKey(row),
        },
        {
          id: 'delete',
          label: 'Delete',
          icon: <Trash2 style={{ width: 16, height: 16 }} />,
          danger: true,
          onClick: (row: TaskListTask) => onTaskDelete(row.id),
        },
      ]
    : undefined;

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <JiraTable<TaskListTask>
        columns={columns}
        data={tasks}
        groups={groups}
        collapsedGroups={collapsedGroups}
        onToggleGroup={groupBy !== 'none' ? handleToggleGroup : undefined}
        getRowId={(row) => row.id}
        onRowClick={onTaskClick}
        selectable
        selection={selectedIds}
        onSelectionChange={onSelectionChange}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        showRowCount={false}
        density="compact"
        ariaLabel="Task list"
        isLoading={isLoading}
        contextMenuActions={contextMenuActions}
        focusedRowId={focusedIndex >= 0 && tasks[focusedIndex] ? tasks[focusedIndex].id : undefined}
        emptyView={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 0' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: 'var(--ds-background-neutral)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <MoreHorizontal style={{ width: 32, height: 32, color: 'var(--ds-icon-subtle)' }} />
            </div>
            <h3 style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: 'var(--ds-text)', marginBottom: 4 }}>
              No tasks found
            </h3>
            <p style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>
              Try adjusting your filters or create a new task
            </p>
          </div>
        }
      />
    </div>
  );
}
