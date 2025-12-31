/**
 * Roadmap Minimap - Bottom-right minimap
 */

import React, { useMemo } from 'react';
import type { RoadmapGroup, TimelineConfig } from '@/types/roadmap';
import { STATUS_COLORS } from '@/types/roadmap';
import { dateToPosition } from '@/lib/roadmap-utils';

interface RoadmapMinimapProps {
  groups: RoadmapGroup[];
  timelineConfig: TimelineConfig;
  todayPosition: number;
}

export function RoadmapMinimap({
  groups,
  timelineConfig,
  todayPosition,
}: RoadmapMinimapProps) {
  const bars = useMemo(() => {
    const allBars: { left: number; width: number; top: number; status: string }[] = [];
    let row = 0;
    
    groups.forEach((group) => {
      group.objs.forEach((obj) => {
        const left = dateToPosition(obj.start, timelineConfig);
        const right = dateToPosition(obj.end, timelineConfig);
        allBars.push({
          left,
          width: right - left,
          top: row * 4,
          status: obj.status,
        });
        row++;
      });
    });
    
    return allBars;
  }, [groups, timelineConfig]);

  const maxRows = Math.min(bars.length, 12);
  const heightScale = maxRows > 0 ? 48 / (maxRows * 4) : 1;

  return (
    <div className="absolute bottom-4 right-4 w-40 h-14 bg-surface-0 border border-border rounded-lg shadow-lg overflow-hidden z-50">
      {/* Bars */}
      <div className="absolute inset-1">
        {bars.slice(0, 12).map((bar, i) => (
          <div
            key={i}
            className="absolute h-0.5 rounded-sm"
            style={{
              left: `${bar.left}%`,
              width: `${Math.max(bar.width, 2)}%`,
              top: bar.top * heightScale,
              backgroundColor: STATUS_COLORS[bar.status as keyof typeof STATUS_COLORS] || '#737373',
            }}
          />
        ))}
      </div>

      {/* Today line */}
      <div 
        className="absolute top-0 bottom-0 w-px bg-brand-primary opacity-40"
        style={{ left: `${todayPosition}%` }}
      />

      {/* Viewport indicator */}
      <div 
        className="absolute bg-brand-primary/10 border border-brand-primary rounded-sm cursor-move"
        style={{
          left: '20%',
          width: '30%',
          top: '10%',
          bottom: '10%',
        }}
      />
    </div>
  );
}
