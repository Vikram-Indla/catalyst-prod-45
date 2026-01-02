/**
 * Timeline View (Gantt-style)
 * Displays allocations as horizontal bars spanning date ranges
 * Updated for Time-Boxed Allocation System
 */

import { useMemo } from 'react';
import { Resource, CapacityProject } from '@/types/capacity';
import { getWeekDateRange } from '@/lib/capacityUtils';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addWeeks, isWithinInterval, startOfDay, endOfDay, addDays } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CATALYST_GOLDEN_HOUR, getAllocationStatusTheme } from '@/lib/catalyst-colors';
import type { ResourceAllocation, TimelinePeriod } from '@/modules/capacity-planner/types';

interface TimelineViewProps {
  resources: Resource[];
  projects: CapacityProject[];
  startWeek: number;
  startYear: number;
  currentWeek: number;
  // New props for time-boxed allocations
  allocations?: ResourceAllocation[];
  onCellClick?: (resourceId: string, period: TimelinePeriod) => void;
}

// Golden Hour colors for allocation bars
const BAR_COLORS = [
  CATALYST_GOLDEN_HOUR.olive,
  CATALYST_GOLDEN_HOUR.bronze,
  CATALYST_GOLDEN_HOUR.gold,
  CATALYST_GOLDEN_HOUR.champagne,
  CATALYST_GOLDEN_HOUR.grey,
];

