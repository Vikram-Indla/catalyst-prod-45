/**
 * Today marker — red vertical line with "Today" label
 */

import React from 'react';

interface RoadmapTodayMarkerProps {
  position: number;
}

export function RoadmapTodayMarker({ position }: RoadmapTodayMarkerProps) {
  if (position < 0 || position > 100) return null;

  return (
    <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: `${position}%` }}>
      <div className="absolute -top-0.5 -translate-x-1/2 px-1.5 py-0.5 rounded" style={{ background: 'var(--ds-text-danger, var(--ds-text-danger, #EF4444))', fontSize: 9, fontWeight: 700, color: 'var(--ds-surface, var(--ds-surface, #FFFFFF))', whiteSpace: 'nowrap' }}>
        Today
      </div>
      <div style={{ width: 2, height: '100%', background: 'linear-gradient(180deg, var(--ds-text-danger, #EF4444), transparent)' }} />
    </div>
  );
}
