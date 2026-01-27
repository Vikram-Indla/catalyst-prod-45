// ============================================================
// PLANNER TIMELINE (GANTT) VIEW - V9 ENTERPRISE GOD-TIER
// Full redesign matching reference: left panel + rich bars
// ============================================================

import { useState, useMemo, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, CalendarDays, Menu, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { PlannerTask, GroupByOption } from '../types';
import { addDays, startOfWeek, format, differenceInDays, isToday, getDay, subDays, isBefore, startOfDay } from 'date-fns';
import { PlannerSearchBar } from './PlannerSearchBar';
import { CreateTaskModal } from './kanban';
import { usePlannerWorkstreams } from '../hooks/usePlannerWorkstreams';
import { usePlannerUsers } from '../hooks/usePlannerUsers';
import { usePlannerSearch } from '../hooks/usePlannerSearch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PlannerTimelineProps {
  tasks: PlannerTask[];
  onTaskClick: (task: PlannerTask) => void;
}

type ViewMode = 'day' | 'week' | 'month';

// ============================================================
// WORKSTREAM COLOR PALETTE (Catalyst V5 Design System)
// ============================================================
const WORKSTREAM_COLORS: Record<string, { bar: string; barLight: string; dot: string }> = {
  'Catalyst': { bar: '#8b5cf6', barLight: '#c4b5fd', dot: '#7c3aed' },
  'Senaie': { bar: '#06b6d4', barLight: '#67e8f9', dot: '#0891b2' },
  'Delivery': { bar: '#f97316', barLight: '#fdba74', dot: '#ea580c' },
  'MIM': { bar: '#ec4899', barLight: '#f9a8d4', dot: '#db2777' },
  'Data & AI': { bar: '#10b981', barLight: '#6ee7b7', dot: '#059669' },
  'Tahommona': { bar: '#6366f1', barLight: '#a5b4fc', dot: '#4f46e5' },
  'Stand-Alone': { bar: '#64748b', barLight: '#94a3b8', dot: '#475569' },
};

const DEFAULT_COLOR = { bar: '#64748b', barLight: '#94a3b8', dot: '#475569' };

// Status badge colors
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'backlog': { bg: '#e2e8f0', text: '#475569' },
  'planned': { bg: '#fef3c7', text: '#b45309' },
  'in-progress': { bg: '#dbeafe', text: '#1d4ed8' },
  'in_progress': { bg: '#dbeafe', text: '#1d4ed8' },
  'in-review': { bg: '#f3e8ff', text: '#7c3aed' },
  'in_review': { bg: '#f3e8ff', text: '#7c3aed' },
  'done': { bg: '#dcfce7', text: '#166534' },
};

function getWorkstreamColor(workstreamName: string | undefined) {
  if (!workstreamName) return DEFAULT_COLOR;
  for (const [key, colors] of Object.entries(WORKSTREAM_COLORS)) {
    if (workstreamName.toLowerCase().includes(key.toLowerCase())) {
      return colors;
    }
  }
  return DEFAULT_COLOR;
}

function getStatusColor(status: string | undefined) {
  if (!status) return STATUS_COLORS['backlog'];
  const normalizedStatus = status.toLowerCase().replace(/_/g, '-');
  return STATUS_COLORS[normalizedStatus] || STATUS_COLORS['backlog'];
}

