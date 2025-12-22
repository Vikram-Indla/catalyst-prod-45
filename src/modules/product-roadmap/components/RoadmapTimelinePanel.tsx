/**
 * Right panel containing the timeline visualization
 * With horizontal scroll, gridlines, and proper Catalyst styling
 */

import React, { useMemo } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { RoadmapTimelineHeader } from './RoadmapTimelineHeader';
import { RoadmapTimelineBar, RoadmapUnscheduledIndicator } from './RoadmapTimelineBar';
import { RoadmapTodayMarker } from './RoadmapTodayMarker';
import { generateTimelinePeriods, calculateBarPosition } from '../utils/timeline';
import type { RoadmapDemand, TimelineConfig, RoadmapGroup } from '../types/roadmap';
import { useRoadmapTheme } from '../lib/useRoadmapTheme';
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
  const { tokens, isDark } = useRoadmapTheme();
  
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

  // Calculate min-width for horizontal scroll
  const periodMinWidth = config.zoom === 'month' ? 120 : config.zoom === 'quarter' ? 200 : 280;
  const totalMinWidth = periods.length * periodMinWidth;

  // Handle set dates action
  const handleSetDates = (itemId: string) => {
    // Default to today + 30 days
    const start = new Date().toISOString().split('T')[0];
    const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    onDateChange(itemId, start, end);
  };

  // Render timeline row with proper styling
  const renderTimelineRow = (item: RoadmapDemand, rowIndex: number) => {
    const position = calculateBarPosition(item.start_date, item.end_date, config.startDate, config.endDate);
    const hasValidDates = item.start_date && item.end_date;
    const isSelected = selectedItemId === item.id;

    return (
      <div 
        key={item.id} 
        className="relative h-[52px] flex items-center transition-colors cursor-pointer"
        style={{
          backgroundColor: isSelected 
            ? tokens.surface.active 
            : 'transparent',
          borderBottom: `1px solid ${tokens.border.subtle}`,
        }}
        onClick={() => onItemClick(item.id)}
        onMouseEnter={(e) => {
          if (!isSelected) {
            (e.currentTarget as HTMLElement).style.backgroundColor = tokens.surface.active;
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          }
        }}
      >
        {/* Bar or unscheduled indicator */}
        {hasValidDates && position ? (
          <RoadmapTimelineBar
            item={item}
            left={position.left}
            width={position.width}
            isSelected={isSelected}
            onClick={() => onItemClick(item.id)}
          />
        ) : (
          <RoadmapUnscheduledIndicator 
            item={item} 
            onSetDates={() => handleSetDates(item.id)}
          />
        )}
      </div>
    );
  };

  // Render vertical gridlines
  const renderGridlines = () => (
    <div className="absolute inset-0 pointer-events-none flex">
      {periods.map((period, index) => (
        <div
          key={period.key}
          className="flex-shrink-0 border-r"
          style={{
            minWidth: `${periodMinWidth}px`,
            width: `${100 / periods.length}%`,
            borderColor: tokens.border.default,
            backgroundColor: period.isCurrent 
              ? (isDark ? 'rgba(198, 156, 109, 0.12)' : 'rgba(198, 156, 109, 0.06)')
              : index % 2 === 0 
                ? tokens.surface.bg 
                : 'transparent',
          }}
        />
      ))}
    </div>
  );

  // If groups are provided, render grouped view
  if (groups && groups.length > 0) {
    return (
      <div 
        className="flex-1 flex flex-col min-w-0 overflow-hidden"
        style={{ backgroundColor: tokens.surface.card }}
      >
        <ScrollArea className="flex-1 w-full">
          <div style={{ minWidth: `${totalMinWidth}px` }}>
            <RoadmapTimelineHeader periods={periods} zoom={config.zoom} />
            
            <div className="relative">
              {/* Gridlines */}
              {renderGridlines()}
              
              {/* Today marker */}
              {config.showToday && <RoadmapTodayMarker position={todayPosition} />}

              {groups.map((group) => (
                <div key={group.key}>
                  {/* Group header row */}
                  <div 
                    className="h-[36px] relative flex"
                    style={{
                      backgroundColor: tokens.surface.hover,
                      borderBottom: `1px solid ${tokens.border.default}`,
                    }}
                  >
                    {/* Group header gridlines */}
                    {periods.map((period, idx) => (
                      <div
                        key={period.key}
                        className="flex-shrink-0 border-r"
                        style={{
                          minWidth: `${periodMinWidth}px`,
                          width: `${100 / periods.length}%`,
                          borderColor: tokens.border.subtle,
                        }}
                      />
                    ))}
                  </div>

                  {/* Group items */}
                  {group.isExpanded && group.items.map((item, idx) => renderTimelineRow(item, idx))}
                </div>
              ))}
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    );
  }

  // Flat view
  return (
    <div 
      className="flex-1 flex flex-col min-w-0 overflow-hidden"
      style={{ backgroundColor: tokens.surface.card }}
    >
      <ScrollArea className="flex-1 w-full">
        <div style={{ minWidth: `${totalMinWidth}px` }}>
          <RoadmapTimelineHeader periods={periods} zoom={config.zoom} />
          
          <div className="relative">
            {/* Gridlines */}
            {renderGridlines()}
            
            {/* Today marker */}
            {config.showToday && <RoadmapTodayMarker position={todayPosition} />}

            {/* Timeline rows */}
            {items.map((item, index) => renderTimelineRow(item, index))}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
