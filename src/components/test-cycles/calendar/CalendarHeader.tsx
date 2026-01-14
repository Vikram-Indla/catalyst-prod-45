import React from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CalendarView, DateRange } from '@/types/calendar.types';

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  cycleName: string;
  cycleRange: DateRange;
  onNavigate: (direction: 'prev' | 'next' | 'today') => void;
  onViewChange: (view: CalendarView) => void;
}

export function CalendarHeader({
  currentDate,
  view,
  cycleName,
  cycleRange,
  onNavigate,
  onViewChange,
}: CalendarHeaderProps) {
  const getDateDisplay = () => {
    switch (view) {
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'week': {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd, yyyy')}`;
      }
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
    }
  };

  const views: CalendarView[] = ['month', 'week', 'day'];

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] bg-white">
      {/* Left: Navigation */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onNavigate('prev')}
            className="h-8 w-8 border-[#e2e8f0]"
          >
            <ChevronLeft className="h-4 w-4 text-[#475569]" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onNavigate('next')}
            className="h-8 w-8 border-[#e2e8f0]"
          >
            <ChevronRight className="h-4 w-4 text-[#475569]" />
          </Button>
        </div>
        <Button
          variant="ghost"
          onClick={() => onNavigate('today')}
          className="h-8 px-3 bg-[#dbeafe] text-[#2563eb] hover:bg-[#2563eb] hover:text-white"
        >
          Today
        </Button>
        <h2 className="text-lg font-semibold text-[#0f172a]">{getDateDisplay()}</h2>
      </div>

      {/* Center: Cycle info */}
      <div className="text-center">
        <div className="font-medium text-[#0f172a]">{cycleName}</div>
        <div className="text-sm text-[#64748b]">
          {format(cycleRange.start, 'MMM d')} - {format(cycleRange.end, 'MMM d, yyyy')}
        </div>
      </div>

      {/* Right: View toggle */}
      <div className="flex items-center gap-1 p-1 bg-[#f1f5f9] rounded-lg">
        {views.map((v) => (
          <Button
            key={v}
            variant="ghost"
            size="sm"
            onClick={() => onViewChange(v)}
            className={`h-8 px-4 capitalize ${
              view === v
                ? 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]'
                : 'text-[#475569] hover:bg-white'
            }`}
          >
            {v}
          </Button>
        ))}
      </div>
    </div>
  );
}
