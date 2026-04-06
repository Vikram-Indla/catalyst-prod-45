/**
 * Timeline header — Month/Quarter columns with year label
 */

import React from 'react';
import type { TimelinePeriod, TimelineZoom } from '../types/roadmap';

interface RoadmapTimelineHeaderProps {
  periods: TimelinePeriod[];
  zoom: TimelineZoom;
}

export function RoadmapTimelineHeader({ periods, zoom }: RoadmapTimelineHeaderProps) {
  const periodMinWidth = zoom === 'month' ? 120 : zoom === 'quarter' ? 200 : 280;

  return (
    <div className="flex sticky top-0 z-10" style={{ background: '#FAFBFC', borderBottom: '1px solid var(--bd-default, #E2E8F0)', height: 44 }}>
      {periods.map((period, index) => {
        const isQuarterStart = zoom === 'month' && [0, 3, 6, 9].includes(new Date(period.startDate).getMonth());
        return (
          <div
            key={period.key}
            className="flex-shrink-0 flex flex-col justify-center px-3"
            style={{
              minWidth: periodMinWidth,
              width: `${100 / periods.length}%`,
              background: period.isCurrent ? 'rgba(37,99,235,0.06)' : index % 2 === 0 ? '#FAFBFC' : '#FFFFFF',
              borderRight: `1px solid ${isQuarterStart ? 'var(--bd-default, #E2E8F0)' : '#F1F5F9'}`,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: period.isCurrent ? '#2563EB' : '#334155' }}>
              {period.label}
            </div>
            {period.sublabel && (
              <div style={{ fontSize: 10, color: '#94A3B8' }}>{period.sublabel}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
