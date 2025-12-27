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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {weeks.map((w, idx) => {
        const isCurrent = idx === 0;
const colorClass = w.available > 200 ? 'text-[#0d9488]' : 
                          w.available >= 50 ? 'text-[#f59e0b]' : 'text-[#8b5c5c]';
        
        return (
          <div
            key={`${w.year}-${w.week}`}
            onClick={onWeekClick}
            className={cn(
              "rounded p-2 text-center transition-colors cursor-pointer hover:shadow-sm",
              isCurrent 
                ? "border-2 border-[#2563eb] bg-blue-50" 
                : "border border-border bg-card hover:border-[#2563eb]/50"
            )}
          >
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              W{w.week}{isCurrent ? ' (CURRENT)' : ''}
            </div>
            <div className={cn("text-base font-bold", colorClass)}>
              {w.available}%
            </div>
            <div className="text-[10px] text-muted-foreground">
              {w.peopleWithCapacity} of {totalPeople} have capacity
            </div>
          </div>
        );
      })}
    </div>
  );
}
