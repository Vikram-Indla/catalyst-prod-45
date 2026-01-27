// ============================================================
// MINI CALENDAR WIDGET
// Planner V9: Compact calendar with task indicators
// ============================================================

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  format, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface MiniCalendarProps {
  className?: string;
  taskDates?: Date[];
  onDateSelect?: (date: Date) => void;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function MiniCalendar({ className, taskDates = [], onDateSelect }: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = new Date();

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Check if a date has tasks
  const hasTask = (date: Date) => {
    return taskDates.some(taskDate => isSameDay(taskDate, date));
  };

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  return (
    <div className={cn('rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={handlePrevMonth}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={handleNextMonth}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(day => (
          <div 
            key={day} 
            className="text-center text-xs font-medium text-slate-400 dark:text-slate-500 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((day, idx) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, today);
          const hasTasks = hasTask(day);
          
          return (
            <button
              key={idx}
              onClick={() => onDateSelect?.(day)}
              className={cn(
                'relative aspect-square flex flex-col items-center justify-center text-xs rounded-md transition-colors',
                !isCurrentMonth && 'text-slate-300 dark:text-slate-600',
                isCurrentMonth && 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700',
                isToday && 'bg-blue-500 text-white hover:bg-blue-600 font-semibold'
              )}
            >
              {format(day, 'd')}
              {hasTasks && !isToday && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