export function TimelineView({ 
  resources, 
  projects, 
  startWeek, 
  startYear,
  currentWeek,
  allocations = [],
  onCellClick,
}: TimelineViewProps) {
  // Generate periods (4 weeks from startWeek)
  const periods = useMemo(() => {
    const result: TimelinePeriod[] = [];
    // Find the start date of the starting week
    const yearStart = new Date(startYear, 0, 1);
    const firstDayOfYear = startOfWeek(yearStart, { weekStartsOn: 0 });
    let weekStart = addWeeks(firstDayOfYear, startWeek - 1);
    
    for (let i = 0; i < 4; i++) {
      const weekEnd = addDays(weekStart, 6);
      let weekNum = startWeek + i;
      let yearNum = startYear;
      if (weekNum > 52) {
        weekNum = weekNum - 52;
        yearNum++;
      }
      result.push({
        label: `W${weekNum}`,
        start: weekStart,
        end: weekEnd,
      });
      weekStart = addWeeks(weekStart, 1);
    }
    return result;
  }, [startWeek, startYear]);

  // Build a map of resourceId -> allocations
  const allocationsByResource = useMemo(() => {
    const map = new Map<string, ResourceAllocation[]>();
    allocations.forEach((a) => {
      const key = a.resource_id;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(a);
    });
    return map;
  }, [allocations]);

  // Legacy helpers
  const getProjectColor = (projectId: string): string => {
    const project = projects.find(p => p.id === projectId);
    return project?.color || 'hsl(var(--muted-foreground))';
  };

  const getProjectName = (projectId: string): string => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown';
  };

  // Get allocations that overlap with a period
  const getAllocationsForPeriod = (resourceId: string, period: TimelinePeriod) => {
    const resourceAllocations = allocationsByResource.get(resourceId) || [];
    return resourceAllocations.filter((a) => {
      const allocStart = startOfDay(new Date(a.start_date));
      const allocEnd = endOfDay(new Date(a.end_date));
      const periodStart = startOfDay(period.start);
      const periodEnd = endOfDay(period.end);
      return allocStart <= periodEnd && allocEnd >= periodStart;
    });
  };

  // Calculate total allocation for a period
  const getTotalAllocation = (resourceId: string, period: TimelinePeriod) => {
    const periodAllocations = getAllocationsForPeriod(resourceId, period);
    return periodAllocations.reduce((sum, a) => sum + a.allocation_percent, 0);
  };

  // Use new time-boxed allocations if available, otherwise fall back to legacy
  const hasTimeBoxedAllocations = allocations.length > 0;

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr>
              <th className="text-left font-semibold text-xs text-muted-foreground p-3 border border-border bg-muted min-w-[220px] sticky left-0 z-10">
                Resource
              </th>
              {periods.map((period, idx) => {
                const weekNum = startWeek + idx > 52 ? startWeek + idx - 52 : startWeek + idx;
                const isCurrent = weekNum === currentWeek;
                return (
                  <th 
                    key={period.label}
                    className={cn(
                      "text-center font-semibold text-xs p-3 border border-border bg-muted min-w-[180px]",
                      isCurrent && "bg-brand-primary/10 text-brand-primary"
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-semibold">{period.label}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        {format(period.start, 'MMM d')} - {format(period.end, 'MMM d')}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <tr key={resource.id} className="hover:bg-muted/50">
                <td className="p-3 border border-border sticky left-0 bg-card z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {resource.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-foreground whitespace-nowrap">
                        {resource.name}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {resource.role}
                      </div>
                    </div>
                  </div>
                </td>
                {periods.map((period) => {
                  if (hasTimeBoxedAllocations) {
                    // New time-boxed view with Gantt-style bars
                    const periodAllocations = getAllocationsForPeriod(resource.id, period);
                    const totalPct = getTotalAllocation(resource.id, period);
                    const statusTheme = getAllocationStatusTheme(totalPct);

                    return (
                      <td 
                        key={period.label} 
                        className="p-2 border border-border align-top cursor-pointer hover:bg-muted/30"
                        onClick={() => onCellClick?.(resource.id, period)}
                      >
                        {periodAllocations.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {periodAllocations.map((allocation, idx) => {
                              const barColor = BAR_COLORS[idx % BAR_COLORS.length];
                              return (
                                <Tooltip key={allocation.id}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="rounded px-2 py-1 text-xs font-medium cursor-default truncate"
                                      style={{ 
                                        backgroundColor: `${barColor}20`,
                                        color: barColor,
                                        borderLeft: `3px solid ${barColor}`,
                                      }}
                                    >
                                      {allocation.assignment_name || 'Allocation'} – {allocation.allocation_percent}%
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="bg-foreground text-background text-xs max-w-xs">
                                    <p className="font-medium">{allocation.assignment_name || 'Allocation'}</p>
                                    <p>{allocation.allocation_percent}%</p>
                                    <p className="text-muted-foreground">
                                      {format(new Date(allocation.start_date), 'MMM d')} – {format(new Date(allocation.end_date), 'MMM d, yyyy')}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                            {/* Total badge if multiple allocations */}
                            {periodAllocations.length > 1 && (
                              <div 
                                className="text-[10px] font-bold px-2 py-0.5 rounded self-start"
                                style={{ backgroundColor: statusTheme.bg, color: statusTheme.text }}
                              >
                                Total: {totalPct}%
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground text-center py-2">—</div>
                        )}
                      </td>
                    );
                  } else {
                    // Legacy view for resources without time-boxed allocations
                    const weekAllocations = resource.allocations.filter(
                      a => {
                        const weekNum = startWeek + periods.indexOf(period);
                        const yearNum = weekNum > 52 ? startYear + 1 : startYear;
                        const adjustedWeek = weekNum > 52 ? weekNum - 52 : weekNum;
                        return a.weekNumber === adjustedWeek && a.year === yearNum;
                      }
                    );

                    return (
                      <td key={period.label} className="p-2 border border-border align-top">
                        {weekAllocations.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {weekAllocations.map((allocation) => {
                              const projectColor = getProjectColor(allocation.projectId);
                              const projectName = getProjectName(allocation.projectId);
                              return (
                                <Tooltip key={allocation.id}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="rounded px-2 py-1 text-xs font-medium cursor-default"
                                      style={{ 
                                        backgroundColor: `${projectColor}20`,
                                        color: projectColor,
                                      }}
                                    >
                                      {allocation.percentage}%
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="bg-foreground text-background text-xs">
                                    <p className="font-medium">{projectName}</p>
                                    <p>{allocation.percentage}% allocation</p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground text-center py-2">—</div>
                        )}
                      </td>
                    );
                  }
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {resources.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No resources found matching your filters
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
