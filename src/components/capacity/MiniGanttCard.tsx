/**
 * Mini-Gantt Timeline for Resource Cards
 * Shows 6-month allocation timeline with stacked project bars
 * DARK MODE SUPPORT INCLUDED
 * 
 * CATALYST V5 COLORS:
 * - Available: Teal #0d9488
 * - At Capacity: Blue #2563eb
 * - Over-allocated: Orange #d97706 / Red #ef4444
 */

import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { ALLOCATION_SEGMENT_COLORS, CATALYST_V5 } from '@/lib/catalyst-colors';
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
  showPeriodTotals?: boolean;
  contractEndDate?: string | null;
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

interface MonthData {
  label: string;
  start: Date;
  end: Date;
  total: number;
  isConflict: boolean;
  overflow: number;
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

export function MiniGanttCard({ allocations, className, showPeriodTotals = true, contractEndDate }: MiniGanttCardProps) {
  // Generate 6 months starting from current month
  const { monthsData, timelineStart, timelineEnd, todayPosition, bars, hasConflict, contractEndPosition } = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(addMonths(now, 5));
    
    // Generate month data with totals
    const months: MonthData[] = [];
    for (let i = 0; i < 6; i++) {
      const monthStart = startOfMonth(addMonths(start, i));
      const monthEnd = endOfMonth(monthStart);
      
      // Calculate total allocation for this month
      const monthTotal = allocations.reduce((sum, alloc) => {
        const allocStart = new Date(alloc.start_date);
        const allocEnd = alloc.end_date ? new Date(alloc.end_date) : end;
        
        // Check if allocation overlaps with this month
        if (allocStart <= monthEnd && allocEnd >= monthStart) {
          return sum + (alloc.allocation_percent || 0);
        }
        return sum;
      }, 0);
      
      months.push({
        label: format(monthStart, "MMM ''yy"),
        start: monthStart,
        end: monthEnd,
        total: monthTotal,
        isConflict: monthTotal > 100,
        overflow: Math.max(0, monthTotal - 100),
      });
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
    
    // Calculate contract end position
    let contractPos: number | null = null;
    if (contractEndDate) {
      const contractEnd = new Date(contractEndDate);
      if (contractEnd >= start && contractEnd <= end) {
        const timelineMs = end.getTime() - start.getTime();
        contractPos = ((contractEnd.getTime() - start.getTime()) / timelineMs) * 100;
      }
    }
    
    return {
      monthsData: months,
      timelineStart: start,
      timelineEnd: end,
      todayPosition: todayPos,
      bars: barSegments,
      hasConflict: months.some(m => m.isConflict),
      contractEndPosition: contractPos,
    };
  }, [allocations, contractEndDate]);

  // Empty state
  if (allocations.length === 0) {
    return (
      <div className={cn("mb-2", className)}>
        <div className="h-12 bg-muted/50 dark:bg-[var(--surface-2)] rounded border border-dashed border-border dark:border-[var(--border-subtle)] flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground dark:text-[var(--text-secondary)]">No allocations — fully available</span>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("mb-2", className)}>
        {/* Month labels */}
        <div className="flex text-[9px] text-muted-foreground dark:text-[var(--text-secondary)] mb-0.5 px-0.5">
          {monthsData.map((month, i) => (
            <div key={i} className="flex-1 text-center truncate">{month.label}</div>
          ))}
        </div>
        
        {/* Timeline container */}
        <div className="relative bg-muted/50 dark:bg-[var(--surface-2)] rounded border border-border dark:border-[var(--border-subtle)] overflow-hidden"
          style={{ height: `${Math.max(28, bars.length * 14 + 10)}px` }}
        >
          {/* Conflict zone backgrounds */}
          {monthsData.map((month, i) => month.isConflict && (
            <div
              key={`conflict-${i}`}
              className="absolute top-0 bottom-0 bg-red-100/60 dark:bg-red-900/40"
              style={{
                left: `${(i / 6) * 100}%`,
                width: `${100 / 6}%`,
              }}
            />
          ))}
          
          {/* Grid lines for months */}
          <div className="absolute inset-0 flex">
            {monthsData.map((_, i) => (
              <div key={i} className="flex-1 border-r border-border/50 dark:border-[var(--border-subtle)] last:border-r-0" />
            ))}
          </div>
          
          {/* Today marker */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
            style={{ left: `${todayPosition}%` }}
          >
            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </div>
          
          {/* Contract end marker */}
          {contractEndPosition !== null && (
            <>
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-amber-500 dark:bg-amber-400 z-15"
                style={{ left: `${contractEndPosition}%` }}
              >
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 text-[7px]">🔒</div>
              </div>
              {/* Locked zone after contract end */}
              <div 
                className="absolute top-0 bottom-0 bg-muted/60 dark:bg-[var(--surface-3)]/60 z-5"
                style={{ 
                  left: `${contractEndPosition}%`,
                  right: 0,
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.05) 3px, rgba(0,0,0,0.05) 6px)'
                }}
              />
            </>
          )}
          
          {/* Allocation bars - stacked vertically */}
          <div className="absolute inset-x-1 top-1 space-y-0.5 z-10">
            {bars.map((bar) => (
              <Tooltip key={bar.id}>
                <TooltipTrigger asChild>
                  <div
                    className="h-3.5 rounded-sm flex items-center px-1 text-white text-[8px] font-medium truncate cursor-default hover:brightness-110 hover:scale-[1.02] transition-all"
                    style={{
                      backgroundColor: bar.color,
                      marginLeft: `${bar.startPercent}%`,
                      width: `${Math.max(bar.widthPercent, 3)}%`,
                      maxWidth: `${100 - bar.startPercent}%`,
                      minWidth: '20px',
                    }}
                  >
                    <span className="truncate">
                      {bar.widthPercent > 20 
                        ? `${bar.name} ${bar.percent}%`
                        : bar.widthPercent > 10
                          ? `${bar.percent}%`
                          : ''
                      }
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-[var(--surface-elevated)] dark:bg-[var(--surface-elevated)] text-foreground dark:text-[var(--text-primary)] text-xs p-2 shadow-xl border border-border dark:border-[var(--border-subtle)]">
                  <p className="font-semibold">{bar.name}</p>
                  <p className="text-muted-foreground dark:text-[var(--text-secondary)]">{bar.percent}% allocation</p>
                  <p className="text-muted-foreground/75 dark:text-[var(--text-tertiary)] text-[10px]">
                    {format(bar.startDate, 'MMM d, yyyy')} — {bar.endDate ? format(bar.endDate, 'MMM d, yyyy') : 'Ongoing'}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
        
        {/* Period totals row */}
        {showPeriodTotals && (
          <div className="flex text-[9px] mt-0.5 px-0.5">
            {monthsData.map((month, i) => (
              <div key={i} className="flex-1 text-center">
                <span className={cn(
                  "font-semibold",
                  month.total === 0 && "text-muted-foreground/50 dark:text-[var(--text-tertiary)]",
                  month.total > 0 && month.total < 80 && "text-teal-600 dark:text-teal-400",
                  month.total >= 80 && month.total <= 100 && "text-blue-600 dark:text-blue-400",
                  month.total > 100 && "text-red-600 dark:text-red-400"
                )}>
                  {month.total}%
                  {month.isConflict && <span className="ml-0.5">⚠</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}