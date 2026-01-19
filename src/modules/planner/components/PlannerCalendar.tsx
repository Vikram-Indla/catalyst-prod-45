// ============================================================
// PLANNER CALENDAR VIEW
// Month/Week calendar with task display, drag-drop, quick add
// CRITICAL FIX: Shows task TITLE (not assignee name)
// ============================================================

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { PlannerTask } from '../types';
import { motion } from 'framer-motion';
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
import { CalendarHeader, CalendarCell, CalendarLegend } from './calendar';
import { QuickAddPopover } from './calendar/QuickAddPopover';
import { useRescheduleTask } from '../hooks/useRescheduleTask';
import { useCalendarTasksRealtime } from '../hooks/useCalendarTasksRealtime';

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

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, PlannerTask[]>();
    
    tasks.forEach(task => {
      if (task.dueDate) {
        const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
        const existing = map.get(dateKey) || [];
        map.set(dateKey, [...existing, task]);
      }
    });

    return map;
  }, [tasks]);

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

  return (
    <div className="h-full flex flex-col bg-surface-0">
      <CalendarHeader
        currentDate={currentDate}
        view={view}
        onViewChange={setView}
        onPrevPeriod={() => navigatePeriod('prev')}
        onNextPeriod={() => navigatePeriod('next')}
        onToday={goToToday}
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
    </div>
  );
}
