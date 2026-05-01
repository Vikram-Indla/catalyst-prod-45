import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, Tooltip } from '@/components/ads';
import { STATUS_CALENDAR_COLORS, PRIORITY_COLORS, type CalendarEvent } from '@/types/calendar.types';

interface TestEventCardProps {
  event: CalendarEvent;
  variant: 'compact' | 'full';
  isDragging?: boolean;
  onClick?: () => void;
}

export function TestEventCard({
  event,
  variant,
  isDragging = false,
  onClick,
}: TestEventCardProps) {
  const statusColors = STATUS_CALENDAR_COLORS[event.status];

  if (variant === 'compact') {
    return (
      <Tooltip
        position="right"
        content={
          <div className="space-y-1 max-w-xs">
            <div className="font-medium">{event.code}: {event.title}</div>
            <div className="text-xs text-muted-foreground">
              {event.assigneeName} • {event.module}
            </div>
          </div>
        }
      >
        <div
          onClick={onClick}
          className={cn(
            'h-[22px] px-2 rounded text-xs font-medium truncate cursor-pointer',
            'border-l-[3px] flex items-center gap-1',
            statusColors.bg,
            statusColors.border,
            statusColors.text,
            isDragging && 'opacity-50 ring-2 ring-[var(--ds-text-brand,#2563eb)]'
          )}
        >
          <span className="truncate">{event.code}</span>
          <span className="truncate text-[10px] opacity-75">{event.title}</span>
        </div>
      </Tooltip>
    );
  }

  // Full variant for week/day views
  const height = Math.max(40, (event.estimatedDurationMinutes / 60) * 60);

  return (
    <div
      onClick={onClick}
      style={{ minHeight: `${height}px` }}
      className={cn(
        'p-2 rounded border-l-[3px] cursor-pointer transition-shadow hover:shadow-md',
        statusColors.bg,
        statusColors.border,
        isDragging && 'opacity-50 ring-2 ring-[var(--ds-text-brand,#2563eb)]'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className={cn('text-xs font-semibold truncate', statusColors.text)}>
            {event.code}
          </div>
          <div className="text-sm font-medium text-[var(--ds-text,#0f172a)] truncate">
            {event.title}
          </div>
        </div>
        {event.assigneeName && (
          <Avatar name={event.assigneeName} size="xxsmall" />
        )}
      </div>
      
      {(event.priority === 'critical' || event.priority === 'high') && (
        <span className={cn(
          'inline-block mt-1 px-1.5 py-0.5 text-[10px] font-medium rounded capitalize',
          PRIORITY_COLORS[event.priority]
        )}>
          {event.priority}
        </span>
      )}
    </div>
  );
}
