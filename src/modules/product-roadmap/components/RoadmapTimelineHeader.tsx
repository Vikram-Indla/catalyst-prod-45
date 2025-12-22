/**
 * Timeline header showing periods (months/quarters/years)
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { TimelinePeriod, TimelineZoom } from '../types/roadmap';

interface RoadmapTimelineHeaderProps {
  periods: TimelinePeriod[];
  zoom: TimelineZoom;
}

export function RoadmapTimelineHeader({ periods, zoom }: RoadmapTimelineHeaderProps) {
  return (
    <div className="flex border-b border-border bg-muted/30 sticky top-0 z-10">
      {periods.map((period, index) => (
        <div
          key={period.key}
          className={cn(
            'flex-1 min-w-0 px-2 py-2 border-r border-border last:border-r-0',
            period.isCurrent && 'bg-primary/5'
          )}
        >
          <div className="text-xs font-medium text-foreground truncate">
            {period.label}
          </div>
          {period.sublabel && (
            <div className="text-[10px] text-muted-foreground truncate">
              {period.sublabel}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
