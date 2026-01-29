// ============================================================
// PLANNER TIMELINE V2 — GOD-TIER ENTERPRISE REDESIGN
// Self-contained bars, workstream swimlanes, working filters
// ============================================================

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, CalendarDays, Plus, Search, Check, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addDays, startOfWeek, format, differenceInDays, isToday, getDay, subDays, isBefore, startOfDay } from 'date-fns';
import { CreateTaskModal } from './kanban';
import { usePlannerWorkstreams, Workstream } from '../hooks/usePlannerWorkstreams';
import { usePlannerUsers } from '../hooks/usePlannerUsers';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================================
// TYPES
// ============================================================
interface TimelineTask {
  id: string;
  key: string;
  title: string;
  status_slug: 'backlog' | 'planned' | 'progress' | 'review' | 'done';
  status_name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  workstream_id: string | null;
  workstream_name: string | null;
  workstream_color: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_initials: string | null;
  start_date: string | null;
  due_date: string | null;
  progress: number;
  is_overdue: boolean;
}

interface TimelineFilters {
  workstream: string; // 'all' or workstream_id
  status: string; // 'all' or status slug
  priority: string; // 'all' or priority value
  assignee: string; // 'all' | 'unassigned' | profile_id
  search: string;
}

type ViewMode = 'day' | 'week' | 'month';

// ============================================================
// STATUS STYLES (V2 Spec)
// ============================================================
const STATUS_STYLES: Record<string, { gradient: string; text: string; stripe: string }> = {
  backlog: { 
    gradient: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)', 
    text: '#334155', 
    stripe: '#64748b' 
  },
  planned: { 
    gradient: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', 
    text: '#1e40af', 
    stripe: '#3b82f6' 
  },
  progress: { 
    gradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
    text: '#92400e', 
    stripe: '#f59e0b' 
  },
  review: { 
    gradient: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)', 
    text: '#5b21b6', 
    stripe: '#8b5cf6' 
  },
  done: { 
    gradient: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', 
    text: '#065f46', 
    stripe: '#10b981' 
  },
};

