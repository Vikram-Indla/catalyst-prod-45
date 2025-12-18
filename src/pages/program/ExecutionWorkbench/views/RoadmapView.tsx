/**
 * WorkBench views: Table/Gantt/Roadmap/Board/Swimlane
 * 
 * Variant C: Roadmap View - Simplified time-phased view (quarter/year)
 * Timeline is derived from data or current year if no dates
 */

import React, { useMemo } from 'react';
import { WorkItem, HealthStatus } from '../types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, startOfQuarter, endOfQuarter, differenceInDays, addQuarters, subQuarters, getQuarter, getYear } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RoadmapViewProps {
  items: WorkItem[];
  onItemClick: (item: WorkItem) => void;
  selectedYear?: number;
}

interface Quarter {
  label: string;
  start: Date;
  end: Date;
}

function getHealthColor(health: HealthStatus): string {
  switch (health) {
    case 'On Track': return 'bg-secondary-green';
    case 'At Risk': return 'bg-brand-gold';
    case 'Blocked': return 'bg-destructive';
    default: return 'bg-muted';
  }
}

function getHealthBorder(health: HealthStatus): string {
  switch (health) {
    case 'On Track': return 'border-secondary-green';
    case 'At Risk': return 'border-brand-gold';
    case 'Blocked': return 'border-destructive';
    default: return 'border-muted';
  }
}

interface RoadmapRowProps {
  item: WorkItem;
  onItemClick: (item: WorkItem) => void;
  timelineStart: Date;
  totalDays: number;
}

function dateToPercent(date: Date, timelineStart: Date, totalDays: number): number {
  const days = differenceInDays(date, timelineStart);
  return Math.max(0, Math.min(100, (days / totalDays) * 100));
}

