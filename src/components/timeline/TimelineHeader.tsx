// =====================================================
// TIMELINE HEADER COMPONENT
// Month/Week headers for timeline grid
// =====================================================

import React from 'react';
import { generateDateHeaders } from '@/services/timelineService';

interface TimelineHeaderProps {
  startDate: Date;
  endDate: Date;
  zoom: 'week' | 'month' | 'quarter';
}

export function TimelineHeader({ startDate, endDate, zoom }: TimelineHeaderProps) {
  const headers = generateDateHeaders(startDate, endDate, zoom);

  return (
    <div className="flex border-b bg-white sticky top-0 z-15">
      {headers.map((header, index) => (
        <div
          key={index}
          className="border-r bg-gray-50 flex-shrink-0"
          style={{ width: `${header.width}px` }}
        >
          {/* Month/Quarter Label */}
          <div className="py-2 text-center font-semibold text-sm border-b bg-gray-50">
            {header.label}
          </div>
          
          {/* Sub Labels (Weeks/Days) */}
          <div className="flex">
            {header.subLabels.map((subLabel, subIndex) => (
              <div
                key={subIndex}
                className="flex-1 text-center py-1 text-[10px] text-gray-500 border-r last:border-r-0"
              >
                {subLabel}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
