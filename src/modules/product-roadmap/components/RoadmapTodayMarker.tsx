/**
 * Today marker line for the timeline
 */

import React from 'react';

interface RoadmapTodayMarkerProps {
  position: number; // percentage from left
}

export function RoadmapTodayMarker({ position }: RoadmapTodayMarkerProps) {
  if (position < 0 || position > 100) return null;

  return (
    <div 
      className="absolute top-0 bottom-0 z-20 pointer-events-none"
      style={{ left: `${position}%` }}
    >
      {/* Diamond indicator at top */}
      <div className="absolute -top-1 -translate-x-1/2">
        <div 
          className="w-3 h-3 rotate-45 bg-destructive border-2 border-background shadow-sm"
        />
      </div>
      
      {/* Vertical line */}
      <div className="w-[2px] h-full bg-destructive/70" />
      
      {/* Today label */}
      <div className="absolute top-6 -translate-x-1/2 px-1.5 py-0.5 bg-destructive text-destructive-foreground text-[10px] font-medium rounded whitespace-nowrap">
        Today
      </div>
    </div>
  );
}
