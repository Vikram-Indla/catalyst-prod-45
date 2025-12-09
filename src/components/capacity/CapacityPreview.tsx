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
  onWeekClick?: () => void;
}

export function CapacityPreview({ weeks, currentWeek, totalPeople, onWeekClick }: CapacityPreviewProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {weeks.map((w, idx) => {
        const isCurrent = idx === 0;
        const colorClass = w.available > 200 ? 'text-[#5c7c5c]' : 
                          w.available >= 50 ? 'text-[#8b7355]' : 'text-[#8b5c5c]';
        
        return (
          <div
            key={`${w.year}-${w.week}`}
            onClick={onWeekClick}
            className={cn(
              "rounded-md p-3 text-center transition-colors cursor-pointer hover:shadow-sm",
              isCurrent 
                ? "border-2 border-[#c69c6d] bg-[#F5EDE4]" 
                : "border border-border bg-card hover:border-[#c69c6d]/50"
            )}
          >
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              W{w.week}{isCurrent ? ' (CURRENT)' : ''}
            </div>
            <div className={cn("text-xl font-bold", colorClass)}>
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
