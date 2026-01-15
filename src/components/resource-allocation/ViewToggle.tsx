/**
 * View Toggle Component
 * Toggle between Weeks and Months views
 * Catalyst V5 Enterprise Design System
 */

import { cn } from '@/lib/utils';
import { Calendar, CalendarDays } from 'lucide-react';
import type { TimelineView } from '@/types/resource-allocation.types';

interface ViewToggleProps {
  view: TimelineView;
  onChange: (view: TimelineView) => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center bg-muted/50 rounded-lg p-0.5 border border-border">
      <button
        onClick={() => onChange('weeks')}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all",
          view === 'weeks'
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <CalendarDays className="w-3.5 h-3.5" />
        Weeks
      </button>
      <button
        onClick={() => onChange('months')}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all",
          view === 'months'
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Calendar className="w-3.5 h-3.5" />
        Months
      </button>
    </div>
  );
}
