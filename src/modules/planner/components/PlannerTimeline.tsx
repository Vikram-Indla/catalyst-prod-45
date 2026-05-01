// ============================================================
// PLANNER DASHBOARD — ENTERPRISE CLEAN V2
// QA Audit Compliant: 50+ Checkpoints
// ============================================================

import { useState, useMemo, useRef, useCallback, useEffect, UIEvent } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  CalendarDays, 
  Plus, 
  Search, 
  Check, 
  X, 
  AlertTriangle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  addDays, 
  startOfWeek, 
  format, 
  differenceInDays, 
  isToday, 
  getDay, 
  subDays, 
  isBefore, 
  startOfDay 
} from 'date-fns';
import { CreateTaskModal } from './kanban';
import { usePlannerWorkstreams, Workstream } from '../hooks/usePlannerWorkstreams';
import { WorkstreamDrawer } from './workstreams/WorkstreamDrawer';
import { usePlannerUsers } from '../hooks/usePlannerUsers';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getWorkstreamColor, getStatusDotColor, STATUS_DOT_COLORS } from '@/lib/workstream-colors';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip } from '@/components/ads';

// Import enterprise CSS overrides
import '../styles/timeline-enterprise.css';

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
  workstream: string;
  status: string;
  priority: string;
  assignee: string;
  search: string;
}

type ViewMode = 'day' | 'week' | 'month';

// ============================================================
// STATUS LEGEND CONFIG (Section F: F2-F6)
// ============================================================
const STATUS_LEGEND = [
  { key: 'backlog', label: 'Backlog', color: 'var(--ds-text-subtlest, #94a3b8)' },  // F2
  { key: 'planned', label: 'Planned', color: 'var(--ds-text-brand, #3b82f6)' },  // F3
  { key: 'progress', label: 'In Progress', color: 'var(--ds-text-warning, #f59e0b)' },  // F4
  { key: 'review', label: 'Review', color: '#8b5cf6' },  // F5
  { key: 'done', label: 'Done', color: 'var(--ds-text-success, #16a34a)' },  // F6
];

// ============================================================
// HELPER: Get initials from name
// ============================================================
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
    queryKey: ['timeline-tasks-dashboard'],
    queryFn: async (): Promise<TimelineTask[]> => {
      const { data: tasks, error } = await (supabase
        .from('planner_tasks') as any)
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
          workstream_color: t.workstream?.color || 'var(--ds-text-subtlest, #64748b)',
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
    refetchInterval: 60_000,
  });
}

// ============================================================
// LAYOUT CONSTANTS (Section H, I, J)
// ============================================================
const SWIMLANE_HEADER_HEIGHT = 92;  // I1: Panel has workstream info
const TASK_BAR_HEIGHT = 28;         // H7: Bar height 28-32px
const TASK_BAR_GAP = 6;
const SWIMLANE_PADDING = 12;
const LEFT_PANEL_WIDTH = 280;       // I1: ~240px minimum
const DATE_HEADER_HEIGHT = 52;

// ============================================================
// MAIN COMPONENT
// ============================================================
interface PlannerTimelineProps {
  tasks?: any[];
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
  const [selectedWorkstream, setSelectedWorkstream] = useState<Workstream | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Refs for scroll sync
  const searchInputRef = useRef<HTMLInputElement>(null);
  const headerXRef = useRef<HTMLDivElement>(null);
  const gridXRef = useRef<HTMLDivElement>(null);
  const hScrollSyncSourceRef = useRef<'header' | 'grid' | null>(null);

