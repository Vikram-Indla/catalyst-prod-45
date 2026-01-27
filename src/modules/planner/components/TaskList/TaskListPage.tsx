/**
 * Task List Page - Planner V9
 * Main page component orchestrating all task list features
 * Reads URL params for filtering from dashboard CTAs
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TaskListHeader } from './TaskListHeader';
import { TaskListToolbar } from './TaskListToolbar';
import { TaskListTable } from './TaskListTable';
import { BulkActionBar } from '../task-list/BulkActionBar';
import { useTaskList, useTaskListStats } from '../../hooks/useTaskList';
import type { TaskListFilters, TaskListSorting, TaskListTask } from '../../hooks/useTaskList';
import type { GroupByOption } from '../../types';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TaskListPageProps {
  onTaskClick: (task: TaskListTask) => void;
  onCreateTask: () => void;
}

const DEFAULT_COLUMNS = new Set([
  'key', 'title', 'status', 'priority', 'workstream', 'assignee', 'dueDate', 'progress', 'actions'
]);

export function TaskListPage({ onTaskClick, onCreateTask }: TaskListPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse initial filters from URL
  const getInitialFilters = useCallback((): TaskListFilters => {
    const filters: TaskListFilters = {};
    
    const workstream = searchParams.get('workstream');
    const status = searchParams.get('status');
    const assignee = searchParams.get('assignee');
    const filter = searchParams.get('filter');
    const search = searchParams.get('search');
    
    if (workstream) filters.workstream = workstream;
    if (status) filters.status = status;
    if (assignee && assignee !== 'unassigned') filters.assignee = assignee;
    if (search) filters.search = search;
    
    // Special filters
    if (filter === 'overdue') filters.overdueOnly = true;
    if (filter === 'blocked') filters.blockedOnly = true;
    if (assignee === 'unassigned') {
      // Unassigned filter - assignee is null
      filters.assignee = null;
    }
    
    return filters;
  }, [searchParams]);

  // Filter state - initialized from URL
  const [filters, setFilters] = useState<TaskListFilters>(getInitialFilters);
  const [sorting, setSorting] = useState<TaskListSorting>({ field: 'priority', direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(DEFAULT_COLUMNS);
  const [groupBy, setGroupBy] = useState<GroupByOption | 'none'>('none');

  // Sync URL params to filter state when URL changes
  useEffect(() => {
    setFilters(getInitialFilters());
  }, [searchParams, getInitialFilters]);

  // Data fetching
  const { data: tasks = [], isLoading } = useTaskList(filters, sorting);
  const { data: stats } = useTaskListStats(filters.workstream, filters.assignee);

  // Handlers
  const handleSearch = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, search: query || undefined }));
  }, []);

  const handleFiltersChange = useCallback((newFilters: TaskListFilters) => {
    setFilters(newFilters);
  }, []);

  const handleSelectionChange = useCallback((ids: Set<string>) => {
    setSelectedIds(ids);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleTaskDelete = useCallback((id: string) => {
    // This will be handled by the drawer or a confirmation dialog
    toast.info('Delete action triggered');
  }, []);

  const handleExport = useCallback(() => {
    if (tasks.length === 0) {
      toast.error('No tasks to export');
      return;
    }

    const headers = [
      'ID', 'Title', 'Status', 'Priority', 'Workstream', 'Assignee', 
      'Due Date', 'Start Date', 'Progress', 'Blocked', 'Created At'
    ];

    const rows = tasks.map(task => [
      task.task_key,
      `"${task.title.replace(/"/g, '""')}"`,
      task.status_name || '',
      task.priority,
      task.workstream_name || '',
      task.assignee_name || '',
      task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : '',
      task.start_date ? format(new Date(task.start_date), 'yyyy-MM-dd') : '',
      task.progress,
      task.blocked ? 'Yes' : 'No',
      format(new Date(task.created_at), 'yyyy-MM-dd HH:mm'),
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `planner-tasks-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${tasks.length} tasks`);
  }, [tasks]);

  // Stats
  const totalCount = stats?.total_count || tasks.length;
  const overdueCount = stats?.overdue_count || 0;
  const inProgressCount = stats?.in_progress_count || 0;
  const doneCount = stats?.done_count || 0;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* Header with stats */}
      <TaskListHeader
        totalCount={totalCount}
        overdueCount={overdueCount}
        inProgressCount={inProgressCount}
        doneCount={doneCount}
        isLoading={isLoading}
      />

      {/* Toolbar with search, filters, actions */}
      <TaskListToolbar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onSearch={handleSearch}
        onCreateTask={onCreateTask}
        onExport={handleExport}
        visibleColumns={visibleColumns}
        onColumnsChange={setVisibleColumns}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        filteredCount={tasks.length}
        totalCount={totalCount}
      />

      {/* Table */}
      <TaskListTable
        tasks={tasks}
        isLoading={isLoading}
        sorting={sorting}
        onSortChange={setSorting}
        selectedIds={selectedIds}
        onSelectionChange={handleSelectionChange}
        onTaskClick={onTaskClick}
        onTaskDelete={handleTaskDelete}
        visibleColumns={visibleColumns}
        groupBy={groupBy}
      />

      {/* Bulk Actions Bar */}
      <BulkActionBar
        selectedIds={Array.from(selectedIds)}
        selectedCount={selectedIds.size}
        onClearSelection={handleClearSelection}
      />
    </div>
  );
}
