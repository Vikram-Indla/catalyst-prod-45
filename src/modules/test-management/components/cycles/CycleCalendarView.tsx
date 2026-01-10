/**
 * CycleCalendarView - Calendar view for test cycles
 * Based on Catalyst V5 Phase 5 spec
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  addMonths,
  subMonths,
  parseISO
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, Zap, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TestCycle } from '../../api/types';

interface CycleCalendarViewProps {
  cycles: TestCycle[];
  onCycleClick?: (cycle: TestCycle) => void;
}

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; icon: React.ElementType }> = {
  planned: { color: 'text-muted-foreground', bgColor: 'bg-muted', icon: Clock },
  active: { color: 'text-info', bgColor: 'bg-info/10', icon: Zap },
  completed: { color: 'text-success', bgColor: 'bg-success/10', icon: CheckCircle2 },
  cancelled: { color: 'text-danger', bgColor: 'bg-danger/10', icon: XCircle },
};

export function CycleCalendarView({ cycles, onCycleClick }: CycleCalendarViewProps) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleCycleClick = (cycle: TestCycle, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCycleClick) {
      onCycleClick(cycle);
    } else {
      navigate(`/tests/cycles/${cycle.id}`);
    }
  };

  // Get cycles for a specific day
  const getCyclesForDay = (day: Date) => {
    return cycles.filter(cycle => {
      if (!cycle.planned_start || !cycle.planned_end) return false;
      const start = parseISO(cycle.planned_start);
      const end = parseISO(cycle.planned_end);
      return isWithinInterval(day, { start, end }) || isSameDay(day, start) || isSameDay(day, end);
    });
  };

  // Check if day is start of a cycle
  const isStartDay = (day: Date, cycle: TestCycle) => {
    if (!cycle.planned_start) return false;
    return isSameDay(day, parseISO(cycle.planned_start));
  };

  // Check if day is end of a cycle
  const isEndDay = (day: Date, cycle: TestCycle) => {
    if (!cycle.planned_end) return false;
    return isSameDay(day, parseISO(cycle.planned_end));
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 bg-muted/30 border-b border-border text-sm">
        <span className="text-muted-foreground">Status:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-muted" />
          <span className="text-muted-foreground">Not Started</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-info/50" />
          <span className="text-muted-foreground">In Progress</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-success/50" />
          <span className="text-muted-foreground">Completed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-danger/50" />
          <span className="text-muted-foreground">Blocked</span>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekDays.map((day) => (
          <div
            key={day}
            className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayCycles = getCyclesForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={idx}
              className={cn(
                'min-h-[120px] border-b border-r border-border p-1 transition-colors',
                !isCurrentMonth && 'bg-muted/30',
                (idx + 1) % 7 === 0 && 'border-r-0',
                isToday && 'bg-primary/5'
              )}
            >
              {/* Day Number */}
              <div className={cn(
                'text-right text-sm p-1',
                !isCurrentMonth && 'text-muted-foreground',
                isToday && 'font-bold text-primary'
              )}>
                {format(day, 'd')}
              </div>

              {/* Cycles */}
              <div className="space-y-1">
                {dayCycles.slice(0, 3).map((cycle) => {
                  const config = STATUS_CONFIG[cycle.status] || STATUS_CONFIG.planned;
                  const isStart = isStartDay(day, cycle);
                  const isEnd = isEndDay(day, cycle);

                  return (
                    <button
                      key={cycle.id}
                      onClick={(e) => handleCycleClick(cycle, e)}
                      className={cn(
                        'w-full px-1.5 py-0.5 text-xs truncate text-left transition-all hover:opacity-80',
                        config.bgColor,
                        config.color,
                        isStart && 'rounded-l',
                        isEnd && 'rounded-r',
                        !isStart && !isEnd && 'rounded-none',
                        isStart && isEnd && 'rounded'
                      )}
                      title={cycle.title}
                    >
                      {isStart ? cycle.title : ''}
                    </button>
                  );
                })}
                {dayCycles.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{dayCycles.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CycleCalendarView;