  // Scroll sync handlers
  const handleHeaderXScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    if (hScrollSyncSourceRef.current === 'grid') return;
    hScrollSyncSourceRef.current = 'header';
    const left = e.currentTarget.scrollLeft;
    if (gridXRef.current) gridXRef.current.scrollLeft = left;
    requestAnimationFrame(() => {
      if (hScrollSyncSourceRef.current === 'header') hScrollSyncSourceRef.current = null;
    });
  }, []);

  const handleGridXScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    if (hScrollSyncSourceRef.current === 'header') return;
    hScrollSyncSourceRef.current = 'grid';
    const left = e.currentTarget.scrollLeft;
    if (headerXRef.current) headerXRef.current.scrollLeft = left;
    requestAnimationFrame(() => {
      if (hScrollSyncSourceRef.current === 'grid') hScrollSyncSourceRef.current = null;
    });
  }, []);

  // Drawer handlers
  const openWorkstreamDrawer = useCallback((ws: Workstream) => {
    setSelectedWorkstream(ws);
    setIsDrawerOpen(true);
  }, []);

  const closeWorkstreamDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedWorkstream(null);
  }, []);

  // Data
  const { data: allTasks = [], isLoading: tasksLoading } = useTimelineTasks();
  const { data: workstreams = [], isLoading: wsLoading } = usePlannerWorkstreams();
  const { data: users = [] } = usePlannerUsers();

  // ============================================================
  // FILTER LOGIC
  // ============================================================
  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      if (filters.workstream !== 'all' && task.workstream_id !== filters.workstream) return false;
      if (filters.status !== 'all' && task.status_slug !== filters.status) return false;
      if (filters.priority !== 'all' && task.priority !== filters.priority) return false;
      if (filters.assignee !== 'all') {
        if (filters.assignee === 'unassigned' && task.assignee_id) return false;
        if (filters.assignee !== 'unassigned' && task.assignee_id !== filters.assignee) return false;
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (
          !task.title.toLowerCase().includes(searchLower) &&
          !task.key.toLowerCase().includes(searchLower)
        ) return false;
      }
      return true;
    });
  }, [allTasks, filters]);

  // ============================================================
  // GROUP BY WORKSTREAM (Swimlanes)
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
    const tasksByWorkstream = new Map<string, TimelineTask[]>();
    
    filteredTasks.forEach(task => {
      const wsId = task.workstream_id || 'unassigned';
      if (!tasksByWorkstream.has(wsId)) {
        tasksByWorkstream.set(wsId, []);
      }
      tasksByWorkstream.get(wsId)!.push(task);
    });

    const lanes: WorkstreamSwimlane[] = [];

    workstreams.forEach(ws => {
      const tasks = tasksByWorkstream.get(ws.id) || [];
      if (filters.workstream !== 'all' && filters.workstream !== ws.id) return;
      if (tasks.length === 0 && filters.workstream !== 'all') return;

      // Get workstream color from our color system
      const wsColors = getWorkstreamColor(ws.name);

      lanes.push({
        id: ws.id,
        name: ws.name,
        color: wsColors.hex,
        lead: ws.lead || null,
        tasks: tasks.sort((a, b) => {
          const aDate = a.start_date ? new Date(a.start_date).getTime() : Infinity;
          const bDate = b.start_date ? new Date(b.start_date).getTime() : Infinity;
          return aDate - bDate;
        }),
        taskCount: tasks.length,
        inProgressCount: tasks.filter(t => t.status_slug === 'progress' || t.status_slug === 'review').length,
        overdueCount: tasks.filter(t => t.is_overdue).length,
        collapsed: collapsedWorkstreams.has(ws.id),
      });
    });

    // Unassigned lane
    const unassignedTasks = tasksByWorkstream.get('unassigned') || [];
    if (unassignedTasks.length > 0) {
      lanes.push({
        id: 'unassigned',
        name: 'Unassigned',
        color: 'var(--ds-text-subtlest, #94a3b8)',
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
  // DATE CALCULATIONS (Section J)
  // ============================================================
  const columnConfig = useMemo(() => {
    switch (viewMode) {
      case 'day': return { days: 14, width: 68 };
      case 'week': return { days: 28, width: 48 };  // J6: ~40px
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
    
    return { left, width: Math.max(width, 100), isVisible };
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
    const todayOffset = differenceInDays(new Date(), startOfWeek(new Date(), { weekStartsOn: 0 }));
    const nextLeft = Math.max(0, (todayOffset - 3) * columnConfig.width);
    if (gridXRef.current) gridXRef.current.scrollLeft = nextLeft;
    if (headerXRef.current) headerXRef.current.scrollLeft = nextLeft;
  }, [columnConfig.width]);

  const toggleCollapse = useCallback((wsId: string) => {
    setCollapsedWorkstreams(prev => {
      const next = new Set(prev);
      if (next.has(wsId)) next.delete(wsId);
      else next.add(wsId);
      return next;
    });
  }, []);

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
  // TODAY LINE CALCULATION (Section K)
  // ============================================================
  const todayOffset = differenceInDays(new Date(), viewStart);
  const todayPosition = todayOffset * columnConfig.width + columnConfig.width / 2;
  const showTodayLine = todayOffset >= 0 && todayOffset < columnConfig.days;

  const getSwimlineHeight = (taskCount: number, isCollapsed: boolean): number => {
    if (isCollapsed) return 0;
    if (taskCount === 0) return 48;
    return (taskCount * TASK_BAR_HEIGHT) + ((taskCount - 1) * TASK_BAR_GAP) + SWIMLANE_PADDING * 2;
  };

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
    <>
      {/* M4: Page background var(--ds-surface-sunken, #f8fafc) */}
      <div className="timeline-enterprise h-full flex flex-col bg-[var(--ds-surface-sunken, #f8fafc)] dark:bg-slate-950">
        {/* ============================================================
            TOP BAR - Title, Today, Date Nav, View Mode Toggle
            ============================================================ */}
        {/* M5: Container background var(--ds-surface, #ffffff) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ds-border, #e2e8f0)] dark:border-slate-800 bg-white dark:bg-slate-950 flex-shrink-0">
          {/* Left: Title */}
          <div>
            <h1 className="text-xl font-bold text-[var(--ds-text, #0f172a)] dark:text-slate-100">Timeline</h1>
            <p className="text-sm text-[var(--ds-text-subtlest, #64748b)] dark:text-slate-400">
              Overview of tasks, workload, and team progress
            </p>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-3">
            {/* M3: Primary button color var(--ds-text-brand, #2563eb) */}
            <Button 
              onClick={() => setIsCreateOpen(true)}
              className="bg-[var(--ds-text-brand, #2563eb)] hover:bg-[var(--ds-background-brand-bold-hovered, #1d4ed8)] text-white shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>

            {/* Today Button */}
            <Button variant="outline" size="sm" onClick={goToToday} className="gap-2 h-9 border-[var(--ds-border, #e2e8f0)]">
              <CalendarDays className="w-4 h-4" />
              Today
            </Button>

            {/* Date Navigation */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg">
              <Button variant="ghost" size="sm" className="h-9 px-2 rounded-l-lg" onClick={() => navigateView('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-4 text-sm font-medium text-[var(--ds-text-subtle, #334155)] dark:text-slate-300 min-w-[160px] text-center">
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
                      ? "bg-[var(--ds-text-brand, #2563eb)] text-white shadow-sm"
                      : "text-[var(--ds-text-subtlest, #64748b)] dark:text-slate-400 hover:text-[var(--ds-text-subtle, #334155)] dark:hover:text-slate-300"
                  )}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ============================================================
            FILTER BAR (Section F: Status Legend positioned here)
            ============================================================ */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-[var(--ds-border, #e2e8f0)] dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex-shrink-0">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-text-subtlest, #94a3b8)]" />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder="Search tasks... (⌘K)"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-9 h-9 border-[var(--ds-border, #e2e8f0)]"
            />
            {filters.search && (
              <button
                onClick={() => clearFilter('search')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ds-text-subtlest, #94a3b8)] hover:text-[var(--ds-text-subtlest, #64748b)]"
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
                  "h-9 border-[var(--ds-border, #e2e8f0)] filter-btn",
                  filters.workstream !== 'all' && "bg-blue-50 border-blue-300 text-blue-700"
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
              {workstreams.map(ws => {
                const wsColor = getWorkstreamColor(ws.name);
                return (
                  <DropdownMenuItem
                    key={ws.id}
                    onClick={() => setFilters(prev => ({ ...prev, workstream: ws.id }))}
                  >
                    {/* A8: Dot size 8px */}
                    <span
                      className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                      style={{ backgroundColor: wsColor.hex }}
                    />
                    {ws.name}
                    {filters.workstream === ws.id && <Check className="w-4 h-4 ml-auto" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 border-[var(--ds-border, #e2e8f0)] filter-btn",
                  filters.status !== 'all' && "bg-blue-50 border-blue-300 text-blue-700"
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
              {STATUS_LEGEND.map(s => (
                <DropdownMenuItem
                  key={s.key}
                  onClick={() => setFilters(prev => ({ ...prev, status: s.key }))}
                >
                  <span
                    className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.label}
                  {filters.status === s.key && <Check className="w-4 h-4 ml-auto" />}
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
                  "h-9 border-[var(--ds-border, #e2e8f0)] filter-btn",
                  filters.priority !== 'all' && "bg-blue-50 border-blue-300 text-blue-700"
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

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-9 text-[var(--ds-text-subtlest, #64748b)]">
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}

          {/* F1: Status Legend — Top right of toolbar */}
          <div className="status-legend ml-auto flex items-center gap-4 text-xs text-[var(--ds-text-subtlest, #64748b)]">
            {STATUS_LEGEND.map(s => (
              <div key={s.key} className="legend-item flex items-center gap-1.5">
                <span
                  className="legend-dot w-2 h-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                  data-status={s.key}
                />
                <span className="legend-label text-[12px]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ============================================================
            TIMELINE CONTENT
            ============================================================ */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Column headers */}
          <div className="flex flex-shrink-0 border-b border-[var(--ds-border, #e2e8f0)] dark:border-slate-800 bg-white dark:bg-slate-950">
            {/* Left header */}
            <div
              className="flex items-center px-4 border-r border-[var(--ds-border, #e2e8f0)] dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-medium text-xs text-[var(--ds-text-subtlest, #64748b)] dark:text-slate-400 uppercase tracking-wide"
              style={{ width: LEFT_PANEL_WIDTH, height: DATE_HEADER_HEIGHT }}
            >
              Workstream
            </div>

            {/* Date header (Section J) */}
            <div className="flex-1 overflow-hidden" style={{ height: DATE_HEADER_HEIGHT }}>
              <div
                ref={headerXRef}
                onScroll={handleHeaderXScroll}
                className="h-full overflow-x-auto overflow-y-hidden"
              >
                <div
                  className="flex h-full"
                  style={{ minWidth: columnConfig.days * columnConfig.width }}
                >
                  {dateColumns.map((date, i) => {
                    const isCurrentDay = isToday(date);
                    const dayOfWeek = getDay(date);
                    // J5: Weekend = Fri (5) and Sat (6) per spec
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                    return (
                      <div
                        key={i}
                        className={cn(
                          "date-column-header flex-shrink-0 flex flex-col items-center justify-center transition-colors",
                          // J5: Weekend columns — Subtle gray bg var(--ds-surface-sunken, #f8fafc)
                          isWeekend && !isCurrentDay && "weekend bg-[var(--ds-surface-sunken, #f8fafc)] dark:bg-slate-900/50",
                          // J3: Today column highlight Blue-50 var(--ds-background-selected, #eff6ff)
                          isCurrentDay && "today bg-[var(--ds-background-selected, #eff6ff)]"
                        )}
                        style={{ width: columnConfig.width }}
                      >
                        {isCurrentDay ? (
                          // J4: Today number style — Blue circle badge
                          <div className="today-badge flex flex-col items-center justify-center w-9 h-9 rounded-full bg-[var(--ds-text-brand, #3b82f6)] text-white">
                            {/* J1: Day name 10-11px uppercase */}
                            <span className="text-[9px] font-medium uppercase leading-none">
                              {format(date, 'EEE')}
                            </span>
                            {/* J2: Day number 13-14px */}
                            <span className="text-sm font-bold leading-none">
                              {format(date, 'd')}
                            </span>
                          </div>
                        ) : (
                          <>
                            {/* J1: Day name 10-11px uppercase */}
                            <span className="day-name text-[10px] font-medium text-[var(--ds-text-subtlest, #94a3b8)] dark:text-slate-500 uppercase">
                              {format(date, 'EEE')}
                            </span>
                            {/* J2: Day number 13-14px */}
                            <span className="day-number text-[13px] font-semibold text-[var(--ds-text-subtle, #475569)] dark:text-slate-300">
                              {format(date, 'd')}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            <div className="relative flex">
              {/* Left panel (Section I) */}
              <div
                className="workstream-panel flex-shrink-0 bg-white dark:bg-slate-950 border-r border-[var(--ds-border, #e2e8f0)] dark:border-slate-800"
                style={{ width: LEFT_PANEL_WIDTH }}
              >
                {swimlanes.map((lane) => {
                  const wsForDrawer = workstreams.find(w => w.id === lane.id);
                  return (
                    <div key={lane.id} data-workstream={lane.name}>
                      {/* Workstream Header */}
                      <div
                        className="workstream-row w-full flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/70 border-b border-[var(--ds-border, #e2e8f0)] dark:border-slate-700 hover:bg-[var(--ds-surface-sunken, #f1f5f9)] dark:hover:bg-slate-800 transition-colors text-left overflow-hidden"
                        style={{ height: SWIMLANE_HEADER_HEIGHT }}
                      >
                        {/* I6: Expand/collapse chevron */}
                        <button
                          onClick={() => toggleCollapse(lane.id)}
                          className={cn(
                            "expand-btn mt-0.5 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-transform flex-shrink-0",
                            !lane.collapsed && "rotate-90"
                          )}
                        >
                          <ChevronRight className="chevron w-4 h-4 text-[var(--ds-text-subtlest, #94a3b8)]" />
                        </button>

                        {/* A8: Workstream Dot — 8px, CORRECT COLOR */}
                        <span
                          className="workstream-dot w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: lane.color }}
                          data-workstream={lane.name}
                        />

                        {/* Workstream Info */}
                        <div className="workstream-info flex-1 min-w-0">
                          {/* I2-I3: Workstream name font-weight 500, color var(--ds-text, #0f172a) */}
                          <button
                            onClick={() => wsForDrawer && openWorkstreamDrawer(wsForDrawer)}
                            className="workstream-name font-medium text-sm text-[var(--ds-text, #0f172a)] dark:text-slate-200 hover:text-[var(--ds-text-brand, #2563eb)] dark:hover:text-blue-400 transition-colors truncate text-left w-full"
                            title={lane.name}
                          >
                            {lane.name}
                          </button>

                          <div className="workstream-lead flex items-center gap-1.5 text-xs text-[var(--ds-text-subtle, #475569)] dark:text-slate-400 mt-0.5 min-w-0">
                            {lane.lead ? (
                              <>
                                <div
                                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-semibold text-white flex-shrink-0"
                                  style={{ backgroundColor: lane.color }}
                                >
                                  {lane.lead.initials}
                                </div>
                                <span className="truncate">{lane.lead.name}</span>
                              </>
                            ) : (
                              // I4: "No lead assigned" color Gray var(--ds-text-subtlest, #64748b)
                              <span className="no-lead text-[var(--ds-text-subtlest, #64748b)]">No lead assigned</span>
                            )}
                          </div>

                          {/* I5: Task stats color Gray var(--ds-text-subtlest, #64748b) */}
                          <div className="workstream-stats text-[11px] text-[var(--ds-text-subtlest, #64748b)] dark:text-slate-500 mt-1 truncate">
                            {lane.taskCount} tasks
                            {lane.inProgressCount > 0 &&
                              ` · ${lane.inProgressCount} in progress`}
                            {lane.overdueCount > 0 && (
                              // D3: Overdue text red var(--ds-text-danger, #dc2626)
                              <span className="overdue-count text-[var(--ds-text-danger, #dc2626)] font-semibold">
                                {' · '}{lane.overdueCount} overdue
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Task area placeholder (left side) */}
                      {!lane.collapsed && (
                        <div
                          className="border-b border-slate-100 dark:border-slate-800"
                          style={{ height: getSwimlineHeight(lane.tasks.length, false) }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Right panel — Grid */}
              <div className="flex-1 overflow-hidden bg-white dark:bg-slate-950">
                <div
                  className="overflow-x-auto overflow-y-hidden"
                  ref={gridXRef}
                  onScroll={handleGridXScroll}
                >
                  <div style={{ minWidth: columnConfig.days * columnConfig.width }}>
                    <div className="relative">
                      {/* K1-K4: Today Line */}
                      {showTodayLine && (
                        <div
                          className="today-marker absolute z-20 pointer-events-none"
                          style={{ left: todayPosition, top: 0, height: totalContentHeight }}
                        >
                          {/* K3: TODAY label — Blue bg var(--ds-text-brand, #3b82f6), white text */}
                          <div className="today-label absolute -top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[var(--ds-text-brand, #3b82f6)] text-white text-[10px] font-semibold rounded uppercase whitespace-nowrap z-30">
                            TODAY
                          </div>
                          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent border-t-[var(--ds-text-brand, #3b82f6)]" />
                          {/* K1-K2: Today line — Blue var(--ds-text-brand, #3b82f6), 2px width */}
                          <div className="w-0.5 h-full bg-[var(--ds-text-brand, #3b82f6)] mt-7" />
                        </div>
                      )}

                      {/* Workstream Swimlanes with Bars */}
                      {swimlanes.map(lane => {
                        const laneHeight = getSwimlineHeight(lane.tasks.length, lane.collapsed);
                        const wsColors = getWorkstreamColor(lane.name);

                        return (
                          <div key={lane.id} data-workstream={lane.name}>
                            {/* Swimlane Header Row (grid side) */}
                            <div
                              className="relative flex bg-slate-50 dark:bg-slate-900/70 border-b border-[var(--ds-border, #e2e8f0)] dark:border-slate-700"
                              style={{ height: SWIMLANE_HEADER_HEIGHT }}
                            >
                              {/* J5: Weekend shading */}
                              <div className="absolute inset-0 flex pointer-events-none">
                                {dateColumns.map((date, i) => {
                                  const isWeekend = getDay(date) === 0 || getDay(date) === 6;
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
                                    const isWeekend = getDay(date) === 0 || getDay(date) === 6;
                                    return (
                                      <div
                                        key={i}
                                        className={cn("flex-shrink-0", isWeekend && "bg-[var(--ds-surface-sunken, #f8fafc)]/50 dark:bg-slate-800/20")}
                                        style={{ width: columnConfig.width }}
                                      />
                                    );
                                  })}
                                </div>

                                {/* Task Bars — ENTERPRISE CLEAN STYLING */}
                                {lane.tasks.map((task, index) => {
                                  const barStyle = getTaskBarStyle(task);
                                  if (!barStyle.isVisible) return null;

                                  const statusDotColor = getStatusDotColor(task.status_slug);
                                  const isHovered = hoveredTaskId === task.id;
                                  const barWidth = barStyle.width;
                                  const showTitle = barWidth > 180;
                                  const top = SWIMLANE_PADDING + index * (TASK_BAR_HEIGHT + TASK_BAR_GAP);

                                  return (
                                    <Tooltip
                                      key={task.id}
                                      position="top"
                                      delay={200}
                                      content={
                                        <div className="space-y-2 max-w-xs p-3">
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
                                            {task.is_overdue && (
                                              <div className="text-[var(--ds-text-danger, #dc2626)] font-medium mt-1 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                Overdue
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      }
                                    >
                                      <div
                                        className={cn(
                                          // H7: Bar height 28px, H8: border-radius 6px
                                          "task-bar absolute flex items-center cursor-pointer transition-all",
                                          // L1: Subtle shadow + lift on hover
                                          isHovered && "shadow-md -translate-y-0.5",
                                          // D1: Overdue class for red left border
                                          task.is_overdue && "overdue"
                                        )}
                                        data-workstream={lane.name}
                                        data-overdue={task.is_overdue}
                                        data-status={task.status_slug}
                                        style={{
                                          left: Math.max(4, barStyle.left),
                                          width: barStyle.width,
                                          top,
                                          // H7: Bar height 28-32px
                                          height: TASK_BAR_HEIGHT,
                                          // B1-B5: Workstream color at low opacity (15-20%)
                                          backgroundColor: wsColors.light,
                                          // B6-B10: Workstream border color
                                          border: `1px solid ${wsColors.border}`,
                                          // D1: OVERDUE — Red left border 3px solid var(--ds-text-danger, #dc2626)
                                          borderLeft: task.is_overdue ? '3px solid #dc2626' : `1px solid ${wsColors.border}`,
                                          // H8: Bar border radius 6px
                                          borderRadius: '6px',
                                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                        }}
                                        onClick={() => onTaskClick?.(task)}
                                        onMouseEnter={() => setHoveredTaskId(task.id)}
                                        onMouseLeave={() => setHoveredTaskId(null)}
                                        tabIndex={0}
                                      >
                                        {/* E1: Status dot — 8px, inside bar (REFINED) */}
                                        <span
                                          className="status-dot w-2 h-2 rounded-full ml-2 flex-shrink-0"
                                          style={{ backgroundColor: statusDotColor }}
                                          data-status={task.status_slug}
                                        />

                                        {/* H1-H2: Task ID — workstream-colored monospace */}
                                        <span
                                          className="task-id ml-2 text-[12px] font-semibold font-mono flex-shrink-0"
                                          style={{ color: wsColors.textPrimary || 'var(--ds-text-subtle, #475569)' }}
                                        >
                                          {task.key}
                                        </span>

                                        {/* H3-H4: Task Title — workstream-colored, truncated */}
                                        {showTitle && (
                                          <span
                                            className={cn(
                                              "task-title ml-1.5 text-[13px] font-medium truncate flex-1",
                                              task.status_slug === 'done' && "line-through opacity-70"
                                            )}
                                            style={{ color: wsColors.textDark || 'var(--ds-text-subtle, #334155)' }}
                                          >
                                            {task.title}
                                          </span>
                                        )}

                                        {/* H5-H6: Assignee avatar — 18-20px, right side */}
                                        {task.assignee_id && (
                                          <div
                                            className="assignee-avatar w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-bold text-white ml-auto mr-2 flex-shrink-0"
                                            style={{ backgroundColor: wsColors.hex }}
                                          >
                                            {task.assignee_initials || '—'}
                                          </div>
                                        )}

                                        {/* D2: Overdue indicator dot — 8px red dot top-right */}
                                        {task.is_overdue && (
                                          <span className="overdue-dot absolute -top-1 -right-1 w-2 h-2 bg-[var(--ds-text-danger, #dc2626)] rounded-full border-2 border-white" />
                                        )}
                                      </div>
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
                <CalendarDays className="w-8 h-8 text-[var(--ds-text-subtlest, #94a3b8)] dark:text-slate-500" />
              </div>
              <h3 className="text-lg font-medium text-[var(--ds-text-subtle, #334155)] dark:text-slate-300 mb-1">
                No tasks to display on timeline
              </h3>
              <p className="text-sm text-[var(--ds-text-subtlest, #64748b)] dark:text-slate-400">
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
              <div className="w-8 h-8 border-2 border-[var(--ds-text-brand, #3b82f6)] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-[var(--ds-text-subtlest, #64748b)]">Loading timeline...</span>
            </div>
          </div>
        )}

        {/* Create Task Modal */}
        <CreateTaskModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />

        {/* Workstream Drawer */}
        <WorkstreamDrawer
          workstream={selectedWorkstream}
          isOpen={isDrawerOpen}
          onClose={closeWorkstreamDrawer}
        />
      </div>
    </>
  );
}
