// ============================================================
// PLANNER CALENDAR VIEW
// Month/Week calendar with task display, drag-drop, quick add
// CRITICAL FIX: Shows task TITLE (not assignee name)
// ============================================================

import { useState, useMemo, useRef, useCallback } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { PlannerTask, GroupByOption } from '../types';
import { motion } from 'framer-motion';
import { CreateTaskModal } from './kanban';
import { 
  startOfMonth, 
  endOfMonth,
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { CalendarCell, CalendarLegend } from './calendar';
import { QuickAddPopover } from './calendar/QuickAddPopover';
import { useRescheduleTask } from '../hooks/useRescheduleTask';
import { useCalendarTasksRealtime } from '../hooks/useCalendarTasksRealtime';
import { PlannerViewHeader } from './shared/PlannerViewHeader';
import { PlannerSearchBar } from './PlannerSearchBar';
import { usePlannerWorkstreams } from '../hooks/usePlannerWorkstreams';
import { usePlannerUsers } from '../hooks/usePlannerUsers';
import { usePlannerSearch } from '../hooks/usePlannerSearch';

interface PlannerCalendarProps {
  tasks: PlannerTask[];
  onTaskClick: (task: PlannerTask) => void;
  onDateClick?: (date: Date) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type CalendarViewType = 'month' | 'week';

export function PlannerCalendar({ tasks, onTaskClick, onDateClick }: PlannerCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarViewType>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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

  const rescheduleTask = useRescheduleTask();

  // Calculate date range based on view
  const { startDate, endDate, days } = useMemo(() => {
    if (view === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const start = startOfWeek(monthStart, { weekStartsOn: 0 });
      const end = endOfWeek(monthEnd, { weekStartsOn: 0 });
      return {
        startDate: start,
        endDate: end,
        days: eachDayOfInterval({ start, end }),
      };
    } else {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return {
        startDate: start,
        endDate: end,
        days: eachDayOfInterval({ start, end }),
      };
    }
  }, [currentDate, view]);

  // Real-time subscription
  useCalendarTasksRealtime({ startDate, endDate });

  // Group filtered tasks by date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, PlannerTask[]>();
    
    filteredTasks.forEach(task => {
      if (task.dueDate) {
        const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
        const existing = map.get(dateKey) || [];
        map.set(dateKey, [...existing, task]);
      }
    });

    return map;
  }, [filteredTasks]);

  // Get unique workstreams for legend
  const workstreams = useMemo(() => {
    const wsMap = new Map<string, { name: string; color: string }>();
    tasks.forEach(t => {
      if (t.teamName && t.teamColor) {
        wsMap.set(t.teamName, { name: t.teamName, color: t.teamColor });
      }
    });
    return Array.from(wsMap.values());
  }, [tasks]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateClick?.(date);
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (view === 'month') {
      setCurrentDate(prev => 
        direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1)
      );
    } else {
      setCurrentDate(prev => 
        direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1)
      );
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const handleTaskDrop = (taskId: string, newDate: Date) => {
    rescheduleTask.mutate({ taskId, newDate });
  };

  // Get tasks for selected date (side panel)
  const selectedDateTasks = selectedDate 
    ? tasksByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []
    : [];

  const title = view === 'month' 
    ? format(currentDate, 'MMMM yyyy')
    : `Week of ${format(currentDate, 'MMM d, yyyy')}`;

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* V9 Header */}
      <PlannerViewHeader
        icon={CalendarIcon}
        title="Calendar"
        subtitle={title}
        onAddTask={() => setIsCreateOpen(true)}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            {/* View Toggle */}
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5">
              <button
                onClick={() => setView('month')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  view === 'month'
                    ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <CalendarIcon className="w-4 h-4" />
                Month
              </button>
              <button
                onClick={() => setView('week')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  view === 'week'
                    ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <CalendarDays className="w-4 h-4" />
                Week
              </button>
            </div>
            {/* Navigation */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => navigatePeriod('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigatePeriod('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        }
      />

      {/* Filter Bar - positioned below header */}
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

      <div className="flex-1 flex overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col p-4 overflow-auto">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((day, index) => (
              <div 
                key={day} 
                className={cn(
                  "text-center text-xs font-semibold py-2 uppercase tracking-wide",
                  index === 0 || index === 6 ? "text-text-muted" : "text-text-secondary"
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className={cn(
            "flex-1 grid grid-cols-7 border border-border/50 rounded-xl overflow-hidden",
            view === 'week' && "grid-rows-1"
          )}>
            {days.map((date, index) => {
              const dateKey = format(date, 'yyyy-MM-dd');
              const dayTasks = tasksByDate.get(dateKey) || [];
              const isCurrentMonth = view === 'week' || isSameMonth(date, currentDate);
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const isTodayDate = isToday(date);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;

              return (
                <motion.div
                  key={dateKey}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.01 }}
                >
                  <QuickAddPopover
                    date={date}
                    isOpen={quickAddDate !== null && isSameDay(quickAddDate, date)}
                    onOpenChange={(open) => setQuickAddDate(open ? date : null)}
                    trigger={
                      <div className="h-full">
                        <CalendarCell
                          date={date}
                          tasks={dayTasks}
                          isCurrentMonth={isCurrentMonth}
                          isToday={isTodayDate}
                          isWeekend={isWeekend}
                          isSelected={isSelected || false}
                          onTaskClick={onTaskClick}
                          onDateClick={() => handleDateClick(date)}
                          onTaskDrop={(taskId) => handleTaskDrop(taskId, date)}
                          onQuickAdd={() => setQuickAddDate(date)}
                        />
                      </div>
                    }
                  />
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Panel */}
        {selectedDate && (
          <div className="w-[300px] border-l border-border bg-surface-1 overflow-y-auto">
            <div className="p-4 border-b border-border sticky top-0 bg-surface-1 z-10">
              <h3 className="font-semibold text-text-primary">
                {format(selectedDate, 'EEEE, MMMM d')}
              </h3>
              <p className="text-sm text-text-muted">
                {selectedDateTasks.length} task{selectedDateTasks.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="p-2 space-y-2">
              {selectedDateTasks.map(task => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => onTaskClick(task)}
                  className="p-3 bg-surface-0 rounded-lg border border-border cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
                  style={{ borderLeftWidth: 3, borderLeftColor: task.teamColor || '#6366f1' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-text-muted">{task.key}</span>
                  </div>
                  <p className="text-sm font-medium text-text-primary line-clamp-2">
                    {task.title}
                  </p>
                  {task.assigneeName && (
                    <p className="text-xs text-text-muted mt-1">
                      {task.assigneeName}
                    </p>
                  )}
                </motion.div>
              ))}

              {selectedDateTasks.length === 0 && (
                <div className="text-center py-8 text-text-muted text-sm">
                  No tasks due on this date
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <CalendarLegend workstreams={workstreams} />

      {/* Create Task Modal */}
      <CreateTaskModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </div>
  );
}
