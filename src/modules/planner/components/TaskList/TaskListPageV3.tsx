/**
 * Task List Page V3 - Ring-fenced Design System
 * Full implementation with inline editing, column resizing, real-time updates
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Download, 
  Columns3, 
  Filter, 
  Layers,
  AlertCircle,
  PlayCircle,
  CheckCircle2,
  List,
  X,
  ChevronDown,
  RefreshCw,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { useTaskList, useTaskListStats } from '../../hooks/useTaskList';
import { usePlannerUsers } from '../../hooks/usePlannerUsers';
import { usePlannerWorkstreams } from '../../hooks/usePlannerWorkstreams';
import { useKanbanStatuses } from '../../hooks/useKanbanStatuses';
import { usePlannerRealtime } from '../../hooks/usePlannerRealtime';
import { useUpdatePlannerTask } from '../../hooks/usePlannerTasks';
import { useTaskLabelsMap } from '../../hooks/useTaskLabelsMap';
import { useTaskLabelsRealtime } from '../../hooks/useTaskLabelsRealtime';
import { TaskListRowV3 } from './TaskListRowV3';
import { BulkActionBar } from '../task-list/BulkActionBar';
import { LabelsFilter } from '@/components/planner/shared/LabelsFilter';
import { PRIORITY_CONFIG } from '../../types';
import type { TaskListFilters, TaskListSorting, TaskListTask } from '../../hooks/useTaskList';
import type { TaskPriority, GroupByOption } from '../../types';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Import ring-fenced styles
import '../../styles/task-list.css';

interface TaskListPageV3Props {
  onTaskClick: (task: TaskListTask) => void;
  onCreateTask: () => void;
}

const DEFAULT_COLUMNS = new Set([
  'key', 'title', 'status', 'priority', 'workstream', 'labels', 'assignee', 'dueDate', 'progress', 'actions'
]);

const ALL_COLUMNS = [
  { id: 'key', label: 'ID', width: 80, minWidth: 60 },
  { id: 'title', label: 'Title', width: 280, minWidth: 150 },
  { id: 'status', label: 'Status', width: 120, minWidth: 100 },
  { id: 'priority', label: 'Priority', width: 100, minWidth: 80 },
  { id: 'workstream', label: 'Workstream', width: 140, minWidth: 100 },
  { id: 'labels', label: 'Labels', width: 180, minWidth: 120 },
  { id: 'assignee', label: 'Assignee', width: 150, minWidth: 100 },
  { id: 'dueDate', label: 'Due Date', width: 110, minWidth: 90 },
  { id: 'progress', label: 'Progress', width: 100, minWidth: 80 },
  { id: 'actions', label: '', width: 60, minWidth: 40 },
];

// Virtualized tbody — renders only visible rows for large task lists
const TASK_ROW_HEIGHT = 44;
const VIRTUALIZE_THRESHOLD = 50;

function VirtualizedTaskBody({ tasks, parentRef, selectedIds, focusedIndex, onSelect, onClick, onUpdate, visibleColumns, columnWidths, statuses, users, labelsMap }: {
  tasks: any[]; parentRef: React.RefObject<HTMLDivElement>; selectedIds: Set<string>; focusedIndex: number;
  onSelect: (id: string) => void; onClick: (task: any) => void; onUpdate: (taskId: string, field: string, value: any) => void;
  visibleColumns: Set<string>; columnWidths: Record<string, number>; statuses: any[]; users: any[]; labelsMap: Record<string, any[]>;
}) {
  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => TASK_ROW_HEIGHT,
    overscan: 10,
  });

  // Skip virtualization for small lists
  if (tasks.length < VIRTUALIZE_THRESHOLD) {
    return (
      <tbody>
        {tasks.map((task, index) => (
          <TaskListRowV3 key={task.id} task={task} index={index} isSelected={selectedIds.has(task.id)} isFocused={focusedIndex === index}
            onSelect={onSelect} onClick={onClick} onUpdate={onUpdate} visibleColumns={visibleColumns} columnWidths={columnWidths}
            statuses={statuses} users={users} labels={labelsMap[task.id] || []} />
        ))}
      </tbody>
    );
  }

  return (
    <tbody style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
      {virtualizer.getVirtualItems().map(virtualRow => {
        const task = tasks[virtualRow.index];
        return (
          <TaskListRowV3 key={task.id} task={task} index={virtualRow.index} isSelected={selectedIds.has(task.id)} isFocused={focusedIndex === virtualRow.index}
            onSelect={onSelect} onClick={onClick} onUpdate={onUpdate} visibleColumns={visibleColumns} columnWidths={columnWidths}
            statuses={statuses} users={users} labels={labelsMap[task.id] || []} />
        );
      })}
    </tbody>
  );
}

export function TaskListPageV3({ onTaskClick, onCreateTask }: TaskListPageV3Props) {
  const [searchParams] = useSearchParams();
  const tableRef = useRef<HTMLDivElement>(null);

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
    if (filter === 'overdue') filters.overdueOnly = true;
    if (filter === 'blocked') filters.blockedOnly = true;
    if (assignee === 'unassigned') filters.assignee = null;
    
    return filters;
  }, [searchParams]);

  // State
  const [filters, setFilters] = useState<TaskListFilters>(getInitialFilters);
  const [sorting, setSorting] = useState<TaskListSorting>({ field: 'priority', direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(DEFAULT_COLUMNS);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('taskListColumnWidths');
    if (saved) {
      try { return JSON.parse(saved); } catch { return {}; }
    }
    return {};
  });
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(true);

  // Data hooks
  const { data: tasks = [], isLoading, refetch } = useTaskList(filters, sorting);
  const { data: stats } = useTaskListStats(filters.workstream, filters.assignee);
  const { data: workstreamsRaw = [] } = usePlannerWorkstreams(false);
  const workstreams = useMemo(
    () => workstreamsRaw.map(ws => ({ id: ws.id, name: ws.name, slug: ws.slug, color: ws.color })),
    [workstreamsRaw]
  );
  const { data: users = [] } = usePlannerUsers();
  const { data: statuses = [] } = useKanbanStatuses();
  const updateTask = useUpdatePlannerTask();

  // Fetch labels for all visible tasks
  const taskIds = useMemo(() => tasks.map(t => t.id), [tasks]);
  const { data: labelsMap = {} } = useTaskLabelsMap(taskIds);

  // Label filter state
  const [selectedLabelFilters, setSelectedLabelFilters] = useState<string[]>([]);

  // Filter tasks by labels (client-side)
  const filteredTasks = useMemo(() => {
    if (selectedLabelFilters.length === 0) return tasks;
    
    return tasks.filter(task => {
      const taskLabels = labelsMap[task.id] || [];
      const taskLabelIds = taskLabels.map(l => l.id);
      return selectedLabelFilters.some(filterId => taskLabelIds.includes(filterId));
    });
  }, [tasks, labelsMap, selectedLabelFilters]);

  // Real-time subscriptions
  usePlannerRealtime(null);
  useTaskLabelsRealtime();

  // Sync URL params to filter state
  useEffect(() => {
    setFilters(getInitialFilters());
  }, [searchParams, getInitialFilters]);

  // Save column widths
  useEffect(() => {
    localStorage.setItem('taskListColumnWidths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('tl-search-input')?.focus();
      }
      if (e.target instanceof HTMLInputElement) return;
      
      if (e.key === 'j' && tasks.length > 0) {
        setFocusedIndex(prev => Math.min(prev + 1, tasks.length - 1));
      }
      if (e.key === 'k' && tasks.length > 0) {
        setFocusedIndex(prev => Math.max(prev - 1, 0));
      }
      if (e.key === 'x' && focusedIndex >= 0) {
        const task = tasks[focusedIndex];
        if (task) handleSelectOne(task.id);
      }
      if (e.key === 'Enter' && focusedIndex >= 0) {
        const task = tasks[focusedIndex];
        if (task) onTaskClick(task);
      }
      if (e.key === 'Escape') {
        setSelectedIds(new Set());
        setFocusedIndex(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tasks, focusedIndex, onTaskClick]);

  // Handlers
  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
    setFilters(prev => ({ ...prev, search: value || undefined }));
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === tasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tasks.map(t => t.id)));
    }
  }, [tasks, selectedIds]);

  const handleSelectOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleColumnResize = useCallback((columnId: string, width: number) => {
    setColumnWidths(prev => ({ ...prev, [columnId]: width }));
  }, []);

  const handleTaskUpdate = useCallback((taskId: string, field: string, value: any) => {
    updateTask.mutate({ id: taskId, updates: { [field]: value } }, {
      onSuccess: () => toast.success('Task updated'),
      onError: () => toast.error('Failed to update task'),
    });
  }, [updateTask]);

  const handleExport = useCallback(() => {
    if (tasks.length === 0) {
      toast.error('No tasks to export');
      return;
    }
    const headers = ['ID', 'Title', 'Status', 'Priority', 'Workstream', 'Assignee', 'Due Date', 'Progress'];
    const rows = tasks.map(task => [
      task.task_key,
      `"${task.title.replace(/"/g, '""')}"`,
      task.status_name || '',
      task.priority,
      task.workstream_name || '',
      task.assignee_name || '',
      task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : '',
      task.progress,
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

  const handleClearFilters = useCallback(() => {
    setFilters({});
    setSearchValue('');
    setSelectedLabelFilters([]);
  }, []);

  const toggleColumn = useCallback((columnId: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnId)) next.delete(columnId);
      else next.add(columnId);
      return next;
    });
  }, []);

  // Stats
  const totalCount = stats?.total_count || tasks.length;
  const overdueCount = stats?.overdue_count || 0;
  const inProgressCount = stats?.in_progress_count || 0;
  const doneCount = stats?.done_count || 0;

  const activeFilterCount = [
    filters.workstream,
    filters.status,
    filters.priority,
    filters.assignee,
    filters.overdueOnly,
    selectedLabelFilters.length > 0,
  ].filter(Boolean).length;

  const visibleColumnDefs = ALL_COLUMNS.filter(col => visibleColumns.has(col.id));

  const getColumnWidth = (colId: string) => {
    return columnWidths[colId] || ALL_COLUMNS.find(c => c.id === colId)?.width || 100;
  };

  const getPriorityDotColor = (p: TaskPriority) => {
    // Keep this as a simple lookup into existing configuration to avoid CSS var format issues.
    return PRIORITY_CONFIG[p]?.color || PRIORITY_CONFIG.medium.color;
  };

  // URL contract: other modules may navigate using ?workstream={slug};
  // our DB filter expects workstream_id. Map slug -> id once workstreams are loaded.
  useEffect(() => {
    const w = filters.workstream;
    if (!w || workstreams.length === 0) return;

    const isId = workstreams.some(ws => ws.id === w);
    if (isId) return;

    const match = workstreams.find(ws => ws.slug === w);
    if (!match) return;

    setFilters(prev => ({ ...prev, workstream: match.id }));
  }, [filters.workstream, workstreams]);

  return (
    <div className="planner-task-list-content h-full flex flex-col overflow-hidden">
      {/* Header - Enterprise Clean (no icons, minimalist) */}
      <div className="tl-page-header shrink-0">
        <div>
          <h1 className="tl-page-title">Task List</h1>
          <p className="tl-page-subtitle">
            All tasks across workstreams
          </p>
        </div>

        {/* KPI Chips - Enterprise Clean with dots, not icons */}
        <div className="tl-kpi-strip">
          {/* Total - no dot */}
          <div className="tl-kpi-chip">
            <span className="tl-kpi-value">{isLoading ? '—' : totalCount}</span>
            <span className="tl-kpi-label">TOTAL</span>
          </div>
          
          {/* Overdue - red dot */}
          <div className="tl-kpi-chip">
            <div className="flex items-center gap-1.5">
              <span className="tl-kpi-dot tl-kpi-dot-overdue" />
              <span className="tl-kpi-value">{isLoading ? '—' : overdueCount}</span>
            </div>
            <span className="tl-kpi-label">OVERDUE</span>
          </div>
          
          {/* In Progress - amber dot */}
          <div className="tl-kpi-chip">
            <div className="flex items-center gap-1.5">
              <span className="tl-kpi-dot tl-kpi-dot-progress" />
              <span className="tl-kpi-value">{isLoading ? '—' : inProgressCount}</span>
            </div>
            <span className="tl-kpi-label">IN PROGRESS</span>
          </div>
          
          {/* Done - green dot */}
          <div className="tl-kpi-chip">
            <div className="flex items-center gap-1.5">
              <span className="tl-kpi-dot tl-kpi-dot-done" />
              <span className="tl-kpi-value">{isLoading ? '—' : doneCount}</span>
            </div>
            <span className="tl-kpi-label">DONE</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="tl-toolbar shrink-0">
        <div className="flex items-center gap-2 flex-1">
          {/* Search */}
          <div className="tl-search">
            <Search className="w-4 h-4 tl-search-icon" />
            <input
              id="tl-search-input"
              type="text"
              placeholder="Search tasks... ⌘K"
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              className="tl-search-input"
            />
            {searchValue && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--pln-tl-text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Workstream Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="tl-btn tl-btn-outline">
                <Layers className="w-4 h-4" />
                {filters.workstream 
                  ? workstreams.find(w => w.id === filters.workstream)?.name || 'Workstream'
                  : 'Workstream'
                }
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="tl-dropdown w-48">
              <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, workstream: null }))}>
                All Workstreams
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {workstreams.map((ws) => (
                <DropdownMenuItem 
                  key={ws.id} 
                  onClick={() => setFilters(prev => ({ ...prev, workstream: ws.id }))}
                >
                  <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: ws.color }} />
                  {ws.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="tl-btn tl-btn-outline">
                {filters.status 
                  ? statuses.find(s => s.id === filters.status)?.name || 'Status'
                  : 'Status'
                }
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="tl-dropdown w-40">
              <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, status: null }))}>
                All Statuses
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {statuses.map((s) => (
                <DropdownMenuItem 
                  key={s.id} 
                  onClick={() => setFilters(prev => ({ ...prev, status: s.id }))}
                >
                  <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: s.color }} />
                  {s.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Priority Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="tl-btn tl-btn-outline">
                {filters.priority ? PRIORITY_CONFIG[filters.priority].label : 'Priority'}
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="tl-dropdown w-36">
              <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, priority: null }))}>
                All Priorities
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => {
                const config = PRIORITY_CONFIG[p];
                return (
                  <DropdownMenuItem 
                    key={p} 
                    onClick={() => setFilters(prev => ({ ...prev, priority: p }))}
                  >
                    <span
                      className="tl-filter-dot"
                      style={{ backgroundColor: getPriorityDotColor(p) }}
                    />
                    <span className="tl-filter-label">{config.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Labels Filter */}
          <LabelsFilter
            selectedLabels={selectedLabelFilters}
            onChange={setSelectedLabelFilters}
          />

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <button onClick={handleClearFilters} className="tl-btn tl-btn-outline">
              <X className="w-4 h-4" />
              Clear ({activeFilterCount})
            </button>
          )}

          {/* Results Count */}
          <span className="text-sm ml-2" style={{ color: 'var(--pln-tl-text-tertiary)' }}>
            {tasks.length === totalCount ? `${totalCount} tasks` : `${tasks.length} of ${totalCount} tasks`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button onClick={() => refetch()} className="tl-btn tl-btn-outline">
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Columns */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="tl-btn tl-btn-outline">
                <Columns3 className="w-4 h-4" />
                Columns
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="tl-dropdown w-40">
              {ALL_COLUMNS.filter(c => c.id !== 'actions').map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={visibleColumns.has(col.id)}
                  onCheckedChange={() => toggleColumn(col.id)}
                >
                  {col.label || col.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
          <button onClick={handleExport} className="tl-btn tl-btn-outline">
            <Download className="w-4 h-4" />
            Export
          </button>

          {/* Add Task */}
          <button onClick={onCreateTask} className="tl-btn tl-btn-primary">
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* Table */}
      <div ref={tableRef} className="flex-1 overflow-auto p-4 px-6">
        <div className="tl-table-container">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 tl-skeleton" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="tl-empty-state">
              <div className="tl-empty-icon">
                <List className="w-8 h-8" />
              </div>
              <h3 className="tl-empty-title">No tasks found</h3>
              <p className="tl-empty-desc">Try adjusting your filters or create a new task</p>
            </div>
          ) : (
            <table className="tl-table">
              <thead className="tl-header">
                <tr>
                  <th style={{ width: 40 }}>
                    <Checkbox
                      checked={selectedIds.size === tasks.length && tasks.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  {visibleColumnDefs.map((col) => (
                    <th
                      key={col.id}
                      style={{ width: getColumnWidth(col.id), minWidth: col.minWidth }}
                    >
                      {col.label}
                      <div
                        className="tl-column-resizer"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.pageX;
                          const startWidth = getColumnWidth(col.id);

                          const handleMove = (moveE: MouseEvent) => {
                            const diff = moveE.pageX - startX;
                            const newWidth = Math.max(col.minWidth, startWidth + diff);
                            handleColumnResize(col.id, newWidth);
                          };

                          const handleUp = () => {
                            document.removeEventListener('mousemove', handleMove);
                            document.removeEventListener('mouseup', handleUp);
                            document.body.style.cursor = '';
                            document.body.style.userSelect = '';
                          };

                          document.body.style.cursor = 'col-resize';
                          document.body.style.userSelect = 'none';
                          document.addEventListener('mousemove', handleMove);
                          document.addEventListener('mouseup', handleUp);
                        }}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <VirtualizedTaskBody
                tasks={filteredTasks}
                parentRef={tableRef}
                selectedIds={selectedIds}
                focusedIndex={focusedIndex}
                onSelect={handleSelectOne}
                onClick={onTaskClick}
                onUpdate={handleTaskUpdate}
                visibleColumns={visibleColumns}
                columnWidths={columnWidths}
                statuses={statuses}
                users={users}
                labelsMap={labelsMap}
              />
            </table>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionBar
        selectedIds={Array.from(selectedIds)}
        selectedCount={selectedIds.size}
        onClearSelection={handleClearSelection}
      />
    </div>
  );
}
