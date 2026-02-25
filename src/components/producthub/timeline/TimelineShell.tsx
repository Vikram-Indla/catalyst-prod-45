// =====================================================
// TIMELINE SHELL — Layout orchestrator
// Now wired to ph_roadmap_initiatives_view (on_roadmap=true only)
// =====================================================

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { TimelineToolbar } from './TimelineToolbar';
import { TimelineFilterBar } from './TimelineFilterBar';
import { TimelineLeftPanel } from './TimelineLeftPanel';
import { TimelineGrid } from './TimelineGrid';
import { InitiativeDetailPanel } from './InitiativeDetailPanel';
import { useTimelineState } from '@/hooks/producthub/useTimelineState';
import { useFilteredInitiatives } from '@/hooks/producthub/useTimelineInitiatives';
import { useTimelineRealtime } from '@/hooks/producthub/useTimelineRealtime';
import { useRoadmapInitiatives } from '@/hooks/useRoadmapInitiatives';
import { useProfileOptions, useDepartmentOptions } from '@/hooks/useInitiativeLookups';
import type { TimelineInitiative } from '@/types/producthub/initiative';

export const TimelineShell: React.FC = () => {
  const { activeFilter, searchTerm, groupBy, selectedInitiativeId, isDetailOpen, closeDetail } = useTimelineState();
  const { data: roadmapData, isLoading, error } = useRoadmapInitiatives();
  const { data: profiles } = useProfileOptions();
  const { data: departments } = useDepartmentOptions();

  // Resolve IDs to display names
  const getProfileName = useCallback((id: string | null) => {
    if (!id || !profiles) return null;
    const profile = profiles.find(p => p.value === id);
    return profile?.label || null;
  }, [profiles]);

  const getDepartmentName = useCallback((id: string | null) => {
    if (!id || !departments) return null;
    const dept = departments.find(d => d.value === id);
    return dept?.label || null;
  }, [departments]);

  // Map roadmap view data → TimelineInitiative
  const initiatives: TimelineInitiative[] = useMemo(() => {
    return (roadmapData || []).map((item: any) => ({
      id: item.id,
      initiative_key: item.initiative_key || '',
      title: item.title || '',
      description: item.description || null,
      status: item.status || 'new_demand',
      assignee_id: item.assignee_id || null,
      assignee_name: getProfileName(item.assignee_id),
      business_owner_id: item.business_owner_id || null,
      reporter_id: item.reporter_id || null,
      department_id: item.department_id || null,
      department_name: getDepartmentName(item.department_id),
      department_code: null,
      target_quarter: item.target_quarter || null,
      business_ask_date: item.business_ask_date || null,
      kickoff_date: item.kickoff_date || null,
      target_complete: item.target_complete || null,
      progress: item.progress ?? 0,
      sort_order: item.sort_order ?? 0,
      risk_count: item.risk_count ?? 0,
      is_archived: item.is_archived ?? false,
      score_strategic_alignment: null,
      score_business_impact: null,
      score_time_urgency: null,
      score_resource_feasibility: null,
      computed_score: null,
      created_at: item.created_at || new Date().toISOString(),
      updated_at: item.updated_at || new Date().toISOString(),
    }));
  }, [roadmapData, getProfileName, getDepartmentName]);

  const { flat, groups } = useFilteredInitiatives(initiatives, activeFilter, searchTerm, groupBy);
  const leftScrollRef = useRef<HTMLDivElement>(null);

  // Realtime subscription
  useTimelineRealtime();

  // Keyboard: Cmd+K to focus search
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
            <p className="text-[13px] text-muted-foreground mb-4">{(error as Error).message}</p>
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
