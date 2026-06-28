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
    <div className="flex sticky top-0 z-10" style={{ background: 'var(--ds-surface-sunken)', borderBottom: '1px solid var(--bd-default, var(--cp-border, var(--cp-bg-sunken)))', height: 44 }}>
      {periods.map((period, index) => {
        const isQuarterStart = zoom === 'month' && [0, 3, 6, 9].includes(new Date(period.startDate).getMonth());
        return (
          <div
            key={period.key}
            className="flex-shrink-0 flex flex-col justify-center px-3"
            style={{
              minWidth: periodMinWidth,
              width: `${100 / periods.length}%`,
              background: period.isCurrent ? 'var(--ds-background-information, rgba(37,99,235,0.06))' : index % 2 === 0 ? 'var(--ds-surface-sunken)' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
              borderRight: `1px solid ${isQuarterStart ? 'var(--bd-default, var(--cp-border, var(--cp-bg-sunken)))' : 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))'}`,
            }}
          >
            <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: period.isCurrent ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))' }}>
              {period.label}
            </div>
            {period.sublabel && (
              <div style={{ fontSize: 'var(--ds-font-size-50)', color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }}>{period.sublabel}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
