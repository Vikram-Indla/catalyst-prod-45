/**
 * Right panel containing the timeline visualization
 */

import React, { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RoadmapTimelineHeader } from './RoadmapTimelineHeader';
import { RoadmapTimelineBar, RoadmapUnscheduledIndicator } from './RoadmapTimelineBar';
import { RoadmapTodayMarker } from './RoadmapTodayMarker';
import { generateTimelinePeriods, calculateBarPosition } from '../utils/timeline';
import type { RoadmapDemand, TimelineConfig, RoadmapGroup } from '../types/roadmap';
import { cn } from '@/lib/utils';

interface RoadmapTimelinePanelProps {
  items: RoadmapDemand[];
  groups?: RoadmapGroup[];
  config: TimelineConfig;
  selectedItemId: string | null;
  onItemClick: (id: string) => void;
  onDateChange: (id: string, start: string | null, end: string | null) => void;
}

export function RoadmapTimelinePanel({
  items,
  groups,
  config,
  selectedItemId,
  onItemClick,
  onDateChange,
}: RoadmapTimelinePanelProps) {
  // Generate timeline periods based on config
  const periods = useMemo(() => 
    generateTimelinePeriods(config),
    [config]
  );

  // Calculate today marker position
  const todayPosition = useMemo(() => {
    const today = new Date();
    const totalDays = (config.endDate.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceStart = (today.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24);
    return (daysSinceStart / totalDays) * 100;
  }, [config.startDate, config.endDate]);

  // Render items for a given list
  const renderTimelineRows = (rowItems: RoadmapDemand[]) => {
    return rowItems.map((item) => {
      const position = calculateBarPosition(item.start_date, item.end_date, config.startDate, config.endDate);
      const hasValidDates = item.start_date && item.end_date;

      return (
        <div 
          key={item.id} 
          className="relative h-[52px] border-b border-border"
        >
          {/* Grid lines */}
          <div className="absolute inset-0 flex">
            {periods.map((period, idx) => (
              <div 
                key={period.key}
                className={cn(
                  'flex-1 border-r border-border/50 last:border-r-0',
                  period.isCurrent && 'bg-primary/5'
                )}
              />
            ))}
          </div>

          {/* Bar or unscheduled indicator */}
          {hasValidDates && position ? (
            <RoadmapTimelineBar
              item={item}
              left={position.left}
              width={position.width}
              isSelected={selectedItemId === item.id}
              onClick={() => onItemClick(item.id)}
            />
          ) : (
            <RoadmapUnscheduledIndicator item={item} />
          )}
        </div>
      );
    });
  };

  // If groups are provided, render grouped view
  if (groups && groups.length > 0) {
    return (
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <RoadmapTimelineHeader periods={periods} zoom={config.zoom} />
        
        <ScrollArea className="flex-1">
          <div className="relative">
            {/* Today marker */}
            {config.showToday && <RoadmapTodayMarker position={todayPosition} />}

            {groups.map((group) => (
              <div key={group.key}>
                {/* Group header row */}
                <div className="h-[36px] border-b border-border bg-muted/50 relative">
                  <div className="absolute inset-0 flex">
                    {periods.map((period) => (
                      <div 
                        key={period.key}
                        className="flex-1 border-r border-border/50 last:border-r-0"
                      />
                    ))}
                  </div>
                </div>

                {/* Group items */}
                {group.isExpanded && renderTimelineRows(group.items)}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Flat view
  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <RoadmapTimelineHeader periods={periods} zoom={config.zoom} />
      
      <ScrollArea className="flex-1">
        <div className="relative">
          {/* Today marker */}
          {config.showToday && <RoadmapTodayMarker position={todayPosition} />}

          {renderTimelineRows(items)}
        </div>
      </ScrollArea>
    </div>
  );
}
