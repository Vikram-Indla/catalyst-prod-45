// =====================================================
// TIMELINE SHELL — Layout orchestrator
// =====================================================

import React, { useRef, useEffect, useCallback } from 'react';
import { TimelineToolbar } from './TimelineToolbar';
import { TimelineFilterBar } from './TimelineFilterBar';
import { TimelineLeftPanel } from './TimelineLeftPanel';
import { TimelineGrid } from './TimelineGrid';
import { InitiativeDetailPanel } from './InitiativeDetailPanel';
import { useTimelineState } from '@/hooks/producthub/useTimelineState';
import { useTimelineInitiatives, useFilteredInitiatives } from '@/hooks/producthub/useTimelineInitiatives';
import { useTimelineRealtime } from '@/hooks/producthub/useTimelineRealtime';

export const TimelineShell: React.FC = () => {
  const { activeFilter, searchTerm, groupBy, selectedInitiativeId, isDetailOpen, closeDetail } = useTimelineState();
  const { data: initiatives, isLoading, error } = useTimelineInitiatives();
  const { flat, groups } = useFilteredInitiatives(initiatives, activeFilter, searchTerm, groupBy);
  const leftScrollRef = useRef<HTMLDivElement>(null);

  // Realtime subscription
  useTimelineRealtime();

  // Keyboard: Cmd+K to focus search, Shift+scroll for horizontal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder="Search initiatives…"]');
        searchInput?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Shift+wheel for horizontal scroll
  useEffect(() => {
    const handler = (e: WheelEvent) => {
      if (!e.shiftKey) return;
      const gridBody = document.querySelector<HTMLElement>('[data-timeline-body]');
      if (gridBody) {
        e.preventDefault();
        gridBody.scrollLeft += e.deltaY;
      }
    };
    document.addEventListener('wheel', handler, { passive: false });
    return () => document.removeEventListener('wheel', handler);
  }, []);

  const selectedInitiative = flat.find(i => i.id === selectedInitiativeId) ?? null;

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

      {/* Detail panel */}
      {isDetailOpen && selectedInitiative && (
        <InitiativeDetailPanel
          initiative={selectedInitiative}
          initiatives={flat}
          onClose={closeDetail}
        />
      )}
    </div>
  );
};

export default TimelineShell;
