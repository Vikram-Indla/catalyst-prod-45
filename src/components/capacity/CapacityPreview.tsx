/**
 * Capacity Preview Bar
 * Shows available capacity for current week + next 3 weeks
 * Following Catalyst design system
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
  const getCapacityColorClass = (available: number) => {
    if (available >= 30) return 'text-brand-gold';
    if (available >= 15) return 'text-warning';
    return 'text-destructive';
  };

  const getCapacityBarClass = (available: number) => {
    if (available >= 30) return 'bg-brand-gold';
    if (available >= 15) return 'bg-warning';
    return 'bg-destructive';
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {weeks.map((w, idx) => {
        const isCurrent = idx === 0;
        
        return (
          <div
            key={`${w.year}-${w.week}`}
            className={cn(
              "bg-card border rounded-lg p-4 transition-colors",
              isCurrent 
                ? "border-brand-gold bg-brand-gold/5" 
                : "border-border"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                W{w.week}{isCurrent ? ' (Current)' : ''}
              </span>
            </div>
            <div className={cn("text-2xl font-bold", getCapacityColorClass(w.available))}>
              {w.available}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Available Capacity
            </div>
            <div className="mt-3">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all", getCapacityBarClass(w.available))}
                  style={{ width: `${Math.min(w.available, 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground mt-1.5">
                {w.peopleWithCapacity} of {totalPeople} have capacity
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
