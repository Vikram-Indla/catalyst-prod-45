import React from 'react';
import { format, isToday, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { TestEventCard } from './TestEventCard';
import { MilestoneMarker } from './MilestoneMarker';
import { Avatar } from '@/components/ads';
import type { CalendarEvent, DateRange, CalendarEventStatus } from '@/types/calendar.types';

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  cycleRange: DateRange;
  onEventClick: (event: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7 AM to 6 PM

const STATUS_LABELS: Record<CalendarEventStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  passed: 'Passed',
  failed: 'Failed',
  blocked: 'Blocked',
};

export function DayView({
  currentDate,
  events,
  cycleRange,
  onEventClick,
}: DayViewProps) {
  const isCurrentDay = isToday(currentDate);
  const isCycleStart = isSameDay(currentDate, cycleRange.start);
  const isCycleEnd = isSameDay(currentDate, cycleRange.end);
  const currentHour = new Date().getHours();

  // Group events by status
  const eventsByStatus = events.reduce((acc, event) => {
    if (!acc[event.status]) acc[event.status] = [];
    acc[event.status].push(event);
    return acc;
  }, {} as Record<CalendarEventStatus, CalendarEvent[]>);

  // Group by assignee for summary
  const eventsByAssignee = events.reduce((acc, event) => {
    const key = event.assigneeId || 'unassigned';
    if (!acc[key]) acc[key] = { name: event.assigneeName || 'Unassigned', events: [] };
    acc[key].events.push(event);
    return acc;
  }, {} as Record<string, { name: string; events: CalendarEvent[] }>);

  return (
    <div className="flex-1 flex bg-white overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
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

        {/* Events column */}
        <div className="flex-1 relative">
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

          {/* Events overlay */}
          <div className="absolute inset-0 p-2 space-y-2 overflow-auto">
            {events.map((event) => (
              <TestEventCard
                key={event.id}
                event={event}
                variant="full"
                onClick={() => onEventClick(event)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Summary panel */}
      <div className="w-80 shrink-0 border-l border-[var(--ds-border,#e2e8f0)] bg-[var(--ds-surface-sunken,#f8fafc)] overflow-auto">
        <div className="p-4 border-b border-[var(--ds-border,#e2e8f0)]">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-[var(--ds-text,#0f172a)]">
              {format(currentDate, 'EEEE, MMMM d')}
            </h3>
            {isCycleStart && <MilestoneMarker type="start" />}
            {isCycleEnd && <MilestoneMarker type="end" />}
          </div>
          <div className="text-3xl font-bold text-[var(--ds-text,#0f172a)]">{events.length}</div>
          <div className="text-sm text-[var(--ds-text-subtlest,#64748b)]">tests scheduled</div>
        </div>

        {/* Status breakdown */}
        <div className="p-4 border-b border-[var(--ds-border,#e2e8f0)]">
          <h4 className="text-xs font-semibold text-[var(--ds-text-subtlest,#64748b)] uppercase tracking-wide mb-3">
            By Status
          </h4>
          <div className="space-y-2">
            {Object.entries(eventsByStatus).map(([status, statusEvents]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-[var(--ds-text-subtle,#334155)]">
                  {STATUS_LABELS[status as CalendarEventStatus]}
                </span>
                <span className="text-sm font-medium text-[var(--ds-text,#0f172a)]">
                  {statusEvents.length}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Assignee breakdown */}
        <div className="p-4">
          <h4 className="text-xs font-semibold text-[var(--ds-text-subtlest,#64748b)] uppercase tracking-wide mb-3">
            By Assignee
          </h4>
          <div className="space-y-2">
            {Object.entries(eventsByAssignee).map(([id, { name, events: assigneeEvents }]) => (
              <div key={id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar name={name} size="xsmall" />
                  <span className="text-sm text-[var(--ds-text-subtle,#334155)]">{name}</span>
                </div>
                <span className="text-sm font-medium text-[var(--ds-text,#0f172a)]">
                  {assigneeEvents.length}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