function getStatusStyle(slug: string) {
  return STATUS_STYLES[slug] || STATUS_STYLES.backlog;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ============================================================
// DATA HOOK: Fetch timeline tasks with all needed info
// ============================================================
function useTimelineTasks() {
  return useQuery({
    queryKey: ['timeline-tasks-v2'],
    queryFn: async (): Promise<TimelineTask[]> => {
      // Fetch tasks with all joins
      const { data: tasks, error } = await supabase
        .from('planner_tasks')
        .select(`
          id,
          task_key,
          title,
          priority,
          workstream_id,
          assignee_id,
          start_date,
          due_date,
          progress,
          status:planner_statuses(slug, name),
          workstream:planner_workstreams(id, name, color),
          assignee:profiles!planner_tasks_assignee_id_fkey(id, full_name)
        `)
        .is('deleted_at', null)
        .order('start_date', { ascending: true, nullsFirst: false });

      if (error) throw new Error(error.message);

      const today = startOfDay(new Date());

      return (tasks || []).map((t: any): TimelineTask => {
        const statusSlug = t.status?.slug || 'backlog';
        const isDone = statusSlug === 'done';
        const isOverdue = t.due_date && !isDone && isBefore(new Date(t.due_date), today);

        return {
          id: t.id,
          key: t.task_key || `PLN-${t.id.slice(0, 4).toUpperCase()}`,
          title: t.title,
          status_slug: statusSlug,
          status_name: t.status?.name || 'Backlog',
          priority: t.priority || 'medium',
          workstream_id: t.workstream_id,
          workstream_name: t.workstream?.name || null,
          workstream_color: t.workstream?.color || '#64748b',
          assignee_id: t.assignee_id,
          assignee_name: t.assignee?.full_name || null,
          assignee_initials: t.assignee?.full_name ? getInitials(t.assignee.full_name) : null,
          start_date: t.start_date,
          due_date: t.due_date,
          progress: t.progress || 0,
          is_overdue: isOverdue,
        };
      });
    },
    staleTime: 30_000,
  });
}

// ============================================================
// MAIN COMPONENT
// ============================================================
interface PlannerTimelineProps {
  tasks?: any[]; // Unused - we fetch our own
  onTaskClick?: (task: any) => void;
}

export function PlannerTimeline({ onTaskClick }: PlannerTimelineProps) {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [viewStart, setViewStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [filters, setFilters] = useState<TimelineFilters>({
    workstream: 'all',
    status: 'all',
    priority: 'all',
    assignee: 'all',
    search: '',
  });
  const [collapsedWorkstreams, setCollapsedWorkstreams] = useState<Set<string>>(new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Data
  const { data: allTasks = [], isLoading: tasksLoading } = useTimelineTasks();
  const { data: workstreams = [], isLoading: wsLoading } = usePlannerWorkstreams();
  const { data: users = [] } = usePlannerUsers();

  // ============================================================
  // FILTER LOGIC (V2 Spec: Real-time filtering)
  // ============================================================
  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      // Workstream filter
      if (filters.workstream !== 'all' && task.workstream_id !== filters.workstream) return false;
      // Status filter
      if (filters.status !== 'all' && task.status_slug !== filters.status) return false;
      // Priority filter
      if (filters.priority !== 'all' && task.priority !== filters.priority) return false;
      // Assignee filter
      if (filters.assignee !== 'all') {
        if (filters.assignee === 'unassigned' && task.assignee_id) return false;
        if (filters.assignee !== 'unassigned' && task.assignee_id !== filters.assignee) return false;
      }
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (
          !task.title.toLowerCase().includes(searchLower) &&
          !task.key.toLowerCase().includes(searchLower)
        )
          return false;
      }
      return true;
    });
  }, [allTasks, filters]);

  // ============================================================
  // GROUP BY WORKSTREAM (V2 Spec: Swimlanes)
  // ============================================================
  interface WorkstreamSwimlane {
    id: string;
    name: string;
    color: string;
    lead: { name: string; initials: string } | null;
    tasks: TimelineTask[];
    taskCount: number;
    inProgressCount: number;
    overdueCount: number;
    collapsed: boolean;
  }

  const swimlanes: WorkstreamSwimlane[] = useMemo(() => {
    // Group tasks by workstream
    const tasksByWorkstream = new Map<string, TimelineTask[]>();
    
    filteredTasks.forEach(task => {
      const wsId = task.workstream_id || 'unassigned';
      if (!tasksByWorkstream.has(wsId)) {
        tasksByWorkstream.set(wsId, []);
      }
      tasksByWorkstream.get(wsId)!.push(task);
    });

    // Build swimlanes from workstreams
    const lanes: WorkstreamSwimlane[] = [];

    // Add workstream lanes
    workstreams.forEach(ws => {
      const tasks = tasksByWorkstream.get(ws.id) || [];
      // Skip empty workstreams when filtering
      if (filters.workstream !== 'all' && filters.workstream !== ws.id) return;
      if (tasks.length === 0 && filters.workstream !== 'all') return;

      const inProgressCount = tasks.filter(t => t.status_slug === 'progress' || t.status_slug === 'review').length;
      const overdueCount = tasks.filter(t => t.is_overdue).length;

      lanes.push({
        id: ws.id,
        name: ws.name,
        color: ws.color,
        lead: ws.lead || null,
        tasks: tasks.sort((a, b) => {
          const aDate = a.start_date ? new Date(a.start_date).getTime() : Infinity;
          const bDate = b.start_date ? new Date(b.start_date).getTime() : Infinity;
          return aDate - bDate;
        }),
        taskCount: tasks.length,
        inProgressCount,
        overdueCount,
        collapsed: collapsedWorkstreams.has(ws.id),
      });
    });

    // Add unassigned lane if there are unassigned tasks
    const unassignedTasks = tasksByWorkstream.get('unassigned') || [];
    if (unassignedTasks.length > 0) {
      lanes.push({
        id: 'unassigned',
        name: 'Unassigned',
        color: '#94a3b8',
        lead: null,
        tasks: unassignedTasks,
        taskCount: unassignedTasks.length,
        inProgressCount: unassignedTasks.filter(t => t.status_slug === 'progress' || t.status_slug === 'review').length,
        overdueCount: unassignedTasks.filter(t => t.is_overdue).length,
        collapsed: collapsedWorkstreams.has('unassigned'),
      });
    }

    return lanes;
  }, [filteredTasks, workstreams, collapsedWorkstreams, filters.workstream]);

  // ============================================================
  // DATE CALCULATIONS
  // ============================================================
  const columnConfig = useMemo(() => {
    switch (viewMode) {
      case 'day': return { days: 14, width: 68 };
      case 'week': return { days: 28, width: 48 };
      case 'month': return { days: 60, width: 28 };
    }
  }, [viewMode]);

  const dateColumns = useMemo(() => {
    const columns: Date[] = [];
    for (let i = 0; i < columnConfig.days; i++) {
      columns.push(addDays(viewStart, i));
    }
    return columns;
  }, [viewStart, columnConfig.days]);

  const viewEnd = useMemo(() => addDays(viewStart, columnConfig.days - 1), [viewStart, columnConfig.days]);

  // ============================================================
  // BAR POSITION CALCULATIONS
  // ============================================================
  const getTaskBarStyle = useCallback((task: TimelineTask) => {
    const startDate = task.start_date ? new Date(task.start_date) : new Date();
    const endDate = task.due_date ? new Date(task.due_date) : addDays(startDate, 5);
    
    const startOffset = differenceInDays(startDate, viewStart);
    const duration = Math.max(1, differenceInDays(endDate, startDate) + 1);
    
    const left = startOffset * columnConfig.width;
    const width = duration * columnConfig.width;
    
    const isVisible = startOffset + duration > 0 && startOffset < columnConfig.days;
    
    return { left, width: Math.max(width, 80), isVisible };
  }, [viewStart, columnConfig]);

  // ============================================================
  // NAVIGATION HANDLERS
  // ============================================================
  const navigateView = useCallback((direction: 'prev' | 'next') => {
    const days = viewMode === 'day' ? 7 : viewMode === 'week' ? 14 : 30;
    setViewStart(prev => direction === 'next' ? addDays(prev, days) : subDays(prev, days));
  }, [viewMode]);

  const goToToday = useCallback(() => {
    setViewStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
    if (gridRef.current) {
      const todayOffset = differenceInDays(new Date(), startOfWeek(new Date(), { weekStartsOn: 0 }));
      gridRef.current.scrollLeft = Math.max(0, (todayOffset - 3) * columnConfig.width);
    }
  }, [columnConfig.width]);

  // Toggle workstream collapse
  const toggleCollapse = useCallback((wsId: string) => {
    setCollapsedWorkstreams(prev => {
      const next = new Set(prev);
      if (next.has(wsId)) next.delete(wsId);
      else next.add(wsId);
      return next;
    });
  }, []);

  // Clear filter
  const clearFilter = useCallback((key: keyof TimelineFilters) => {
    setFilters(prev => ({ ...prev, [key]: key === 'search' ? '' : 'all' }));
  }, []);

  const hasActiveFilters = filters.workstream !== 'all' || filters.status !== 'all' || filters.priority !== 'all' || filters.assignee !== 'all' || filters.search !== '';

  const clearAllFilters = useCallback(() => {
    setFilters({
      workstream: 'all',
      status: 'all',
      priority: 'all',
      assignee: 'all',
      search: '',
    });
  }, []);

  // ============================================================
  // TODAY LINE CALCULATION (V2 Spec: Prominent)
  // ============================================================
  const todayOffset = differenceInDays(new Date(), viewStart);
  const todayPosition = todayOffset * columnConfig.width + columnConfig.width / 2;
  const showTodayLine = todayOffset >= 0 && todayOffset < columnConfig.days;

  // Layout constants
  const SWIMLANE_HEADER_HEIGHT = 56;
  const TASK_BAR_HEIGHT = 32;
  const TASK_BAR_GAP = 6;
  const SWIMLANE_PADDING = 12;
  const LEFT_PANEL_WIDTH = 300;
  const DATE_HEADER_HEIGHT = 52;

  // Calculate swimlane row heights
  const getSwimlineHeight = (taskCount: number, isCollapsed: boolean): number => {
    if (isCollapsed) return 0;
    if (taskCount === 0) return 48;
    return (taskCount * TASK_BAR_HEIGHT) + ((taskCount - 1) * TASK_BAR_GAP) + SWIMLANE_PADDING * 2;
  };

  // Total content height for today line
  const totalContentHeight = swimlanes.reduce((acc, lane) => {
    return acc + SWIMLANE_HEADER_HEIGHT + getSwimlineHeight(lane.tasks.length, lane.collapsed);
  }, 0);

  // ============================================================
  // KEYBOARD SHORTCUTS
  // ============================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        goToToday();
      } else if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsCreateOpen(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToToday]);

  // ============================================================
  // RENDER
  // ============================================================
  const isLoading = tasksLoading || wsLoading;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-full flex flex-col bg-white dark:bg-slate-950">
        {/* ============================================================
            TOP BAR - Title, Today, Date Nav, View Mode Toggle
            ============================================================ */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex-shrink-0">
          {/* Left: Title */}
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Timeline</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {filteredTasks.length} tasks across {swimlanes.length} workstreams
            </p>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-3">
            {/* Add Task Button */}
            <Button 
              onClick={() => setIsCreateOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>

            {/* Today Button */}
            <Button variant="outline" size="sm" onClick={goToToday} className="gap-2 h-9">
              <CalendarDays className="w-4 h-4" />
              Today
            </Button>

            {/* Date Navigation */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg">
              <Button variant="ghost" size="sm" className="h-9 px-2 rounded-l-lg" onClick={() => navigateView('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-4 text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[160px] text-center">
                {format(viewStart, 'MMM d')} - {format(viewEnd, 'MMM d, yyyy')}
              </span>
              <Button variant="ghost" size="sm" className="h-9 px-2 rounded-r-lg" onClick={() => navigateView('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              {(['day', 'week', 'month'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "px-4 py-1.5 text-sm font-medium rounded-md transition-all capitalize",
                    viewMode === mode
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ============================================================
            FILTER BAR (V2 Spec: All filters must work)
            ============================================================ */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex-shrink-0">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-9 h-9"
            />
            {filters.search && (
              <button
                onClick={() => clearFilter('search')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Workstream Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9",
                  filters.workstream !== 'all' && "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300"
                )}
              >
                {filters.workstream === 'all'
                  ? 'Workstream'
                  : workstreams.find(w => w.id === filters.workstream)?.name || 'Unknown'}
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, workstream: 'all' }))}>
                All Workstreams
                {filters.workstream === 'all' && <Check className="w-4 h-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {workstreams.map(ws => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => setFilters(prev => ({ ...prev, workstream: ws.id }))}
                >
                  <span
                    className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                    style={{ backgroundColor: ws.color }}
                  />
                  {ws.name}
                  {filters.workstream === ws.id && <Check className="w-4 h-4 ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9",
                  filters.status !== 'all' && "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300"
                )}
              >
                {filters.status === 'all' ? 'Status' : filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, status: 'all' }))}>
                All Statuses
                {filters.status === 'all' && <Check className="w-4 h-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {['backlog', 'planned', 'progress', 'review', 'done'].map(s => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => setFilters(prev => ({ ...prev, status: s }))}
                >
                  <span
                    className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                    style={{ backgroundColor: getStatusStyle(s).stripe }}
                  />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                  {filters.status === s && <Check className="w-4 h-4 ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Priority Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9",
                  filters.priority !== 'all' && "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300"
                )}
              >
                {filters.priority === 'all' ? 'Priority' : filters.priority.charAt(0).toUpperCase() + filters.priority.slice(1)}
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, priority: 'all' }))}>
                All Priorities
                {filters.priority === 'all' && <Check className="w-4 h-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {['critical', 'high', 'medium', 'low'].map(p => (
                <DropdownMenuItem
                  key={p}
                  onClick={() => setFilters(prev => ({ ...prev, priority: p }))}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                  {filters.priority === p && <Check className="w-4 h-4 ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Assignee Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9",
                  filters.assignee !== 'all' && "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300"
                )}
              >
                {filters.assignee === 'all'
                  ? 'Assignee'
                  : filters.assignee === 'unassigned'
                  ? 'Unassigned'
                  : users.find(u => u.id === filters.assignee)?.name?.split(' ')[0] || 'Unknown'}
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 max-h-64 overflow-y-auto">
              <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, assignee: 'all' }))}>
                All Assignees
                {filters.assignee === 'all' && <Check className="w-4 h-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, assignee: 'unassigned' }))}>
                Unassigned
                {filters.assignee === 'unassigned' && <Check className="w-4 h-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {users.slice(0, 20).map(u => (
                <DropdownMenuItem
                  key={u.id}
                  onClick={() => setFilters(prev => ({ ...prev, assignee: u.id }))}
                >
                  {u.name}
                  {filters.assignee === u.id && <Check className="w-4 h-4 ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-9 text-slate-500">
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}

          {/* Status Legend */}
          <div className="ml-auto flex items-center gap-4 text-xs text-slate-500">
            {['backlog', 'planned', 'progress', 'review', 'done'].map(s => (
              <div key={s} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: getStatusStyle(s).stripe }}
                />
                <span className="capitalize">{s === 'progress' ? 'In Progress' : s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ============================================================
            TIMELINE CONTENT - Left panel + Gantt Grid
            ============================================================ */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Workstream Swimlane Headers (V2 Spec: Headers ONLY) */}
          <div
            className="flex-shrink-0 bg-white dark:bg-slate-950 overflow-y-auto border-r border-slate-200 dark:border-slate-800"
            style={{ width: LEFT_PANEL_WIDTH }}
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 flex items-center px-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide"
              style={{ height: DATE_HEADER_HEIGHT }}
            >
              Workstream
            </div>

            {/* Swimlane Headers */}
            {swimlanes.map(lane => (
              <div key={lane.id}>
                {/* Workstream Header (V2 Spec: With lead display + task summary) */}
                <button
                  onClick={() => toggleCollapse(lane.id)}
                  className="w-full flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                  style={{ minHeight: SWIMLANE_HEADER_HEIGHT }}
                >
                  {/* Collapse Chevron */}
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-slate-400 transition-transform mt-0.5 flex-shrink-0",
                      lane.collapsed && "-rotate-90"
                    )}
                  />

                  {/* Color Dot */}
                  <div
                    className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: lane.color }}
                  />

                  {/* Workstream Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {lane.name}
                    </div>

                    {/* Team Lead (V2 Spec: CRITICAL ADDITION) */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {lane.lead ? (
                        <>
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-semibold text-white flex-shrink-0"
                            style={{ backgroundColor: lane.color }}
                          >
                            {lane.lead.initials}
                          </div>
                          <span>{lane.lead.name}</span>
                        </>
                      ) : (
                        <span className="text-slate-400">No lead assigned</span>
                      )}
                    </div>

                    {/* Task Summary */}
                    <div className="text-[11px] text-slate-500 dark:text-slate-500 mt-1">
                      {lane.taskCount} tasks
                      {lane.inProgressCount > 0 && ` · ${lane.inProgressCount} in progress`}
                      {lane.overdueCount > 0 && (
                        <span className="text-red-600 font-semibold">
                          {' · '}{lane.overdueCount} overdue
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Empty space for collapsed lanes, or task row space */}
                {!lane.collapsed && (
                  <div
                    className="border-b border-slate-100 dark:border-slate-800"
                    style={{ height: getSwimlineHeight(lane.tasks.length, false) }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Right Panel - Gantt Chart */}
          <div className="flex-1 overflow-auto" ref={gridRef}>
            <div style={{ minWidth: columnConfig.days * columnConfig.width }}>
              {/* Date Header Row */}
              <div
                className="flex sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                style={{ height: DATE_HEADER_HEIGHT }}
              >
                {dateColumns.map((date, i) => {
                  const isCurrentDay = isToday(date);
                  const dayOfWeek = getDay(date);
                  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Saudi weekend (Fri/Sat)

                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-shrink-0 flex flex-col items-center justify-center transition-colors",
                        isWeekend && !isCurrentDay && "bg-slate-50/80 dark:bg-slate-900/50"
                      )}
                      style={{ width: columnConfig.width }}
                    >
                      {isCurrentDay ? (
                        <div className="flex flex-col items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white">
                          <span className="text-[9px] font-medium uppercase leading-none">
                            {format(date, 'EEE')}
                          </span>
                          <span className="text-sm font-bold leading-none">
                            {format(date, 'd')}
                          </span>
                        </div>
                      ) : (
                        <>
                          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase">
                            {format(date, 'EEE')}
                          </span>
                          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                            {format(date, 'd')}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Grid Body with Bars */}
              <div className="relative">
                {/* Today Line (V2 Spec: Prominent with label + arrow) */}
                {showTodayLine && (
                  <div
                    className="absolute z-20 pointer-events-none"
                    style={{ left: todayPosition, top: 0, height: totalContentHeight }}
                  >
                    {/* Label */}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-[9px] font-bold rounded whitespace-nowrap z-30">
                      TODAY
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent border-t-blue-500" />
                    {/* Line */}
                    <div className="w-0.5 h-full bg-blue-500 mt-6 animate-pulse" style={{ animationDuration: '2s' }} />
                  </div>
                )}

                {/* Workstream Swimlanes with Bars */}
                {swimlanes.map(lane => {
                  const laneHeight = getSwimlineHeight(lane.tasks.length, lane.collapsed);

                  return (
                    <div key={lane.id}>
                      {/* Swimlane Header Row (grid side) */}
                      <div
                        className="relative flex bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-700"
                        style={{ height: SWIMLANE_HEADER_HEIGHT }}
                      >
                        {/* Weekend shading */}
                        <div className="absolute inset-0 flex pointer-events-none">
                          {dateColumns.map((date, i) => {
                            const isWeekend = getDay(date) === 5 || getDay(date) === 6;
                            return (
                              <div
                                key={i}
                                className={cn("flex-shrink-0", isWeekend && "bg-slate-100/50 dark:bg-slate-800/30")}
                                style={{ width: columnConfig.width }}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Task Bars Container */}
                      {!lane.collapsed && (
                        <div
                          className="relative border-b border-slate-100 dark:border-slate-800"
                          style={{ height: laneHeight }}
                        >
                          {/* Weekend shading */}
                          <div className="absolute inset-0 flex pointer-events-none">
                            {dateColumns.map((date, i) => {
                              const isWeekend = getDay(date) === 5 || getDay(date) === 6;
                              return (
                                <div
                                  key={i}
                                  className={cn("flex-shrink-0", isWeekend && "bg-slate-50/50 dark:bg-slate-800/20")}
                                  style={{ width: columnConfig.width }}
                                />
                              );
                            })}
                          </div>

                          {/* Task Bars (V2 Spec: Self-contained with all info) */}
                          {lane.tasks.map((task, index) => {
                            const barStyle = getTaskBarStyle(task);
                            if (!barStyle.isVisible) return null;

                            const statusStyle = getStatusStyle(task.status_slug);
                            const isHovered = hoveredTaskId === task.id;
                            const barWidth = barStyle.width;
                            const showTitle = barWidth > 200;
                            const top = SWIMLANE_PADDING + index * (TASK_BAR_HEIGHT + TASK_BAR_GAP);

                            return (
                              <Tooltip key={task.id}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      "absolute flex items-center cursor-pointer rounded-md overflow-hidden transition-all",
                                      "border-2",
                                      isHovered && "shadow-lg scale-[1.02]",
                                      task.is_overdue ? "border-red-500" : "border-transparent"
                                    )}
                                    style={{
                                      left: Math.max(4, barStyle.left),
                                      width: barStyle.width,
                                      top,
                                      height: TASK_BAR_HEIGHT,
                                      background: statusStyle.gradient,
                                      color: statusStyle.text,
                                    }}
                                    onClick={() => onTaskClick?.(task)}
                                    onMouseEnter={() => setHoveredTaskId(task.id)}
                                    onMouseLeave={() => setHoveredTaskId(null)}
                                    tabIndex={0}
                                  >
                                    {/* Status stripe on left edge */}
                                    <div
                                      className="absolute left-0 inset-y-0 w-1 rounded-l-md"
                                      style={{ backgroundColor: statusStyle.stripe }}
                                    />

                                    {/* Progress fill for in-progress tasks */}
                                    {task.status_slug === 'progress' && task.progress > 0 && (
                                      <div
                                        className="absolute left-0 inset-y-0 opacity-25 rounded-l-md"
                                        style={{
                                          width: `${task.progress}%`,
                                          backgroundColor: statusStyle.stripe,
                                        }}
                                      />
                                    )}

                                    {/* Bar content (V2 Spec: Self-contained) */}
                                    <div className="flex items-center gap-1.5 flex-1 min-w-0 relative z-10 ml-2 mr-1.5">
                                      {/* Task Key */}
                                      <span className="text-[11px] font-bold opacity-90 flex-shrink-0">
                                        {task.key}
                                      </span>

                                      {/* Task Title (if space) */}
                                      {showTitle && (
                                        <span
                                          className={cn(
                                            "text-xs font-medium truncate flex-1",
                                            task.status_slug === 'done' && "line-through opacity-70"
                                          )}
                                        >
                                          {task.title}
                                        </span>
                                      )}

                                      {/* Assignee avatar ON the bar (V2 Spec) */}
                                      <div
                                        className={cn(
                                          "w-5 h-5 rounded-full flex items-center justify-center",
                                          "text-[9px] font-bold flex-shrink-0 border-2",
                                          task.assignee_id
                                            ? "text-white border-white/70"
                                            : "bg-white/80 text-slate-400 border-slate-200"
                                        )}
                                        style={task.assignee_id ? { backgroundColor: task.workstream_color || '#64748b' } : undefined}
                                      >
                                        {task.assignee_initials || '—'}
                                      </div>
                                    </div>

                                    {/* Overdue badge (V2 Spec: Red circle with !) */}
                                    {task.is_overdue && (
                                      <div className="absolute -right-1.5 -top-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-sm">
                                        <span className="text-[9px] font-bold text-white">!</span>
                                      </div>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs p-3">
                                  <div className="space-y-2">
                                    <div className="font-semibold text-sm">
                                      {task.key}: {task.title}
                                    </div>
                                    <div className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">Status:</span>
                                        <span className="capitalize">{task.status_name}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">Workstream:</span>
                                        <span>{task.workstream_name || 'Unassigned'}</span>
                                      </div>
                                      {task.assignee_name && (
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">Assignee:</span>
                                          <span>{task.assignee_name}</span>
                                        </div>
                                      )}
                                      {task.start_date && task.due_date && (
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">Duration:</span>
                                          <span>
                                            {format(new Date(task.start_date), 'MMM d')} →{' '}
                                            {format(new Date(task.due_date), 'MMM d')}
                                          </span>
                                        </div>
                                      )}
                                      {task.progress > 0 && (
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">Progress:</span>
                                          <span>{task.progress}%</span>
                                        </div>
                                      )}
                                      {task.is_overdue && (
                                        <div className="text-red-500 font-medium mt-1 flex items-center gap-1">
                                          <AlertTriangle className="w-3 h-3" />
                                          Overdue
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            EMPTY STATE
            ============================================================ */}
        {!isLoading && filteredTasks.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-950/80 z-40">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-1">
                No tasks to display on timeline
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {hasActiveFilters ? 'Try adjusting your filters' : 'Tasks with start dates will appear here'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4">
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            LOADING STATE
            ============================================================ */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-950/80 z-40">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-500">Loading timeline...</span>
            </div>
          </div>
        )}

        {/* Create Task Modal */}
        <CreateTaskModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </div>
    </TooltipProvider>
  );
}
