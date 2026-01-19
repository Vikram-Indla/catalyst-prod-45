// ============================================================
// CALENDAR HEADER
// Month/Year title, navigation, view toggle, today button
// ============================================================

import { ChevronLeft, ChevronRight, Calendar, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CalendarViewType = 'month' | 'week';

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  onPrevPeriod: () => void;
  onNextPeriod: () => void;
  onToday: () => void;
}

export function CalendarHeader({
  currentDate,
  view,
  onViewChange,
  onPrevPeriod,
  onNextPeriod,
  onToday,
}: CalendarHeaderProps) {
  const title = view === 'month' 
    ? format(currentDate, 'MMMM yyyy')
    : `Week of ${format(currentDate, 'MMM d, yyyy')}`;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-1">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-text-primary">
          {title}
        </h2>
        <Button variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>
      </div>

      <div className="flex items-center gap-3">
        {/* View Toggle */}
        <div className="flex items-center rounded-lg border border-border bg-surface-0 p-0.5">
          <button
            onClick={() => onViewChange('month')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              view === 'month'
                ? "bg-surface-2 text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            <Calendar className="w-4 h-4" />
            Month
          </button>
          <button
            onClick={() => onViewChange('week')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              view === 'week'
                ? "bg-surface-2 text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            <CalendarDays className="w-4 h-4" />
            Week
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onPrevPeriod}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onNextPeriod}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