// ============================================================
// TIMELINE COMPONENT
// ============================================================
export function PlannerTimeline({ tasks, onTaskClick }: PlannerTimelineProps) {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [viewStart, setViewStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupByOption | 'none'>('none');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Data hooks
  const { data: teams = [] } = usePlannerWorkstreams();
  const { data: users = [] } = usePlannerUsers();

  // Search and filter
  const {
    filters,
    filteredTasks,
    setSearch,
    setStatusFilter,
    setPriorityFilter,
    setAssigneeFilter,
    setBlockedFilter,
    setOverdueFilter,
    clearFilters,
    hasActiveFilters,
    totalCount,
    filteredCount,
  } = usePlannerSearch(tasks);

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
  // TASK GROUPING WITH STATUS SUMMARY
  // ============================================================
  const groupedTasks = useMemo(() => {
    const groups = new Map<string, PlannerTask[]>();
    
    filteredTasks.forEach(task => {
      const groupKey = task.teamName || 'Unassigned';
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(task);
    });

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, tasks]) => {
        // Calculate status summary
        const statusCounts = tasks.reduce((acc, task) => {
          const status = task.status?.toLowerCase().replace(/_/g, '-') || 'backlog';
          if (status === 'done') acc.done++;
          else if (status === 'in-progress' || status === 'in-review') acc.inProgress++;
          else acc.other++;
          return acc;
        }, { done: 0, inProgress: 0, other: 0 });

        return {
          name,
          tasks: tasks.sort((a, b) => {
            const aDate = a.startDate ? new Date(a.startDate).getTime() : Infinity;
            const bDate = b.startDate ? new Date(b.startDate).getTime() : Infinity;
            return aDate - bDate;
          }),
          summary: statusCounts,
        };
      });
  }, [filteredTasks]);

  // ============================================================
  // BAR POSITION CALCULATIONS
  // ============================================================
  const getTaskBarStyle = useCallback((task: PlannerTask) => {
    const startDate = task.startDate ? new Date(task.startDate) : new Date();
    const endDate = task.dueDate ? new Date(task.dueDate) : addDays(startDate, 5);
    
    const startOffset = differenceInDays(startDate, viewStart);
    const duration = Math.max(1, differenceInDays(endDate, startDate) + 1);
    
    const left = startOffset * columnConfig.width;
    const width = duration * columnConfig.width;
    
    const isVisible = startOffset + duration > 0 && startOffset < columnConfig.days;
    
    return { left, width: Math.max(width, 60), isVisible };
  }, [viewStart, columnConfig]);

  // Check if task is overdue
  const isOverdue = useCallback((task: PlannerTask) => {
    if (!task.dueDate) return false;
    const status = task.status?.toLowerCase().replace(/_/g, '-');
    if (status === 'done') return false;
    return isBefore(new Date(task.dueDate), startOfDay(new Date()));
  }, []);

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

  // Toggle group collapse
  const toggleGroup = useCallback((groupName: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  }, []);

  // ============================================================
  // TODAY LINE CALCULATION
  // ============================================================
  const todayOffset = differenceInDays(new Date(), viewStart);
  const todayPosition = todayOffset * columnConfig.width + columnConfig.width / 2;
  const showTodayLine = todayOffset >= 0 && todayOffset < columnConfig.days;

  // Layout constants
  const ROW_HEIGHT = 48;
  const HEADER_HEIGHT = 52;
  const LEFT_PANEL_WIDTH = 280;

  // Calculate total height for today line
  let totalRows = 0;
  groupedTasks.forEach(group => {
    totalRows += 1; // header
    if (!collapsedGroups.has(group.name)) {
      totalRows += group.tasks.length;
    }
  });
  const totalContentHeight = totalRows * ROW_HEIGHT;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-full flex flex-col bg-white dark:bg-slate-950">
        {/* ============================================================
            TOP BAR - Title, Today, Date Nav, View Mode Toggle
            ============================================================ */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          {/* Left: Title */}
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Timeline</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Gantt chart view with task dependencies</p>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-3">
            {/* Add Task Button */}
            <Button 
              onClick={() => setIsCreateOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/30"
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
            FILTER BAR - Search, Workstream, Status, Priority, etc.
            ============================================================ */}
        <PlannerSearchBar
          filters={filters}
          onSearchChange={setSearch}
          onStatusChange={setStatusFilter}
          onPriorityChange={setPriorityFilter}
          onAssigneeChange={setAssigneeFilter}
          onBlockedChange={setBlockedFilter}
          onOverdueChange={setOverdueFilter}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
          filteredCount={filteredCount}
          totalCount={totalCount}
          inputRef={searchInputRef}
          teams={teams}
          users={users}
          selectedTeamId={selectedTeamId}
          onTeamChange={setSelectedTeamId}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          showColumnsButton={false}
        />

        {/* ============================================================
            TIMELINE GRID CONTENT - Split panel layout
            ============================================================ */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Task Info */}
          <div 
            className="flex-shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-y-auto"
            style={{ width: LEFT_PANEL_WIDTH }}
          >
            {/* Header */}
            <div 
              className="sticky top-0 z-10 flex items-center px-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide"
              style={{ height: HEADER_HEIGHT }}
            >
              Task
            </div>

            {/* Task Rows */}
            {groupedTasks.map(group => {
              const colors = getWorkstreamColor(group.name);
              const isCollapsed = collapsedGroups.has(group.name);

              return (
                <div key={group.name}>
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.name)}
                    className="w-full flex items-center gap-2 px-4 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <ChevronDown 
                      className={cn(
                        "w-4 h-4 text-slate-400 transition-transform",
                        isCollapsed && "-rotate-90"
                      )} 
                    />
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: colors.dot }}
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      {group.name}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-500">
                      ({group.tasks.length})
                    </span>
                    <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">
                      {group.summary.inProgress > 0 && `${group.summary.inProgress} in progress`}
                      {group.summary.inProgress > 0 && group.summary.done > 0 && ' · '}
                      {group.summary.done > 0 && `${group.summary.done} done`}
                    </span>
                  </button>

                  {/* Task Rows */}
                  {!isCollapsed && group.tasks.map(task => {
                    const statusColors = getStatusColor(task.status);
                    const taskIsOverdue = isOverdue(task);

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-center gap-3 px-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors",
                          hoveredTaskId === task.id 
                            ? "bg-slate-50 dark:bg-slate-900" 
                            : "bg-white dark:bg-slate-950",
                          taskIsOverdue && "bg-red-50/50 dark:bg-red-950/20"
                        )}
                        style={{ height: ROW_HEIGHT }}
                        onMouseEnter={() => setHoveredTaskId(task.id)}
                        onMouseLeave={() => setHoveredTaskId(null)}
                        onClick={() => onTaskClick(task)}
                      >
                        {/* Task Key */}
                        <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400 w-[60px] flex-shrink-0">
                          {task.key}
                        </span>
                        
                        {/* Status Badge */}
                        <span 
                          className="text-[10px] font-semibold px-2 py-0.5 rounded uppercase flex-shrink-0"
                          style={{
                            backgroundColor: statusColors.bg,
                            color: statusColors.text,
                          }}
                        >
                          {task.status?.replace(/-|_/g, ' ') || 'BACKLOG'}
                        </span>

                        {/* Assignee Avatar */}
                        {task.assigneeInitials && (
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: colors.bar }}
                          >
                            {task.assigneeInitials}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Right Panel - Gantt Chart */}
          <div className="flex-1 overflow-auto" ref={gridRef}>
            <div style={{ minWidth: columnConfig.days * columnConfig.width }}>
              {/* Date Header Row */}
              <div
                className="flex sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                style={{ height: HEADER_HEIGHT }}
              >
                {dateColumns.map((date, i) => {
                  const isCurrentDay = isToday(date);
                  const dayOfWeek = getDay(date);
                  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Saudi weekend (Fri/Sat)
                  
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-shrink-0 flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-800 transition-colors",
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
                      {/* "TODAY" label under blue circle */}
                      {isCurrentDay && (
                        <span className="text-[8px] font-bold text-blue-600 uppercase mt-0.5">Today</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Grid Body with Bars */}
              <div className="relative">
                {/* Today Line - Full height vertical line */}
                {showTodayLine && (
                  <div
                    className="absolute z-20 pointer-events-none"
                    style={{ left: todayPosition, top: 0, height: totalContentHeight }}
                  >
                    <div className="w-0.5 h-full bg-blue-500" />
                  </div>
                )}

                {/* Workstream Groups with Bars */}
                {groupedTasks.map(group => {
                  const colors = getWorkstreamColor(group.name);
                  const isCollapsed = collapsedGroups.has(group.name);
                  
                  return (
                    <div key={group.name}>
                      {/* Workstream Header Row */}
                      <div
                        className="relative flex bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-700"
                        style={{ height: ROW_HEIGHT }}
                      >
                        {/* Background Grid for header */}
                        <div className="absolute inset-0 flex pointer-events-none">
                          {dateColumns.map((date, i) => {
                            const isWeekend = getDay(date) === 5 || getDay(date) === 6;
                            return (
                              <div
                                key={i}
                                className={cn(
                                  "flex-shrink-0 border-r border-slate-100 dark:border-slate-800",
                                  isWeekend && "bg-slate-100/50 dark:bg-slate-800/30"
                                )}
                                style={{ width: columnConfig.width }}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Task Rows with Gantt Bars */}
                      {!isCollapsed && group.tasks.map(task => {
                        const barStyle = getTaskBarStyle(task);
                        const isHovered = hoveredTaskId === task.id;
                        const progress = Math.min(100, Math.max(0, task.progress || 0));
                        const taskIsOverdue = isOverdue(task);
                        const barWidth = barStyle.width;
                        const showTitle = barWidth > 180;
                        const showProgress = barWidth > 100 && progress > 0;

                        return (
                          <div
                            key={task.id}
                            className={cn(
                              "relative border-b border-slate-100 dark:border-slate-800 transition-colors",
                              isHovered ? "bg-blue-50/50 dark:bg-blue-950/20" : "bg-white dark:bg-slate-950",
                              taskIsOverdue && "bg-red-50/30 dark:bg-red-950/10"
                            )}
                            style={{ height: ROW_HEIGHT }}
                            onMouseEnter={() => setHoveredTaskId(task.id)}
                            onMouseLeave={() => setHoveredTaskId(null)}
                          >
                            {/* Background Grid */}
                            <div className="absolute inset-0 flex pointer-events-none">
                              {dateColumns.map((date, i) => {
                                const isWeekend = getDay(date) === 5 || getDay(date) === 6;
                                return (
                                  <div
                                    key={i}
                                    className={cn(
                                      "flex-shrink-0 border-r border-slate-100 dark:border-slate-800",
                                      isWeekend && "bg-slate-50/50 dark:bg-slate-800/20"
                                    )}
                                    style={{ width: columnConfig.width }}
                                  />
                                );
                              })}
                            </div>

                            {/* Gantt Bar with full info */}
                            {barStyle.isVisible && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      "absolute cursor-pointer group rounded-md overflow-hidden shadow-sm transition-all",
                                      isHovered && "shadow-md scale-[1.02]",
                                      taskIsOverdue && "ring-2 ring-red-400 ring-offset-1"
                                    )}
                                    style={{
                                      left: Math.max(4, barStyle.left),
                                      width: barStyle.width,
                                      top: 6,
                                      bottom: 6,
                                      backgroundColor: colors.bar,
                                    }}
                                    onClick={() => onTaskClick(task)}
                                  >
                                    {/* Progress Fill */}
                                    {progress > 0 && (
                                      <div
                                        className="absolute inset-y-0 left-0 opacity-30"
                                        style={{
                                          width: `${progress}%`,
                                          backgroundColor: '#000',
                                        }}
                                      />
                                    )}

                                    {/* Bar Content */}
                                    <div className="relative h-full flex items-center gap-2 px-2 text-white">
                                      {/* Assignee Avatar */}
                                      {task.assigneeInitials && (
                                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                          {task.assigneeInitials}
                                        </div>
                                      )}

                                      {/* Task Key */}
                                      <span className="font-mono text-xs font-semibold flex-shrink-0">
                                        {task.key}
                                      </span>

                                      {/* Task Title (if space) */}
                                      {showTitle && (
                                        <span className="text-xs truncate opacity-90">
                                          {task.title}
                                        </span>
                                      )}

                                      {/* Progress % (if space) */}
                                      {showProgress && (
                                        <span className="ml-auto text-xs font-semibold bg-white/20 px-1.5 py-0.5 rounded flex-shrink-0">
                                          {progress}%
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs p-3">
                                  <div className="space-y-2">
                                    <div className="font-semibold text-sm">{task.key}: {task.title}</div>
                                    <div className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">Status:</span>
                                        <span className="capitalize">{task.status?.replace(/-|_/g, ' ') || 'Backlog'}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">Workstream:</span>
                                        <span>{task.teamName || 'Unassigned'}</span>
                                      </div>
                                      {task.assigneeName && (
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">Assignee:</span>
                                          <span>{task.assigneeName}</span>
                                        </div>
                                      )}
                                      {task.startDate && task.dueDate && (
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">Duration:</span>
                                          <span>{format(new Date(task.startDate), 'MMM d')} → {format(new Date(task.dueDate), 'MMM d')}</span>
                                        </div>
                                      )}
                                      {progress > 0 && (
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">Progress:</span>
                                          <span>{progress}%</span>
                                        </div>
                                      )}
                                      {taskIsOverdue && (
                                        <div className="text-red-500 font-medium mt-1">⚠️ Overdue</div>
                                      )}
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        );
                      })}
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
        {filteredTasks.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-950/80 z-40">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-1">
                No tasks to display on timeline
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tasks with start dates will appear here
              </p>
            </div>
          </div>
        )}

        {/* Create Task Modal */}
        <CreateTaskModal
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
        />
      </div>
    </TooltipProvider>
  );
}
