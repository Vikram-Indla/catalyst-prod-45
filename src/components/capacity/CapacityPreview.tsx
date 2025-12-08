/**
 * Capacity Preview Bar
 * Shows available capacity for current week + next 3 weeks
 */

import { cn } from '@/lib/utils';
import { getWeekDateRange, getCapacityColorClass } from '@/lib/capacityUtils';

interface CapacityPreviewProps {
  weeks: {
    week: number;
    year: number;
    available: number;
    peopleWithCapacity: number;
  }[];
  currentWeek: number;
  totalPeople: number;
}

export function CapacityPreview({ weeks, currentWeek, totalPeople }: CapacityPreviewProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-card border border-border rounded-lg mb-4">
      {weeks.map((w, idx) => {
        const isCurrent = idx === 0;
        const colorClass = getCapacityColorClass(w.available);
        
        return (
          <div
            key={`${w.year}-${w.week}`}
            className={cn(
              "text-center p-3 bg-muted rounded-md border",
              isCurrent 
                ? "border-brand-gold bg-brand-gold/5" 
                : "border-border"
            )}
          >
            <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">
              W{w.week}{isCurrent ? ' (Current)' : ''}
            </div>
            <div className={cn("text-xl font-bold", colorClass)}>
              {w.available}%
            </div>
            <div className="text-[10px] text-muted-foreground">
              Available
            </div>
            <div className="text-[9px] text-muted-foreground mt-1">
              {w.peopleWithCapacity} of {totalPeople} have capacity
            </div>
          </div>
        );
      })}
    </div>
  );
}
