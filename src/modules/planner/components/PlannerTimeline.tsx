// ============================================================
// PLANNER TIMELINE (GANTT) VIEW - V2 ENTERPRISE STYLE
// Workstream-grouped Gantt chart with colored bars
// ============================================================

import { useState, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { PlannerTask, GroupByOption } from '../types';
import { addDays, startOfWeek, format, differenceInDays, isToday, isSameMonth } from 'date-fns';
import { getWorkstreamColor } from '@/lib/workstream-colors';
import { PlannerSearchBar } from './PlannerSearchBar';
import { usePlannerWorkstreams } from '../hooks/usePlannerWorkstreams';
import { usePlannerUsers } from '../hooks/usePlannerUsers';
import { usePlannerSearch } from '../hooks/usePlannerSearch';

interface PlannerTimelineProps {
  tasks: PlannerTask[];
  onTaskClick: (task: PlannerTask) => void;
}

type ZoomLevel = 'day' | 'week' | 'month';

// Workstream color palette for the reference design
const WORKSTREAM_BAR_COLORS: Record<string, { primary: string; progress: string; dot: string }> = {
  'Catalyst Track': { primary: '#a78bfa', progress: '#c4b5fd', dot: '#8b5cf6' }, // Purple
  'Senaie Track': { primary: '#22d3ee', progress: '#67e8f9', dot: '#06b6d4' }, // Cyan
  'Delivery Track': { primary: '#fb923c', progress: '#fdba74', dot: '#f97316' }, // Orange
  'MIM Website': { primary: '#f472b6', progress: '#f9a8d4', dot: '#ec4899' }, // Pink
  'MIM Website Track': { primary: '#f472b6', progress: '#f9a8d4', dot: '#ec4899' }, // Pink
  'Data & AI Track': { primary: '#34d399', progress: '#6ee7b7', dot: '#10b981' }, // Green
  'Tahommona Track': { primary: '#818cf8', progress: '#a5b4fc', dot: '#6366f1' }, // Indigo
  'Stand-Alone Projects Track': { primary: '#94a3b8', progress: '#cbd5e1', dot: '#64748b' }, // Slate
};

const DEFAULT_BAR_COLOR = { primary: '#94a3b8', progress: '#cbd5e1', dot: '#64748b' };

function getBarColors(workstream: string | undefined) {
  if (!workstream) return DEFAULT_BAR_COLOR;
  return WORKSTREAM_BAR_COLORS[workstream] || DEFAULT_BAR_COLOR;
}

export function PlannerTimeline({ tasks, onTaskClick }: PlannerTimelineProps) {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
  const [viewStart, setViewStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Local state for filters
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupByOption | 'none'>('none');

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

  // Generate date columns based on zoom level
  const dateColumns = useMemo(() => {
    const columns: Date[] = [];
    const numDays = zoomLevel === 'day' ? 14 : zoomLevel === 'week' ? 28 : 60;
    
    for (let i = 0; i < numDays; i++) {
      columns.push(addDays(viewStart, i));
    }
    return columns;
  }, [viewStart, zoomLevel]);

  // Column width based on zoom
  const columnWidth = zoomLevel === 'day' ? 60 : zoomLevel === 'week' ? 48 : 24;

  // Group tasks by workstream
  const groupedTasks = useMemo(() => {
    const groups: Map<string, PlannerTask[]> = new Map();
    
    filteredTasks.forEach(task => {
      const workstream = task.teamName || 'Unassigned';
      if (!groups.has(workstream)) {
        groups.set(workstream, []);
      }
      groups.get(workstream)!.push(task);
    });

    // Sort groups by name
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredTasks]);

  // Calculate bar position and width for each task
  const getTaskBar = (task: PlannerTask) => {
    const startDate = task.startDate ? new Date(task.startDate) : new Date();
    const endDate = task.dueDate ? new Date(task.dueDate) : addDays(startDate, 5);
    
    const startOffset = differenceInDays(startDate, viewStart);
    const duration = Math.max(1, differenceInDays(endDate, startDate) + 1);
    
    return {
      left: Math.max(0, startOffset * columnWidth),
      width: duration * columnWidth,
      isVisible: startOffset + duration > 0 && startOffset < dateColumns.length,
    };
  };

  const navigateView = (direction: 'prev' | 'next') => {
    const days = zoomLevel === 'day' ? 7 : zoomLevel === 'week' ? 14 : 30;
    setViewStart(prev => addDays(prev, direction === 'next' ? days : -days));
  };

  const goToToday = () => {
    setViewStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
  };

  // Calculate today line position
  const todayOffset = differenceInDays(new Date(), viewStart);
  const todayPosition = todayOffset * columnWidth + columnWidth / 2;
  const showTodayLine = todayOffset >= 0 && todayOffset < dateColumns.length;

  // Calculate total content height for today line
  let totalRows = 0;
  groupedTasks.forEach(([, tasks]) => {
    totalRows += 1 + tasks.length; // 1 header + tasks
  });
  const rowHeight = 48;
  const headerHeight = 32;
  const totalContentHeight = totalRows * rowHeight;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Menu className="h-5 w-5 text-slate-500" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Timeline</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Gantt chart view with task dependencies</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={goToToday} className="h-9">
            <CalendarDays className="w-4 h-4 mr-2" />
            Today
          </Button>
          
          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
            <Button variant="ghost" size="sm" onClick={() => navigateView('prev')} className="h-9 px-2">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[160px] text-center">
              {format(viewStart, 'MMM d')} - {format(addDays(viewStart, dateColumns.length - 1), 'MMM d, yyyy')}
            </span>
            <Button variant="ghost" size="sm" onClick={() => navigateView('next')} className="h-9 px-2">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            {(['day', 'week', 'month'] as const).map(level => (
              <button
                key={level}
                onClick={() => setZoomLevel(level)}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
                  zoomLevel === level 
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                {level === 'day' ? 'Day' : level === 'week' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
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

      {/* Timeline Content */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-h-full">
          {/* Left Panel - Task Keys */}
          <div className="w-[140px] flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div 
              className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 flex items-center px-4"
              style={{ height: headerHeight }}
            >
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Tasks ({filteredTasks.length})
              </span>
            </div>

            {/* Workstream Groups */}
            {groupedTasks.map(([workstream, wsTasksInGroup]) => {
              const colors = getBarColors(workstream);
              
              return (
                <div key={workstream}>
                  {/* Workstream Header */}
                  <div 
                    className="flex items-center gap-2 px-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800"
                    style={{ height: rowHeight }}
                  >
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: colors.dot }}
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide truncate">
                      {workstream.replace(' Track', '').toUpperCase()}
                    </span>
                  </div>

                  {/* Task Keys */}
                  {wsTasksInGroup.map((task) => (
                    <div 
                      key={task.id}
                      className={cn(
                        "flex items-center px-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors",
                        hoveredTaskId === task.id ? "bg-slate-100 dark:bg-slate-800" : "bg-white dark:bg-slate-950"
                      )}
                      style={{ height: rowHeight }}
                      onClick={() => onTaskClick(task)}
                      onMouseEnter={() => setHoveredTaskId(task.id)}
                      onMouseLeave={() => setHoveredTaskId(null)}
                    >
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        {task.key}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Gantt Chart Area */}
          <div className="flex-1 overflow-x-auto relative">
            {/* Date Headers */}
            <div 
              className="flex sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
              style={{ height: headerHeight }}
            >
              {dateColumns.map((date, i) => {
                const isCurrentDay = isToday(date);
                const dayOfWeek = date.getDay();
                const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Saudi weekend
                
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex-shrink-0 flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-800",
                      isCurrentDay && "bg-blue-500 text-white rounded-full",
                      isWeekend && !isCurrentDay && "bg-slate-50 dark:bg-slate-900"
                    )}
                    style={{ 
                      width: columnWidth,
                      ...(isCurrentDay ? { 
                        backgroundColor: '#3b82f6',
                        borderRadius: '50%',
                        margin: '2px',
                        width: columnWidth - 4,
                      } : {})
                    }}
                  >
                    <span className={cn(
                      "text-[10px] font-medium uppercase",
                      isCurrentDay ? "text-white" : "text-slate-400 dark:text-slate-500"
                    )}>
                      {format(date, 'EEE')}
                    </span>
                    <span className={cn(
                      "text-sm font-semibold",
                      isCurrentDay ? "text-white" : "text-slate-600 dark:text-slate-300"
                    )}>
                      {format(date, 'd')}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Grid and Bars */}
            <div className="relative" style={{ minWidth: dateColumns.length * columnWidth }}>
              {/* Today Line */}
              {showTodayLine && (
                <div 
                  className="absolute z-30 pointer-events-none"
                  style={{ 
                    left: todayPosition,
                    top: 0,
                    height: totalContentHeight,
                  }}
                >
                  <div 
                    className="w-0.5 h-full"
                    style={{
                      background: 'repeating-linear-gradient(to bottom, #3b82f6 0, #3b82f6 4px, transparent 4px, transparent 8px)',
                    }}
                  />
                </div>
              )}

              {/* Workstream Groups with Bars */}
              {groupedTasks.map(([workstream, wsTasksInGroup]) => {
                const colors = getBarColors(workstream);
                
                return (
                  <div key={workstream}>
                    {/* Workstream Header Row */}
                    <div 
                      className="relative flex bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800"
                      style={{ height: rowHeight }}
                    >
                      {/* Background grid */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {dateColumns.map((date, i) => {
                          const isWeekend = date.getDay() === 5 || date.getDay() === 6;
                          return (
                            <div
                              key={i}
                              className={cn(
                                "flex-shrink-0 border-r border-slate-100 dark:border-slate-800",
                                isWeekend && "bg-slate-100/50 dark:bg-slate-800/30"
                              )}
                              style={{ width: columnWidth }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Task Rows with Bars */}
                    {wsTasksInGroup.map((task) => {
                      const bar = getTaskBar(task);
                      const isHovered = hoveredTaskId === task.id;
                      const progress = Math.min(100, Math.max(0, task.progress || 0));

                      return (
                        <div 
                          key={task.id}
                          className={cn(
                            "relative border-b border-slate-100 dark:border-slate-800 transition-colors",
                            isHovered ? "bg-slate-50 dark:bg-slate-900" : "bg-white dark:bg-slate-950"
                          )}
                          style={{ height: rowHeight }}
                          onMouseEnter={() => setHoveredTaskId(task.id)}
                          onMouseLeave={() => setHoveredTaskId(null)}
                        >
                          {/* Background grid */}
                          <div className="absolute inset-0 flex pointer-events-none">
                            {dateColumns.map((date, i) => {
                              const isWeekend = date.getDay() === 5 || date.getDay() === 6;
                              return (
                                <div
                                  key={i}
                                  className={cn(
                                    "flex-shrink-0 border-r border-slate-100 dark:border-slate-800",
                                    isWeekend && "bg-slate-50/50 dark:bg-slate-800/20"
                                  )}
                                  style={{ width: columnWidth }}
                                />
                              );
                            })}
                          </div>

                          {/* Gantt Bar */}
                          {bar.isVisible && (
                            <div
                              className="absolute top-2 bottom-2 rounded-lg cursor-pointer overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                              style={{
                                left: bar.left,
                                width: bar.width,
                                backgroundColor: colors.primary,
                              }}
                              onClick={() => onTaskClick(task)}
                            >
                              {/* Progress Fill */}
                              <div
                                className="absolute inset-y-0 left-0 rounded-l-lg"
                                style={{
                                  width: `${progress}%`,
                                  backgroundColor: colors.progress,
                                }}
                              />
                              
                              {/* Task Title */}
                              <div className="relative h-full flex items-center px-3 z-10">
                                <span className="text-xs font-semibold text-white truncate drop-shadow-sm">
                                  {task.title}
                                </span>
                              </div>
                            </div>
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

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400">
          <div className="text-center">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium">No tasks to display on timeline</p>
            <p className="text-xs text-slate-400 mt-1">Tasks with start dates will appear here</p>
          </div>
        </div>
      )}
    </div>
  );
}
