import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ChangeCard } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, isSameDay } from 'date-fns';

interface CalendarViewProps {
  changeCards: ChangeCard[];
  onDayClick: (date: string) => void;
  onChangeClick: (changeId: string) => void;
  isLoading?: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarView({ changeCards, onDayClick, onChangeClick, isLoading }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  const changesByDate = useMemo(() => {
    const map = new Map<string, ChangeCard[]>();
    changeCards.forEach(card => {
      const dateKey = card.planned_prod_date;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(card);
    });
    return map;
  }, [changeCards]);

  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="text-xs border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
          >
            Today
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousMonth}
            className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextMonth}
            className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {WEEKDAYS.map(day => (
          <div 
            key={day} 
            className="py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 overflow-auto">
        {calendarDays.map((day, idx) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayChanges = changesByDate.get(dateKey) || [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDate = isToday(day);
          const displayChanges = dayChanges.slice(0, 3);
          const overflowCount = dayChanges.length - 3;

          return (
            <div
              key={idx}
              onClick={() => onDayClick(dateKey)}
              className={cn(
                "min-h-[100px] p-2 border-b border-r border-gray-100 dark:border-gray-800 cursor-pointer transition-colors",
                !isCurrentMonth && "bg-gray-50 dark:bg-gray-900/50",
                isTodayDate && "bg-brand-primary/5 dark:bg-brand-primary/10",
                "hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  "text-sm font-medium",
                  !isCurrentMonth && "text-gray-400 dark:text-gray-600",
                  isCurrentMonth && "text-gray-900 dark:text-gray-100",
                  isTodayDate && "text-brand-primary font-bold"
                )}>
                  {format(day, 'd')}
                </span>
                {isTodayDate && (
                  <span className="text-2xs px-1.5 py-0.5 rounded bg-brand-primary text-white font-medium">
                    Today
                  </span>
                )}
              </div>

              {/* Change Chips */}
              <div className="space-y-1">
                {displayChanges.map(change => (
                  <ChangeChip 
                    key={change.id} 
                    change={change} 
                    onClick={(e) => {
                      e.stopPropagation();
                      onChangeClick(change.id);
                    }}
                  />
                ))}
                {overflowCount > 0 && (
                  <div className="text-2xs text-gray-500 dark:text-gray-400 font-medium pl-1">
                    +{overflowCount} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

interface ChangeChipProps {
  change: ChangeCard;
  onClick: (e: React.MouseEvent) => void;
}

function ChangeChip({ change, onClick }: ChangeChipProps) {
  const isCompliant = change.compliance_state === 'compliant';
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded text-2xs cursor-pointer transition-colors",
        "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
      )}
    >
      {/* Compliance Icon */}
      {isCompliant ? (
        <Circle className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
      ) : (
        <AlertTriangle className="w-3 h-3 text-status-warning flex-shrink-0" />
      )}
      
      {/* Change Number */}
      <span className="font-mono text-gray-700 dark:text-gray-300 font-medium flex-shrink-0">
        {change.change_number}
      </span>
      
      {/* Title (ellipsis) */}
      <span className="text-gray-600 dark:text-gray-400 truncate flex-1 min-w-0">
        {change.title}
      </span>
      
      {/* Approved Badge */}
      {change.approved && (
        <CheckCircle className="w-3 h-3 text-status-success flex-shrink-0" />
      )}
    </div>
  );
}