function RoadmapRow({ item, onItemClick, timelineStart, totalDays }: RoadmapRowProps) {
  const startDate = item.startDate ? new Date(item.startDate) : null;
  const endDate = item.endDate ? new Date(item.endDate) : null;

  const barStart = startDate ? dateToPercent(startDate, timelineStart, totalDays) : 0;
  const barEnd = endDate ? dateToPercent(endDate, timelineStart, totalDays) : 0;
  const barWidth = Math.max(2, barEnd - barStart);

  const hasValidDates = startDate && endDate;

  // Get features as markers
  const featureMarkers = useMemo(() => {
    if (!item.children || item.type !== 'epic') return [];
    return item.children.filter(child => child.endDate).map(child => ({
      ...child,
      position: dateToPercent(new Date(child.endDate!), timelineStart, totalDays)
    }));
  }, [item.children, item.type, timelineStart, totalDays]);

  return (
    <div className="flex items-stretch border-b border-border/50 hover:bg-muted/30 transition-colors min-h-[56px]">
      {/* Left panel */}
      <div 
        className="w-[280px] flex-shrink-0 py-3 px-4 flex items-center gap-3 cursor-pointer border-r border-border/50"
        onClick={() => onItemClick(item)}
      >
        <div className={cn(
          "w-1 h-8 rounded-full",
          getHealthColor(item.health)
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-brand-gold">{item.key}</span>
            {item.owner && (
              <span className="text-xs text-muted-foreground truncate">• {item.owner}</span>
            )}
          </div>
          <p className="text-sm font-medium truncate">{item.title}</p>
        </div>
      </div>

      {/* Timeline area */}
      <div className="flex-1 relative py-3 px-2">
        {hasValidDates ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 h-8 rounded-md cursor-pointer transition-all border-2",
                    getHealthColor(item.health),
                    getHealthBorder(item.health)
                  )}
                  style={{
                    left: `${barStart}%`,
                    width: `${barWidth}%`,
                    minWidth: '12px'
                  }}
                  onClick={() => onItemClick(item)}
                >
                  {/* Progress fill */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-white/20 rounded-l"
                    style={{ width: `${item.progress}%` }}
                  />
                  
                  {/* Label inside bar */}
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white truncate px-1">
                    {item.progress}%
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[320px]">
                <div className="space-y-2">
                  <div>
                    <p className="font-semibold">{item.key}: {item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(startDate!, 'MMM d, yyyy')} → {format(endDate!, 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-[10px]">{item.health}</Badge>
                    <span>{item.progress}% complete</span>
                  </div>
                  {item.children && item.children.length > 0 && (
                    <div className="pt-1 border-t border-border">
                      <p className="text-xs font-medium mb-1">{item.children.length} Features:</p>
                      <div className="space-y-0.5 max-h-[100px] overflow-y-auto">
                        {item.children.slice(0, 5).map(child => (
                          <p key={child.id} className="text-xs text-muted-foreground truncate">
                            {child.key}: {child.title}
                          </p>
                        ))}
                        {item.children.length > 5 && (
                          <p className="text-xs text-muted-foreground">+{item.children.length - 5} more</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div 
            className="absolute top-1/2 -translate-y-1/2 left-4 text-xs text-muted-foreground cursor-pointer"
            onClick={() => onItemClick(item)}
          >
            No dates set
          </div>
        )}

        {/* Feature markers */}
        {hasValidDates && featureMarkers.slice(0, 3).map((feature, i) => (
          <div
            key={feature.id}
            className="absolute bottom-1 w-2 h-2 rounded-full bg-secondary-bronze border border-white"
            style={{ left: `${feature.position}%`, transform: 'translateX(-50%)' }}
            title={`${feature.key}: ${feature.title}`}
          />
        ))}
      </div>
    </div>
  );
}

export function RoadmapView({ items, onItemClick, selectedYear }: RoadmapViewProps) {
  // Derive quarters and timeline from data or selected year
  const { quarters, timelineStart, timelineEnd, totalDays } = useMemo(() => {
    // Collect all dates from items
    const allDates: Date[] = [];
    items.forEach(item => {
      if (item.startDate) allDates.push(new Date(item.startDate));
      if (item.endDate) allDates.push(new Date(item.endDate));
    });

    let start: Date;
    let end: Date;

    if (selectedYear) {
      // Use selected year + buffer
      start = new Date(selectedYear, 0, 1);
      end = new Date(selectedYear, 11, 31);
    } else if (allDates.length > 0) {
      // Derive from data
      const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
      start = startOfQuarter(subQuarters(minDate, 1));
      end = endOfQuarter(addQuarters(maxDate, 1));
    } else {
      // Default to current year
      const now = new Date();
      start = new Date(getYear(now), 0, 1);
      end = new Date(getYear(now), 11, 31);
    }

    // Generate quarters
    const quartersList: Quarter[] = [];
    let current = startOfQuarter(start);
    const finalEnd = endOfQuarter(end);
    
    while (current <= finalEnd) {
      const qEnd = endOfQuarter(current);
      quartersList.push({
        label: `Q${getQuarter(current)} ${getYear(current)}`,
        start: current,
        end: qEnd,
      });
      current = addQuarters(current, 1);
    }

    return {
      quarters: quartersList,
      timelineStart: quartersList[0]?.start || start,
      timelineEnd: quartersList[quartersList.length - 1]?.end || end,
      totalDays: differenceInDays(quartersList[quartersList.length - 1]?.end || end, quartersList[0]?.start || start),
    };
  }, [items, selectedYear]);

  // Today line position - actual current date
  const today = new Date();
  const todayPercent = dateToPercent(today, timelineStart, totalDays);
  const showTodayLine = today >= timelineStart && today <= timelineEnd;

  // Filter to show only epics in roadmap view
  const epics = useMemo(() => items.filter(item => item.type === 'epic'), [items]);

  if (epics.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No epics match your filters
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-stretch border-b border-border bg-muted/50 sticky top-0 z-10">
        <div className="w-[280px] flex-shrink-0 py-3 px-4 border-r border-border/50">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Epics
          </span>
        </div>
        <div className="flex-1 flex">
          {quarters.map((quarter, i) => (
            <div 
              key={i}
              className="flex-1 py-3 px-2 text-center border-r border-border/30 last:border-r-0"
            >
              <span className="text-xs font-semibold text-muted-foreground">
                {quarter.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto relative">
        {/* Quarter grid lines */}
        <div className="absolute inset-0 flex pointer-events-none" style={{ left: '280px', right: 0 }}>
          {quarters.map((_, i) => (
            <div key={i} className="flex-1 border-r border-border/20 last:border-r-0" />
          ))}
        </div>

        {/* Today line */}
        {showTodayLine && (
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-destructive/60 z-20"
            style={{ left: `calc(280px + ${todayPercent}% * (100% - 280px) / 100)` }}
          />
        )}

        {/* Rows */}
        {epics.map(item => (
          <RoadmapRow 
            key={item.id} 
            item={item} 
            onItemClick={onItemClick} 
            timelineStart={timelineStart}
            totalDays={totalDays}
          />
        ))}
      </div>
    </div>
  );
}
