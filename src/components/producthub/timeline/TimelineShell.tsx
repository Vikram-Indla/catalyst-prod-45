// =====================================================
// TIMELINE SHELL — Layout orchestrator
// =====================================================

import React, { useRef } from 'react';
import { TimelineToolbar } from './TimelineToolbar';
import { TimelineFilterBar } from './TimelineFilterBar';
import { TimelineLeftPanel } from './TimelineLeftPanel';
import { useTimelineState } from '@/hooks/producthub/useTimelineState';
import { useTimelineInitiatives, useFilteredInitiatives } from '@/hooks/producthub/useTimelineInitiatives';
import { DENSITY_MAP } from '@/types/producthub/initiative';

export const TimelineShell: React.FC = () => {
  const { activeFilter, searchTerm, groupBy, density } = useTimelineState();
  const { data: initiatives, isLoading, error } = useTimelineInitiatives();
  const { flat, groups } = useFilteredInitiatives(initiatives, activeFilter, searchTerm, groupBy);
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rowHeight = DENSITY_MAP[density].row;

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

      {/* Main body: left panel + timeline grid placeholder */}
      <div className="flex-1 flex min-h-0">
        {/* Left panel — hidden on mobile */}
        <div className="hidden md:block">
          <TimelineLeftPanel
            initiatives={flat}
            groups={groups}
            totalCount={flat.length}
            isLoading={isLoading}
            scrollRef={leftScrollRef}
          />
        </div>

        {/* Timeline grid placeholder (Prompt 2) */}
        <div className="flex-1 bg-muted/30 flex items-center justify-center min-h-0 overflow-hidden">
          <div className="text-center px-6">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
                <path d="M3 6h13M3 12h18M3 18h10" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-[14px] font-semibold text-foreground mb-1">Timeline Grid</p>
            <p className="text-[12px] text-muted-foreground">
              Gantt chart visualization — coming in Phase 2
            </p>
            {!isLoading && flat.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {flat.length} initiative{flat.length !== 1 ? 's' : ''} ready to render
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineShell;
