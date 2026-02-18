// =====================================================
// TIMELINE TODAY LINE — Red dashed vertical line
// =====================================================

import React from 'react';
import { dateToX } from './timelineUtils';
import type { Granularity } from '@/types/producthub/initiative';

interface TimelineTodayLineProps {
  granularity: Granularity;
  gridHeight: number;
}

export const TimelineTodayLine: React.FC<TimelineTodayLineProps> = ({ granularity, gridHeight }) => {
  const x = dateToX(new Date(), granularity);

  return (
    <div
      className="absolute top-0 pointer-events-none"
      style={{ left: x, zIndex: 15, height: gridHeight }}
    >
      {/* Dashed line */}
      <div
        className="absolute inset-y-0 w-0"
        style={{
          borderLeft: '1.5px dashed #EF4444',
        }}
      />
      {/* Today badge */}
      <div
        className="absolute -top-0.5 -translate-x-1/2 bg-destructive text-white px-1.5 py-0.5 rounded-sm"
        style={{
          fontSize: 10,
          fontWeight: 600,
          lineHeight: 1.2,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        Today
      </div>
    </div>
  );
};

export default TimelineTodayLine;
