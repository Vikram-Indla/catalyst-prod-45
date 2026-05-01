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
    <div className="flex sticky top-0 z-10" style={{ background: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #FAFBFC))', borderBottom: '1px solid var(--bd-default, #E2E8F0)', height: 44 }}>
      {periods.map((period, index) => {
        const isQuarterStart = zoom === 'month' && [0, 3, 6, 9].includes(new Date(period.startDate).getMonth());
        return (
          <div
            key={period.key}
            className="flex-shrink-0 flex flex-col justify-center px-3"
            style={{
              minWidth: periodMinWidth,
              width: `${100 / periods.length}%`,
              background: period.isCurrent ? 'rgba(37,99,235,0.06)' : index % 2 === 0 ? 'var(--ds-surface-sunken, var(--ds-surface-sunken, #FAFBFC))' : 'var(--ds-surface, var(--ds-surface, #FFFFFF))',
              borderRight: `1px solid ${isQuarterStart ? 'var(--bd-default, #E2E8F0)' : 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F1F5F9))'}`,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: period.isCurrent ? 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))' : 'var(--ds-text-subtle, var(--ds-text-subtle, #334155))' }}>
              {period.label}
            </div>
            {period.sublabel && (
              <div style={{ fontSize: 10, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))' }}>{period.sublabel}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
