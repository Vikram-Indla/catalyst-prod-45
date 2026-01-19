// ============================================================
// ENHANCED TASK LIST PAGE - Admin Panel Version
// Features: Inline editing, bulk actions, real-time subscriptions
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Download, RefreshCw, Filter, Columns3, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

import { usePlannerTasks, useUpdatePlannerTask, useDeletePlannerTask } from '../hooks/usePlannerTasks';
import { usePlannerRealtime } from '../hooks/usePlannerRealtime';
import { useTaskSelection } from '../hooks/useTaskSelection';
import { useBulkUpdateTasks } from '../hooks/useBulkUpdateTasks';
import { useBulkDeleteTasks } from '../hooks/useBulkDeleteTasks';

import {
  InlineProgressEditor,
  InlineTitleEditor,
  InlineDatePicker,
  InlineStatusSelect,
  InlinePrioritySelect,
  InlineAssigneeSelect,
  RowActions,
  BulkActionBar,
} from '../components/task-list';

import type { PlannerTask, TaskStatus, TaskPriority } from '../types';
import { PRIORITY_CONFIG, COLUMN_CONFIG } from '../types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Column definitions
const AVAILABLE_COLUMNS = [
  { id: 'select', label: 'Select', locked: true },
  { id: 'key', label: 'Key', locked: false },
  { id: 'title', label: 'Title', locked: true },
  { id: 'status', label: 'Status', locked: false },
  { id: 'priority', label: 'Priority', locked: false },
  { id: 'assignee', label: 'Assignee', locked: false },
  { id: 'team', label: 'Team', locked: false },
  { id: 'dueDate', label: 'Due Date', locked: false },
  { id: 'progress', label: 'Progress', locked: false },
  { id: 'actions', label: 'Actions', locked: true },
];

