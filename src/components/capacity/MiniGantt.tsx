/**
 * MiniGantt Component - V2.1 Monopoly-Grade Implementation
 * Visual timeline for resource allocations
 */

import { useMemo } from 'react';
import { format, addMonths, differenceInDays, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

interface Allocation {
  id: string;
  assignmentName: string;
  assignmentColor: string;
  allocationPercent: number;
  startDate: string;
  endDate?: string;
}

interface MiniGanttProps {
  allocations: Allocation[];
  startDate?: Date;
  endDate?: Date;
  showToday?: boolean;
  height?: number;
  className?: string;
}

export function MiniGantt({
  allocations,
  startDate = startOfMonth(new Date()),
  endDate = addMonths(startOfMonth(new Date()), 6),
  showToday = true,
  height = 60,
  className
}: MiniGanttProps) {
  const totalDays = differenceInDays(endDate, startDate);
  const todayOffset = differenceInDays(new Date(), startDate);
  const todayPercent = (todayOffset / totalDays) * 100;

  // Generate month labels
  const months = useMemo(() => {
    const result = [];
    let current = new Date(startDate);
    while (current < endDate) {
      result.push({
        label: format(current, 'MMM'),
        startPercent: (differenceInDays(current, startDate) / totalDays) * 100
      });
      current = addMonths(current, 1);
    }
    return result;
  }, [startDate, endDate, totalDays]);

  // Calculate bar positions
  const bars = useMemo(() => {
    return allocations.map(alloc => {
      const allocStart = new Date(alloc.startDate);
      const allocEnd = alloc.endDate ? new Date(alloc.endDate) : endDate;

      const startOffset = Math.max(0, differenceInDays(allocStart, startDate));
      const endOffset = Math.min(totalDays, differenceInDays(allocEnd, startDate));

      return {
        allocation: alloc,
        left: (startOffset / totalDays) * 100,
        width: ((endOffset - startOffset) / totalDays) * 100
      };
    });
  }, [allocations, startDate, endDate, totalDays]);

  return (
    <div className={cn("mini-gantt relative", className)} style={{ height }}>
      {/* Month Labels */}
      <div className="absolute top-0 left-0 right-0 flex text-xs text-muted-foreground">
        {months.map((month, i) => (
          <div
            key={i}
            className="absolute"
            style={{ left: `${month.startPercent}%` }}
          >
            {month.label}
          </div>
        ))}
      </div>

      {/* Grid Lines */}
      <div className="absolute top-4 left-0 right-0 bottom-0">
        {months.map((month, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-l border-border/50"
            style={{ left: `${month.startPercent}%` }}
          />
        ))}
      </div>

      {/* Today Marker */}
      {showToday && todayPercent >= 0 && todayPercent <= 100 && (
        <div
          className="absolute top-4 bottom-0 w-0.5 bg-destructive z-20"
          style={{ left: `${todayPercent}%` }}
        >
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-destructive rounded-full" />
        </div>
      )}

      {/* Allocation Bars */}
      <div className="absolute top-6 left-0 right-0 bottom-0">
        {bars.map((bar, index) => (
          <div
            key={bar.allocation.id}
            className="absolute h-4 rounded-sm cursor-pointer hover:brightness-110 transition-all flex items-center"
            style={{
              left: `${bar.left}%`,
              width: `${Math.max(bar.width, 8)}%`,
              minWidth: '60px',
              top: index * 18,
              backgroundColor: bar.allocation.assignmentColor
            }}
            title={`${bar.allocation.assignmentName} (${bar.allocation.allocationPercent}%)`}
          >
            {/* Always show label - resource name is critical */}
            <span 
              className="text-[10px] px-1.5 truncate block leading-4 text-white font-medium"
              style={{ textShadow: '0 0 3px rgba(0,0,0,0.7), 0 1px 2px rgba(0,0,0,0.5)' }}
            >
              {bar.allocation.assignmentName}
            </span>
          </div>
        ))}

        {/* Empty State */}
        {bars.length === 0 && (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            No allocations — fully available
          </div>
        )}
      </div>
    </div>
  );
}
