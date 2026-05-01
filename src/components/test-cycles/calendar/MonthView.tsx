import React from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
} from 'date-fns';
import { CalendarDayCell } from './CalendarDayCell';
import type { CalendarEvent, DateRange } from '@/types/calendar.types';

interface MonthViewProps {
  currentDate: Date;
  eventsByDate: Map<string, CalendarEvent[]>;
  cycleRange: DateRange;
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthView({
  currentDate,
  eventsByDate,
  cycleRange,
  onDayClick,
  onEventClick,
}: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[var(--ds-border,#e2e8f0)] bg-[var(--ds-surface-sunken,#f8fafc)]">
        {DAY_NAMES.map((day) => (
          <div
            key={day}
            className="px-2 py-3 text-xs font-semibold text-[var(--ds-text-subtlest,#64748b)] text-center uppercase tracking-wide"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-auto">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const events = eventsByDate.get(dateKey) || [];

          return (
            <CalendarDayCell
              key={dateKey}
              date={day}
              events={events}
              currentMonth={currentDate}
              cycleRange={cycleRange}
              onClick={() => onDayClick(day)}
              onEventClick={onEventClick}
            />
          );
        })}
      </div>
    </div>
  );
}
