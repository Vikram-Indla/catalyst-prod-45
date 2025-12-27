/**
 * Today marker line for the timeline - Uses Catalyst blue color
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
          className="w-3 h-3 rotate-45 shadow-sm"
          style={{ 
            backgroundColor: '#2563eb',
            border: '2px solid var(--background)'
          }}
        />
      </div>
      
      {/* Vertical line - Catalyst blue */}
      <div 
        className="w-0.5 h-full"
        style={{ backgroundColor: '#2563eb' }}
      />
      
      {/* Today label */}
      <div 
        className="absolute top-6 -translate-x-1/2 px-2 py-0.5 text-[10px] font-semibold rounded whitespace-nowrap"
        style={{
          backgroundColor: '#2563eb',
          color: '#ffffff'
        }}
      >
        Today
      </div>
    </div>
  );
}
