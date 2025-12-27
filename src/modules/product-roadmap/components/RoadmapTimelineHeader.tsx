/**
 * Timeline header showing periods (months/quarters/years)
 * Clean white/dark styling with proper Catalyst colors
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { TimelinePeriod, TimelineZoom } from '../types/roadmap';
import { useRoadmapTheme } from '../lib/useRoadmapTheme';

interface RoadmapTimelineHeaderProps {
  periods: TimelinePeriod[];
  zoom: TimelineZoom;
}

export function RoadmapTimelineHeader({ periods, zoom }: RoadmapTimelineHeaderProps) {
  const { tokens, isDark } = useRoadmapTheme();
  
  // Calculate min-width based on zoom level
  const periodMinWidth = zoom === 'month' ? 120 : zoom === 'quarter' ? 200 : 280;

  return (
    <div 
      className="flex sticky top-0 z-10"
      style={{
        backgroundColor: tokens.surface.card,
        borderBottom: `1px solid ${tokens.border.default}`,
      }}
    >
      {periods.map((period, index) => (
        <div
          key={period.key}
          className="flex-shrink-0 px-4 h-[52px] flex flex-col justify-center"
          style={{
            minWidth: `${periodMinWidth}px`,
            width: `${100 / periods.length}%`,
            backgroundColor: period.isCurrent 
              ? (isDark ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.08)')
              : index % 2 === 0 
                ? tokens.surface.bg 
                : tokens.surface.card,
            borderRight: index < periods.length - 1 
              ? `1px solid ${tokens.border.default}` 
              : 'none',
          }}
        >
          <div 
            className="text-sm font-semibold truncate"
            style={{ color: tokens.text.primary }}
          >
            {period.label}
          </div>
          {period.sublabel && (
            <div 
              className="text-xs truncate"
              style={{ color: tokens.text.muted }}
            >
              {period.sublabel}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
