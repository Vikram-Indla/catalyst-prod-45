// =====================================================
// TIMELINE SHELL — Layout orchestrator
// =====================================================

import React, { useRef } from 'react';
import { TimelineToolbar } from './TimelineToolbar';
import { TimelineFilterBar } from './TimelineFilterBar';
import { TimelineLeftPanel } from './TimelineLeftPanel';
import { TimelineGrid } from './TimelineGrid';
import { useTimelineState } from '@/hooks/producthub/useTimelineState';
import { useTimelineInitiatives, useFilteredInitiatives } from '@/hooks/producthub/useTimelineInitiatives';
import { DENSITY_MAP } from '@/types/producthub/initiative';

export const TimelineShell: React.FC = () => {
  const { activeFilter, searchTerm, groupBy, density } = useTimelineState();
  const { data: initiatives, isLoading, error } = useTimelineInitiatives();
  const { flat, groups } = useFilteredInitiatives(initiatives, activeFilter, searchTerm, groupBy);
  const leftScrollRef = useRef<HTMLDivElement>(null);

  if (error) {
    return (
      <div className="flex-1 flex flex-col">
        <TimelineToolbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[14px] font-medium text-destructive mb-2">Failed to load initiatives</p>
            <p className="text-[13px] text-muted-foreground mb-4">{error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-[13px] font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TimelineToolbar />
      <TimelineFilterBar />

      {/* Main body: left panel + timeline grid */}
      <div className="flex-1 flex min-h-0">
        {/* Left panel — hidden on mobile */}
        <div className="hidden md:flex">
          <TimelineLeftPanel
            initiatives={flat}
            groups={groups}
            totalCount={flat.length}
            isLoading={isLoading}
            scrollRef={leftScrollRef}
          />
        </div>

        {/* Timeline grid */}
        <TimelineGrid
          initiatives={flat}
          groups={groups}
          isLoading={isLoading}
          leftScrollRef={leftScrollRef}
        />
      </div>
    </div>
  );
};

export default TimelineShell;