export default function TaskListPage() {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(['select', 'key', 'title', 'status', 'priority', 'assignee', 'dueDate', 'progress', 'actions'])
  );

  // Data hooks
  const { data: tasks = [], isLoading, refetch } = usePlannerTasks(null);
  const updateTask = useUpdatePlannerTask();
  const deleteTask = useDeletePlannerTask();
  const bulkUpdate = useBulkUpdateTasks();
  const bulkDelete = useBulkDeleteTasks();

  // Selection hook
  const {
    selectedIds,
    selectedCount,
    isSelected,
    toggleSelect,
    selectAll,
    clearSelection,
  } = useTaskSelection();

  // Realtime subscription
  usePlannerRealtime(null);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const query = searchQuery.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.key.toLowerCase().includes(query) ||
        t.assigneeName?.toLowerCase().includes(query) ||
        t.teamName?.toLowerCase().includes(query)
    );
  }, [tasks, searchQuery]);

  // Column visibility toggle
  const toggleColumn = useCallback((columnId: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  }, []);

  // Handlers
  const handleTaskUpdate = useCallback(
    (taskId: string, updates: Partial<PlannerTask>) => {
      updateTask.mutate({ id: taskId, updates });
    },
    [updateTask]
  );

  const handleTaskDelete = useCallback(
    (taskId: string) => {
      deleteTask.mutate(taskId, {
        onSuccess: () => {
          toast.success('Task deleted');
        },
      });
    },
    [deleteTask]
  );

  const handleDuplicate = useCallback((task: PlannerTask) => {
    toast.info('Duplicate functionality coming soon');
  }, []);

  const handleEdit = useCallback((task: PlannerTask) => {
    // Could open a drawer/modal here
    toast.info(`Edit ${task.key}`);
  }, []);

  // Bulk action handlers
  const handleBulkStatusChange = useCallback(
    (statusId: string) => {
      bulkUpdate.mutate({
        taskIds: selectedIds,
        updates: { status_id: statusId },
      });
      clearSelection();
    },
    [selectedIds, bulkUpdate, clearSelection]
  );

  const handleBulkAssigneeChange = useCallback(
    (assigneeId: string | null) => {
      bulkUpdate.mutate({
        taskIds: selectedIds,
        updates: { assignee_id: assigneeId },
      });
      clearSelection();
    },
    [selectedIds, bulkUpdate, clearSelection]
  );

  const handleBulkPriorityChange = useCallback(
    (priority: TaskPriority) => {
      bulkUpdate.mutate({
        taskIds: selectedIds,
        updates: { priority },
      });
      clearSelection();
    },
    [selectedIds, bulkUpdate, clearSelection]
  );

  const handleBulkDelete = useCallback(() => {
    bulkDelete.mutate(selectedIds, {
      onSuccess: () => {
        clearSelection();
      },
    });
  }, [selectedIds, bulkDelete, clearSelection]);

  // Select all visible
  const handleSelectAll = useCallback(() => {
    if (selectedCount === filteredTasks.length) {
      clearSelection();
    } else {
      selectAll(filteredTasks.map((t) => t.id));
    }
  }, [filteredTasks, selectedCount, selectAll, clearSelection]);

  const allSelected = selectedCount === filteredTasks.length && filteredTasks.length > 0;
  const someSelected = selectedCount > 0 && selectedCount < filteredTasks.length;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Task List</h1>
            <p className="text-sm text-muted-foreground">
              {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Task
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3 className="h-4 w-4 mr-1" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {AVAILABLE_COLUMNS.filter((c) => !c.locked).map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={visibleColumns.has(column.id)}
                  onCheckedChange={() => toggleColumn(column.id)}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              {visibleColumns.has('select') && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    // Use string for indeterminate since shadcn expects it
                    {...(someSelected ? { 'data-state': 'indeterminate' } : {})}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              {visibleColumns.has('key') && <TableHead className="w-24">Key</TableHead>}
              {visibleColumns.has('title') && <TableHead className="min-w-[200px]">Title</TableHead>}
              {visibleColumns.has('status') && <TableHead className="w-32">Status</TableHead>}
              {visibleColumns.has('priority') && <TableHead className="w-28">Priority</TableHead>}
              {visibleColumns.has('assignee') && <TableHead className="w-40">Assignee</TableHead>}
              {visibleColumns.has('team') && <TableHead className="w-32">Team</TableHead>}
              {visibleColumns.has('dueDate') && <TableHead className="w-32">Due Date</TableHead>}
              {visibleColumns.has('progress') && <TableHead className="w-28">Progress</TableHead>}
              {visibleColumns.has('actions') && <TableHead className="w-20"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.map((task) => (
              <TableRow
                key={task.id}
                className={cn(
                  'group',
                  isSelected(task.id) && 'bg-accent/50'
                )}
              >
                {visibleColumns.has('select') && (
                  <TableCell>
                    <Checkbox
                      checked={isSelected(task.id)}
                      onCheckedChange={() => toggleSelect(task.id)}
                    />
                  </TableCell>
                )}
                {visibleColumns.has('key') && (
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {task.key}
                    </Badge>
                  </TableCell>
                )}
                {visibleColumns.has('title') && (
                  <TableCell>
                    <InlineTitleEditor
                      value={task.title}
                      onChange={(title) => handleTaskUpdate(task.id, { title })}
                    />
                  </TableCell>
                )}
                {visibleColumns.has('status') && (
                  <TableCell>
                    <InlineStatusSelect
                      value={null}
                      status={{ id: task.status, name: task.status, color: COLUMN_CONFIG.find(c => c.id === task.status)?.color }}
                      onChange={(statusId) => {
                        // Map statusId back to TaskStatus
                        const statusMap: Record<string, TaskStatus> = {
                          'backlog': 'backlog',
                          'planned': 'planned',
                          'in-progress': 'in-progress',
                          'review': 'review',
                          'done': 'done',
                        };
                        if (statusMap[statusId]) {
                          handleTaskUpdate(task.id, { status: statusMap[statusId] });
                        }
                      }}
                    />
                  </TableCell>
                )}
                {visibleColumns.has('priority') && (
                  <TableCell>
                    <InlinePrioritySelect
                      value={task.priority}
                      onChange={(priority) => handleTaskUpdate(task.id, { priority })}
                    />
                  </TableCell>
                )}
                {visibleColumns.has('assignee') && (
                  <TableCell>
                    <InlineAssigneeSelect
                      value={task.assigneeId || null}
                      onChange={(assigneeId) =>
                        handleTaskUpdate(task.id, { assigneeId: assigneeId || undefined })
                      }
                    />
                  </TableCell>
                )}
                {visibleColumns.has('team') && (
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {task.teamName || '—'}
                    </span>
                  </TableCell>
                )}
                {visibleColumns.has('dueDate') && (
                  <TableCell>
                    <InlineDatePicker
                      value={task.dueDate || null}
                      onChange={(dueDate) => handleTaskUpdate(task.id, { dueDate })}
                    />
                  </TableCell>
                )}
                {visibleColumns.has('progress') && (
                  <TableCell>
                    <InlineProgressEditor
                      value={task.progress}
                      onChange={(progress) => handleTaskUpdate(task.id, { progress })}
                    />
                  </TableCell>
                )}
                {visibleColumns.has('actions') && (
                  <TableCell>
                    <RowActions
                      taskId={task.id}
                      onEdit={() => handleEdit(task)}
                      onDuplicate={() => handleDuplicate(task)}
                      onDelete={() => handleTaskDelete(task.id)}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
            {filteredTasks.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={AVAILABLE_COLUMNS.filter((c) => visibleColumns.has(c.id)).length}
                  className="h-32 text-center text-muted-foreground"
                >
                  No tasks found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Bulk Action Bar */}
      {selectedCount > 0 && (
        <BulkActionBar
          selectedIds={selectedIds}
          selectedCount={selectedCount}
          onClearSelection={clearSelection}
        />
      )}
    </div>
  );
}
