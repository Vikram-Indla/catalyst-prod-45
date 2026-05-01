import React from 'react';
import { format, isToday, isWeekend, isSameMonth, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { TestEventCard } from './TestEventCard';
import { MilestoneMarker } from './MilestoneMarker';
import type { CalendarEvent, DateRange } from '@/types/calendar.types';

interface CalendarDayCellProps {
  date: Date;
  events: CalendarEvent[];
  currentMonth: Date;
  cycleRange: DateRange;
  onClick: () => void;
  onEventClick?: (event: CalendarEvent) => void;
}

const MAX_VISIBLE_EVENTS = 3;

export function CalendarDayCell({
  date,
  events,
  currentMonth,
  cycleRange,
  onClick,
  onEventClick,
}: CalendarDayCellProps) {
  const isCurrentDay = isToday(date);
  const isOutsideMonth = !isSameMonth(date, currentMonth);
  const isWeekendDay = isWeekend(date);
  const isInCycleRange = date >= cycleRange.start && date <= cycleRange.end;
  const isCycleStart = isSameDay(date, cycleRange.start);
  const isCycleEnd = isSameDay(date, cycleRange.end);

  const visibleEvents = events.slice(0, MAX_VISIBLE_EVENTS);
  const overflowCount = events.length - MAX_VISIBLE_EVENTS;

  return (
    <div
      onClick={onClick}
      className={cn(
        'min-h-[120px] p-1.5 border-r border-b border-[var(--ds-border, #e2e8f0)] cursor-pointer',
        'transition-colors hover:bg-[var(--ds-surface-sunken, #f8fafc)]',
        isOutsideMonth && 'bg-[var(--ds-surface-sunken, #f1f5f9)]',
        !isOutsideMonth && isWeekendDay && 'bg-[var(--ds-surface-sunken, #f8fafc)]',
        !isOutsideMonth && !isWeekendDay && isInCycleRange && 'bg-[var(--ds-background-selected, #eff6ff)]',
        isCurrentDay && 'ring-2 ring-inset ring-[var(--ds-text-brand, #2563eb)]'
      )}
    >
      {/* Day header */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            'h-7 w-7 flex items-center justify-center rounded-full text-sm font-medium',
            isCurrentDay && 'bg-[var(--ds-text-brand, #2563eb)] text-white',
            !isCurrentDay && isOutsideMonth && 'text-[var(--ds-text-subtlest, #94a3b8)]',
            !isCurrentDay && !isOutsideMonth && 'text-[var(--ds-text-subtle, #334155)]'
          )}
        >
          {format(date, 'd')}
        </span>
        <div className="flex gap-1">
          {isCycleStart && <MilestoneMarker type="start" />}
          {isCycleEnd && <MilestoneMarker type="end" />}
        </div>
      </div>

      {/* Events */}
      <div className="space-y-1">
        {visibleEvents.map((event) => (
          <TestEventCard
            key={event.id}
            event={event}
            variant="compact"
            onClick={() => onEventClick?.(event)}
          />
        ))}
        {overflowCount > 0 && (
          <button
            className="w-full text-left px-2 py-1 text-xs font-medium text-[var(--ds-text-brand, #2563eb)] hover:bg-[#dbeafe] rounded"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            +{overflowCount} more
          </button>
        )}
      </div>
    </div>
  );
}
