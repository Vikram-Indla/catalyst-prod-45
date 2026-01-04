/**
 * HeatmapView Component - V2.1 Monopoly-Grade Implementation
 * Density visualization for capacity at a glance
 */

import { useMemo } from 'react';
import { format, startOfWeek, addWeeks, eachWeekOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { CATALYST } from '@/lib/catalyst-colors';

interface ResourceMetric {
  id: string;
  name: string;
  role?: string;
  department?: string;
  allocation?: number;
}

interface ResourceAllocation {
  profile_id?: string;
  assignment_name?: string;
  allocation_percent: number;
  start_date: string;
  end_date: string;
}

interface HeatmapViewProps {
  resources: ResourceMetric[];
  allocations: ResourceAllocation[];
  weeksToShow?: number;
  className?: string;
}

export function HeatmapView({
  resources,
  allocations,
  weeksToShow = 12,
  className
}: HeatmapViewProps) {
  // Generate weeks
  const weeks = useMemo(() => {
    const start = startOfWeek(new Date());
    const end = addWeeks(start, weeksToShow);
    return eachWeekOfInterval({ start, end });
  }, [weeksToShow]);

  // Calculate allocation per resource per week
  const heatmapData = useMemo(() => {
    return resources.map(resource => {
      const resourceAllocations = allocations.filter(a => a.profile_id === resource.id);
      
      const weeklyData = weeks.map(weekStart => {
        const weekEnd = addWeeks(weekStart, 1);
        
        // Sum allocations that overlap with this week
        let totalAllocation = 0;
        resourceAllocations.forEach(alloc => {
          const allocStart = new Date(alloc.start_date);
          const allocEnd = new Date(alloc.end_date);
          
          // Check if allocation overlaps with this week
          if (allocStart < weekEnd && allocEnd > weekStart) {
            totalAllocation += alloc.allocation_percent;
          }
        });
        
        return {
          week: weekStart,
          allocation: totalAllocation
        };
      });
      
      return {
        resource,
        weeks: weeklyData
      };
    });
  }, [resources, allocations, weeks]);

  // Get color based on allocation percentage
  const getHeatColor = (allocation: number) => {
    if (allocation === 0) return 'bg-slate-100';
    if (allocation < 50) return 'bg-teal-200';
    if (allocation < 80) return 'bg-teal-400';
    if (allocation <= 100) return 'bg-blue-500';
    return 'bg-amber-500'; // Over-allocated
  };

  const getHeatOpacity = (allocation: number) => {
    if (allocation === 0) return 'opacity-50';
    return 'opacity-100';
  };

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="min-w-max">
        {/* Header with week labels */}
        <div className="flex items-center border-b border-border pb-2 mb-2">
          <div className="w-48 flex-shrink-0 text-sm font-medium text-muted-foreground">
            Resource
          </div>
          {weeks.map((week, i) => (
            <div
              key={i}
              className="w-8 flex-shrink-0 text-center text-xs text-muted-foreground"
            >
              {format(week, 'M/d')}
            </div>
          ))}
        </div>

        {/* Heatmap rows */}
        <div className="space-y-1">
          {heatmapData.map(({ resource, weeks: weeklyData }) => (
            <div key={resource.id} className="flex items-center group hover:bg-muted/30 rounded">
              <div className="w-48 flex-shrink-0 pr-3">
                <div className="text-sm font-medium text-foreground truncate">
                  {resource.name}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {resource.role}
                </div>
              </div>
              
              {weeklyData.map((data, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-8 h-6 flex-shrink-0 flex items-center justify-center rounded-sm mx-0.5 transition-all cursor-pointer hover:ring-2 hover:ring-primary/50",
                    getHeatColor(data.allocation),
                    getHeatOpacity(data.allocation)
                  )}
                  title={`${format(data.week, 'MMM d')}: ${data.allocation}%`}
                >
                  {data.allocation > 0 && (
                    <span className="text-[10px] font-medium text-white">
                      {data.allocation > 100 ? '!' : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
          <span className="text-xs text-muted-foreground">Legend:</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-slate-100" />
            <span className="text-xs text-muted-foreground">0%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-teal-200" />
            <span className="text-xs text-muted-foreground">1-50%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-teal-400" />
            <span className="text-xs text-muted-foreground">50-80%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-blue-500" />
            <span className="text-xs text-muted-foreground">80-100%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-amber-500" />
            <span className="text-xs text-muted-foreground">&gt;100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
