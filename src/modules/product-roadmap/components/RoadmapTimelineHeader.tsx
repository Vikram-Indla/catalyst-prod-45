/**
 * Timeline header showing periods (months/quarters/years)
 * Clean white/dark styling with proper Catalyst colors
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { TimelinePeriod, TimelineZoom } from '../types/roadmap';
import { catalystTokens } from '../lib/design-tokens';

interface RoadmapTimelineHeaderProps {
  periods: TimelinePeriod[];
  zoom: TimelineZoom;
}

export function RoadmapTimelineHeader({ periods, zoom }: RoadmapTimelineHeaderProps) {
  // Calculate min-width based on zoom level
  const periodMinWidth = zoom === 'month' ? 120 : zoom === 'quarter' ? 200 : 280;

  return (
    <div 
      className="flex sticky top-0 z-10"
      style={{
        backgroundColor: catalystTokens.light.surface.card,
        borderBottom: `1px solid ${catalystTokens.light.border.default}`,
      }}
    >
      {periods.map((period, index) => (
        <div
          key={period.key}
          className="flex-shrink-0 px-4 py-3"
          style={{
            minWidth: `${periodMinWidth}px`,
            width: `${100 / periods.length}%`,
            backgroundColor: period.isCurrent 
              ? 'rgba(198, 156, 109, 0.08)' 
              : index % 2 === 0 
                ? catalystTokens.light.surface.bg 
                : catalystTokens.light.surface.card,
            borderRight: index < periods.length - 1 
              ? `1px solid ${catalystTokens.light.border.default}` 
              : 'none',
          }}
        >
          <div 
            className="text-sm font-semibold truncate"
            style={{ color: catalystTokens.light.text.primary }}
          >
            {period.label}
          </div>
          {period.sublabel && (
            <div 
              className="text-xs truncate"
              style={{ color: catalystTokens.light.text.muted }}
            >
              {period.sublabel}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
