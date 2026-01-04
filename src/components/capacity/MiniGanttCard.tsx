/**
 * Mini-Gantt Timeline for Resource Cards
 * Shows 6-month allocation timeline with stacked project bars
 * 
 * CATALYST V5 COLORS:
 * - Available: Teal #0d9488
 * - At Capacity: Blue #2563eb
 * - Over-allocated: Orange #d97706 / Red #ef4444
 */

import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { ALLOCATION_SEGMENT_COLORS } from '@/lib/catalyst-colors';
import type { ResourceAllocation } from '@/modules/capacity-planner/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MiniGanttCardProps {
  allocations: ResourceAllocation[];
  className?: string;
}

interface BarSegment {
  id: string;
  name: string;
  percent: number;
  color: string;
  startPercent: number;
  widthPercent: number;
  startDate: Date;
  endDate: Date | null;
}

function calculateBarPosition(
  startDate: Date,
  endDate: Date | null,
  timelineStart: Date,
  timelineEnd: Date
): { startPercent: number; widthPercent: number } {
  const timelineMs = timelineEnd.getTime() - timelineStart.getTime();
  
  // Clamp start to timeline bounds
  const effectiveStart = Math.max(startDate.getTime(), timelineStart.getTime());
  const effectiveEnd = endDate 
    ? Math.min(endDate.getTime(), timelineEnd.getTime())
    : timelineEnd.getTime();
  
  const startPercent = ((effectiveStart - timelineStart.getTime()) / timelineMs) * 100;
  const widthPercent = ((effectiveEnd - effectiveStart) / timelineMs) * 100;
  
  return {
    startPercent: Math.max(0, startPercent),
    widthPercent: Math.max(0, Math.min(100 - startPercent, widthPercent))
  };
}

function calculateTodayPosition(timelineStart: Date, timelineEnd: Date): number {
  const now = new Date();
  const timelineMs = timelineEnd.getTime() - timelineStart.getTime();
  const position = ((now.getTime() - timelineStart.getTime()) / timelineMs) * 100;
  return Math.max(0, Math.min(100, position));
}

export function MiniGanttCard({ allocations, className }: MiniGanttCardProps) {
  // Generate 6 months starting from current month
  const { months, timelineStart, timelineEnd, todayPosition, bars } = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(addMonths(now, 5));
    
    const monthLabels: string[] = [];
    for (let i = 0; i < 6; i++) {
      const month = addMonths(start, i);
      monthLabels.push(format(month, "MMM ''yy"));
    }
    
    const todayPos = calculateTodayPosition(start, end);
    
    // Calculate bar positions for each allocation
    const barSegments: BarSegment[] = allocations
      .filter(alloc => {
        // Filter to allocations that overlap with our timeline
        const allocStart = new Date(alloc.start_date);
        const allocEnd = alloc.end_date ? new Date(alloc.end_date) : end;
        return allocStart <= end && allocEnd >= start;
      })
      .map((alloc, index) => {
        const allocStart = new Date(alloc.start_date);
        const allocEnd = alloc.end_date ? new Date(alloc.end_date) : null;
        const { startPercent, widthPercent } = calculateBarPosition(allocStart, allocEnd, start, end);
        
        return {
          id: alloc.id,
          name: alloc.assignment_name || 'Unknown',
          percent: alloc.allocation_percent,
          color: ALLOCATION_SEGMENT_COLORS[index % ALLOCATION_SEGMENT_COLORS.length],
          startPercent,
          widthPercent,
          startDate: allocStart,
          endDate: allocEnd,
        };
      });
    
    return {
      months: monthLabels,
      timelineStart: start,
      timelineEnd: end,
      todayPosition: todayPos,
      bars: barSegments,
    };
  }, [allocations]);

  // Empty state
  if (allocations.length === 0) {
    return (
      <div className={cn("mb-2", className)}>
        <div className="h-12 bg-slate-50 rounded border border-dashed border-slate-200 flex items-center justify-center">
          <span className="text-[10px] text-slate-400">No allocations — fully available</span>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("mb-2", className)}>
        {/* Month labels */}
        <div className="flex text-[9px] text-slate-400 mb-0.5 px-0.5">
          {months.map((month, i) => (
            <div key={i} className="flex-1 text-center truncate">{month}</div>
          ))}
        </div>
        
        {/* Timeline container */}
        <div className="relative bg-slate-50 rounded border border-slate-200 overflow-hidden"
          style={{ height: `${Math.max(24, bars.length * 14 + 8)}px` }}
        >
          {/* Grid lines for months */}
          <div className="absolute inset-0 flex">
            {months.map((_, i) => (
              <div key={i} className="flex-1 border-r border-slate-100 last:border-r-0" />
            ))}
          </div>
          
          {/* Today marker */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
            style={{ left: `${todayPosition}%` }}
          >
            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </div>
          
          {/* Allocation bars - stacked vertically */}
          <div className="absolute inset-x-1 top-1 space-y-0.5 z-10">
            {bars.map((bar) => (
              <Tooltip key={bar.id}>
                <TooltipTrigger asChild>
                  <div
                    className="h-3 rounded-sm flex items-center px-1 text-white text-[8px] font-medium truncate cursor-default hover:brightness-110 transition-all"
                    style={{
                      backgroundColor: bar.color,
                      marginLeft: `${bar.startPercent}%`,
                      width: `${Math.max(bar.widthPercent, 2)}%`,
                      maxWidth: `${100 - bar.startPercent}%`,
                    }}
                  >
                    <span className="truncate">
                      {bar.widthPercent > 15 ? `${bar.name} ${bar.percent}%` : bar.percent > 0 ? `${bar.percent}%` : ''}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-slate-900 text-white text-xs p-2">
                  <p className="font-semibold">{bar.name}</p>
                  <p className="text-slate-300">{bar.percent}% allocation</p>
                  <p className="text-slate-400 text-[10px]">
                    {format(bar.startDate, 'MMM d, yyyy')} — {bar.endDate ? format(bar.endDate, 'MMM d, yyyy') : 'Ongoing'}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
