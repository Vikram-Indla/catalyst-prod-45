// =====================================================
// TIMELINE DATE CURSOR — Mouse-follow vertical line
// =====================================================

import React from 'react';
import { format } from 'date-fns';

interface TimelineDateCursorProps {
  x: number;
  date: Date;
  gridHeight: number;
  visible: boolean;
}

export const TimelineDateCursor: React.FC<TimelineDateCursorProps> = ({ x, date, gridHeight, visible }) => {
  if (!visible) return null;

  return (
    <div
      className="absolute top-0 pointer-events-none"
      style={{ left: x, zIndex: 12, height: gridHeight }}
    >
      {/* Dashed line */}
      <div
        className="absolute inset-y-0 w-0"
        style={{ borderLeft: '1px dashed hsl(var(--muted-foreground) / 0.4)' }}
      />
      {/* Date badge */}
      <div
        className="absolute top-0 -translate-x-1/2 bg-foreground text-background px-1.5 py-0.5 rounded-sm"
        style={{
          fontSize: 10,
          fontWeight: 500,
          fontFamily: 'var(--ds-font-family-monospaced)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
        }}
      >
        {format(date, 'MMM d, yyyy')}
      </div>
    </div>
  );
};

export default TimelineDateCursor;
