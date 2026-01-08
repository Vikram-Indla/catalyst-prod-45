/**
 * Timeline Header
 * Month columns with count indicators
 */

import { cn } from '@/lib/utils';

interface TimelineHeaderProps {
  monthlyTotals: Record<number, number>;
  currentMonth: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getNumberClass(count: number): string {
  if (count === 0) return 'text-muted-foreground/40';
  if (count <= 3) return 'text-foreground';
  if (count <= 6) return 'text-[#d97706]';
  return 'text-[#ef4444]';
}

export function TimelineHeader({ monthlyTotals, currentMonth }: TimelineHeaderProps) {
  return (
    <div className="grid grid-cols-[240px_repeat(12,1fr)] bg-muted/50 border-b border-border">
      {/* Corner cell */}
      <div className="p-4 flex items-end border-r border-border">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
          Department
        </span>
      </div>
      
      {/* Month cells */}
      {MONTHS.map((month, index) => (
        <div 
          key={month}
          className={cn(
            "py-3 px-1.5 text-center border-l border-border relative",
            index === currentMonth && "bg-[#2563eb]/[0.06]"
          )}
        >
          {index === currentMonth && (
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#2563eb]" />
          )}
          <div className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.02em] mb-1",
            index === currentMonth ? "text-[#2563eb] font-bold" : "text-muted-foreground"
          )}>
            {month} 26
          </div>
          <div className={cn("text-[20px] font-extrabold tracking-[-0.03em] leading-none", getNumberClass(monthlyTotals[index] || 0))}>
            {monthlyTotals[index] || 0}
          </div>
          {index === currentMonth && (
            <span className="inline-block mt-1.5 px-2 py-0.5 bg-[#2563eb] rounded text-[8px] font-bold text-white uppercase tracking-[0.06em]">
              Now
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
