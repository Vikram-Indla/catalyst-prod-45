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
import { useFilteredInitiatives } from '@/hooks/producthub/useTimelineInitiatives';
import { useTimelineRealtime } from '@/hooks/producthub/useTimelineRealtime';
import { useMDTBacklog } from '@/hooks/useMDTBacklog';
import type { TimelineInitiative } from '@/types/producthub/initiative';

/** Convert MDTInitiative → TimelineInitiative */
function toTimeline(i: any): TimelineInitiative {
  return {
    id: i.id,
    initiative_key: i.initiative_key,
    title: i.title,
    description: i.description,
    status: i.status,
    assignee_id: i.assignee_id,
    assignee_name: i.assignee_name,
    business_owner_id: i.business_owner_id,
    reporter_id: i.reporter_id,
    department_id: i.department_id,
    department_name: i.department_name,
    department_code: null,
    target_quarter: i.target_quarter,
    business_ask_date: i.business_ask_date,
    kickoff_date: i.kickoff_date,
    target_complete: i.target_complete,
    progress: i.progress,
    sort_order: i.sort_order,
    risk_count: i.risk_count,
    is_archived: i.is_archived,
    score_strategic_alignment: i.score_strategic_alignment,
    score_business_impact: i.score_business_impact,
    score_time_urgency: i.score_time_urgency,
    score_resource_feasibility: i.score_resource_feasibility,
    computed_score: i.computed_score,
    created_at: i.created_at,
    updated_at: i.updated_at,
  };
}

export const TimelineShell: React.FC = () => {
  const { activeFilter, searchTerm, groupBy, selectedInitiativeId, isDetailOpen, closeDetail } = useTimelineState();
  const { data: mdtData, isLoading, error } = useMDTBacklog();
  const initiatives = (mdtData?.data ?? []).map(toTimeline);
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
