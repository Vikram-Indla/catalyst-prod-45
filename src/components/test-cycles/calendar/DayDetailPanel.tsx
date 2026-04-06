import React from 'react';
import { format, isSameDay } from 'date-fns';
import { X, Calendar, User, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MilestoneMarker } from './MilestoneMarker';
import { 
  STATUS_CALENDAR_COLORS, 
  PRIORITY_COLORS, 
  type CalendarEvent, 
  type DateRange,
  type CalendarEventStatus 
} from '@/types/calendar.types';
import { cn } from '@/lib/utils';

interface DayDetailPanelProps {
  date: Date;
  events: CalendarEvent[];
  cycleRange: DateRange;
  isOpen: boolean;
  onClose: () => void;
  onReschedule: (event: CalendarEvent) => void;
  onViewDetails: (event: CalendarEvent) => void;
}

const STATUS_LABELS: Record<CalendarEventStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  passed: 'Passed',
  failed: 'Failed',
  blocked: 'Blocked',
};

export function DayDetailPanel({
  date,
  events,
  cycleRange,
  isOpen,
  onClose,
  onReschedule,
  onViewDetails,
}: DayDetailPanelProps) {
  if (!isOpen) return null;

  const isCycleStart = isSameDay(date, cycleRange.start);
  const isCycleEnd = isSameDay(date, cycleRange.end);

  // Group by status
  const eventsByStatus = events.reduce((acc, event) => {
    if (!acc[event.status]) acc[event.status] = [];
    acc[event.status].push(event);
    return acc;
  }, {} as Record<CalendarEventStatus, CalendarEvent[]>);

  const statusOrder: CalendarEventStatus[] = ['blocked', 'failed', 'in_progress', 'not_started', 'passed'];

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-50 flex flex-col border-l border-[#e2e8f0]">
      {/* Header */}
      <div className="p-4 border-b border-[#e2e8f0]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0f172a]">
              {format(date, 'EEEE')}
            </h2>
            <p className="text-sm text-[#64748b]">
              {format(date, 'MMMM d, yyyy')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2 mt-3">
          {isCycleStart && <MilestoneMarker type="start" label="Cycle Starts" />}
          {isCycleEnd && <MilestoneMarker type="end" label="Cycle Ends" />}
          <Badge variant="secondary" className="bg-[#f1f5f9] text-[#475569]">
            {events.length} tests
          </Badge>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {statusOrder.map((status) => {
            const statusEvents = eventsByStatus[status];
            if (!statusEvents?.length) return null;

            const colors = STATUS_CALENDAR_COLORS[status];

            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn('w-2 h-2 rounded-full', colors.bg, colors.border, 'border-2')} />
                  <h3 className="text-sm font-semibold text-[#334155]">
                    {STATUS_LABELS[status]}
                  </h3>
                  <span className="text-xs text-[#64748b]">({statusEvents.length})</span>
                </div>

                <div className="space-y-2">
                  {statusEvents.map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        'p-3 rounded-lg border-l-[3px]',
                        colors.bg,
                        colors.border
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className={cn('text-xs font-semibold', colors.text)}>
                            {event.code}
                          </div>
                          <div className="text-sm font-medium text-[#0f172a] line-clamp-2">
                            {event.title}
                          </div>
                        </div>
                        {(event.priority === 'critical' || event.priority === 'high') && (
                          <Badge className={cn('shrink-0 text-[10px]', PRIORITY_COLORS[event.priority])}>
                            {event.priority}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-xs text-[#64748b]">
                        {event.assigneeName && (
                          <div className="flex items-center gap-1">
                            <Avatar className="h-4 w-4">
                              <AvatarFallback className="text-[8px] bg-[#e2e8f0]">
                                {event.assigneeName.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span>{event.assigneeName}</span>
                          </div>
                        )}
                        <span className="text-[#cbd5e1]">•</span>
                        <span>{event.module}</span>
                      </div>

                      <div className="flex items-center gap-1 mt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onReschedule(event)}
                          className="h-7 px-2 text-xs text-[#64748b] hover:text-[#2563eb]"
                        >
                          <Calendar className="h-3 w-3 mr-1" />
                          Reschedule
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDetails(event)}
                          className="h-7 px-2 text-xs text-[#64748b] hover:text-[#2563eb]"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {events.length === 0 && (
            <div className="text-center py-8 text-[#64748b]">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No tests scheduled for this day</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-[#e2e8f0]">
        <Button className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white">
          Add Test to This Day
        </Button>
      </div>
    </div>
  );
}
