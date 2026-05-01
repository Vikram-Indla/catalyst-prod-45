import React from 'react';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isSameDay,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { TestEventCard } from './TestEventCard';
import { MilestoneMarker } from './MilestoneMarker';
import type { CalendarEvent, DateRange } from '@/types/calendar.types';

interface WeekViewProps {
  currentDate: Date;
  eventsByDate: Map<string, CalendarEvent[]>;
  cycleRange: DateRange;
  onEventClick: (event: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7 AM to 6 PM

export function WeekView({
  currentDate,
  eventsByDate,
  cycleRange,
  onEventClick,
}: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const currentHour = new Date().getHours();

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header with day names and dates */}
      <div className="flex border-b border-[var(--ds-border,#e2e8f0)] bg-[var(--ds-surface-sunken,#f8fafc)]">
        {/* Time column spacer */}
        <div className="w-16 shrink-0 border-r border-[var(--ds-border,#e2e8f0)]" />
        
        {/* Day headers */}
        {days.map((day) => {
          const isCurrentDay = isToday(day);
          const isCycleStart = isSameDay(day, cycleRange.start);
          const isCycleEnd = isSameDay(day, cycleRange.end);
          const isInRange = day >= cycleRange.start && day <= cycleRange.end;

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'flex-1 px-2 py-3 text-center border-r border-[var(--ds-border,#e2e8f0)] last:border-r-0',
                isInRange && 'bg-[var(--ds-background-selected,#eff6ff)]',
                isCurrentDay && 'border-t-2 border-t-[var(--ds-text-brand,#2563eb)]'
              )}
            >
              <div className="text-xs font-medium text-[var(--ds-text-subtlest,#64748b)] uppercase">
                {format(day, 'EEE')}
              </div>
              <div
                className={cn(
                  'mt-1 text-lg font-semibold',
                  isCurrentDay ? 'text-[var(--ds-text-brand,#2563eb)]' : 'text-[var(--ds-text,#0f172a)]'
                )}
              >
                {format(day, 'd')}
              </div>
              <div className="flex justify-center gap-1 mt-1">
                {isCycleStart && <MilestoneMarker type="start" />}
                {isCycleEnd && <MilestoneMarker type="end" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day events row */}
      <div className="flex border-b border-[var(--ds-border,#e2e8f0)] min-h-[60px]">
        <div className="w-16 shrink-0 px-2 py-2 text-xs font-medium text-[var(--ds-text-subtlest,#64748b)] border-r border-[var(--ds-border,#e2e8f0)]">
          All day
        </div>
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const events = eventsByDate.get(dateKey) || [];
          const isInRange = day >= cycleRange.start && day <= cycleRange.end;

          return (
            <div
              key={dateKey}
              className={cn(
                'flex-1 p-1 border-r border-[var(--ds-border,#e2e8f0)] last:border-r-0 space-y-1 overflow-hidden',
                isInRange && 'bg-[var(--ds-background-selected,#eff6ff)]/50'
              )}
            >
              {events.slice(0, 3).map((event) => (
                <TestEventCard
                  key={event.id}
                  event={event}
                  variant="compact"
                  onClick={() => onEventClick(event)}
                />
              ))}
              {events.length > 3 && (
                <div className="text-xs text-[var(--ds-text-brand,#2563eb)] font-medium px-2">
                  +{events.length - 3} more
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 flex overflow-auto">
        {/* Time column */}
        <div className="w-16 shrink-0 border-r border-[var(--ds-border,#e2e8f0)]">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="h-[60px] px-2 py-1 text-right text-xs text-[var(--ds-text-subtlest,#64748b)] border-b border-[var(--ds-surface-sunken,#f1f5f9)]"
            >
              {format(new Date().setHours(hour, 0), 'h a')}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => {
          const isCurrentDay = isToday(day);
          const isInRange = day >= cycleRange.start && day <= cycleRange.end;

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'flex-1 border-r border-[var(--ds-border,#e2e8f0)] last:border-r-0 relative',
                isInRange && 'bg-[var(--ds-background-selected,#eff6ff)]/30'
              )}
            >
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="h-[60px] border-b border-[var(--ds-surface-sunken,#f1f5f9)] hover:bg-[var(--ds-surface-sunken,#f8fafc)]"
                />
              ))}
              
              {/* Current time indicator */}
              {isCurrentDay && currentHour >= 7 && currentHour <= 18 && (
                <div
                  className="absolute left-0 right-0 border-t-2 border-[var(--ds-text-danger,#ef4444)] z-10"
                  style={{ top: `${(currentHour - 7) * 60 + (new Date().getMinutes())}px` }}
                >
                  <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-[var(--ds-text-danger,#ef4444)]" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
