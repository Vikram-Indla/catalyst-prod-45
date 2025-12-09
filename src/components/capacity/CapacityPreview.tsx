/**
 * Capacity Preview Bar
 * Shows available capacity for current week + next 3 weeks
 * Using Golden Hour palette ONLY
 */

import { cn } from '@/lib/utils';

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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {weeks.map((w, idx) => {
        const isCurrent = idx === 0;
        
        return (
          <div
            key={`${w.year}-${w.week}`}
            className={cn(
              "rounded-md p-3 text-center transition-colors",
              isCurrent 
                ? "border-2 border-[#c69c6d] bg-[#c69c6d]/5" 
                : "border border-border bg-card"
            )}
          >
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              W{w.week}{isCurrent ? ' (CURRENT)' : ''}
            </div>
            <div className="text-xl font-bold text-[#5c7c5c]">
              {w.available}%
            </div>
            <div className="text-xs text-muted-foreground">
              {w.peopleWithCapacity} people available
            </div>
          </div>
        );
      })}
    </div>
  );
}
