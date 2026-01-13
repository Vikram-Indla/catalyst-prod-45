// ============================================================
// PLANNER CALENDAR VIEW
// Month calendar with task dots and priority colors
// ============================================================

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { PlannerTask } from '../types';
import { PRIORITY_CONFIG } from '../types';
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
} from 'date-fns';

interface PlannerCalendarProps {
  tasks: PlannerTask[];
  onTaskClick: (task: PlannerTask) => void;
  onDateClick?: (date: Date) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function PlannerCalendar({ tasks, onTaskClick, onDateClick }: PlannerCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

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

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateClick?.(date);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => 
      direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1)
    );
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  // Get tasks for selected date
  const selectedDateTasks = selectedDate 
    ? tasksByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []
    : [];

  return (
    <div className="h-full flex flex-col bg-surface-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-1">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-text-primary">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col p-4">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map(day => (
              <div 
                key={day} 
                className="text-center text-xs font-semibold text-text-muted py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="flex-1 grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => {
              const dateKey = format(date, 'yyyy-MM-dd');
              const dayTasks = tasksByDate.get(dateKey) || [];
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const isTodayDate = isToday(date);

              return (
                <motion.div
                  key={dateKey}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.005 }}
                  onClick={() => handleDateClick(date)}
                  className={cn(
                    "min-h-[100px] p-2 rounded-lg border cursor-pointer transition-all",
                    "hover:border-blue-300 hover:bg-blue-50/30",
                    isCurrentMonth ? "bg-surface-0" : "bg-surface-1/50",
                    isSelected && "border-blue-500 bg-blue-50",
                    isTodayDate && !isSelected && "bg-blue-50/50 border-blue-200"
                  )}
                >
                  <div className={cn(
                    "text-sm font-medium mb-1",
                    !isCurrentMonth && "text-text-muted",
                    isTodayDate && "text-blue-600",
                    isSelected && "text-blue-700"
                  )}>
                    {format(date, 'd')}
                  </div>

                  {/* Task Dots */}
                  <div className="flex flex-wrap gap-1">
                    {dayTasks.slice(0, 3).map(task => (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskClick(task);
                        }}
                        className={cn(
                          "w-2 h-2 rounded-full cursor-pointer hover:scale-125 transition-transform"
                        )}
                        style={{ backgroundColor: PRIORITY_CONFIG[task.priority].color }}
                        title={task.title}
                      />
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="text-[10px] text-text-muted font-medium">
                        +{dayTasks.length - 3}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Tasks Panel */}
        {selectedDate && (
          <div className="w-[280px] border-l border-border bg-surface-1 overflow-y-auto">
            <div className="p-4 border-b border-border sticky top-0 bg-surface-1 z-10">
              <h3 className="font-semibold text-text-primary">
                {format(selectedDate, 'EEEE, MMMM d')}
              </h3>
              <p className="text-sm text-text-muted">
                {selectedDateTasks.length} task{selectedDateTasks.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="p-2 space-y-2">
              {selectedDateTasks.map(task => {
                const priorityConfig = PRIORITY_CONFIG[task.priority];
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => onTaskClick(task)}
                    className="p-3 bg-surface-0 rounded-lg border border-border cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: priorityConfig.color }}
                      />
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
                );
              })}

              {selectedDateTasks.length === 0 && (
                <div className="text-center py-8 text-text-muted text-sm">
                  No tasks due on this date
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
