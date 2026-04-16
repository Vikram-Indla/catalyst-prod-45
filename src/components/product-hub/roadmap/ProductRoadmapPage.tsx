/**
 * Product Roadmap — Main page container
 * Polish: scrollbar CSS injection, fullscreen, search auto-focus
 */
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Download, Maximize2, Minimize2, AlertCircle, RefreshCw, Plus } from 'lucide-react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { addMonths, subMonths } from 'date-fns';
import { useCatalystContext } from '@/contexts/CatalystContext';
import { useTheme } from '@/hooks/useTheme';

import { RoadmapKPIStrip } from './RoadmapKPIStrip';
import { RoadmapToolbar } from './RoadmapToolbar';
import { RoadmapFilters } from './RoadmapFilters';
import { RoadmapTimeline } from './RoadmapTimeline';
import { InitiativeDetailPanel } from '@/components/producthub/timeline/InitiativeDetailPanel';
import type { TimelineInitiative } from '@/types/producthub/initiative';

import { AddInitiativeModal } from './AddInitiativeModal';

import { useRoadmapData, useToggleRoadmapStar } from './hooks/useRoadmapData';
import { useRoadmapFilters } from './hooks/useRoadmapFilters';

import { INK, INK_DARK, SURFACE, SURFACE_DARK, FONT, SCROLLBAR_CSS } from './constants/roadmap.constants';
import '@/styles/roadmap-ringfenced.css';
import '@/styles/product-kanban.css';

export function ProductRoadmapPage() {
  const { isDark } = useTheme();
  const ink = isDark ? INK_DARK : INK;
  const surface = isDark ? SURFACE_DARK : SURFACE;
  const { initiatives, stats, isLoading, error } = useRoadmapData();
  const toggleStar = useToggleRoadmapStar();
  const {
    search, setSearch,
    typeFilter, setTypeFilter,
    quickFilter, setQuickFilter,
    groupBy, setGroupBy,
    zoom, setZoom,
    viewMode, setViewMode,
    hoveredId, setHoveredId,
    filtered,
    groups,
  } = useRoadmapFilters(initiatives);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const { sidebarExpanded, setSidebarExpanded } = useCatalystContext();
  const [prevSidebar, setPrevSidebar] = useState(true);
  const [timelineStart, setTimelineStart] = useState(() => new Date(2026, 0, 1));
  const [timelineEnd, setTimelineEnd] = useState(() => new Date(2026, 11, 31));

  const selectedItem = useMemo(() => filtered.find(i => i.id === selectedId) || null, [filtered, selectedId]);

  // Convert RoadmapInitiative → TimelineInitiative for the backlog detail panel
  const selectedAsTimeline = useMemo((): TimelineInitiative | null => {
    if (!selectedItem) return null;
    const statusReverseMap: Record<string, TimelineInitiative['status']> = {
      Active: 'under_implementation',
      Planned: 'new',
      Completed: 'done',
      Cancelled: 'cancelled',
    };
    return {
      id: selectedItem.rawDbId,
      initiative_key: selectedItem.initiativeKey,
      title: selectedItem.titleEn || selectedItem.title,
      description: null,
      status: statusReverseMap[selectedItem.status] || 'new',
      assignee_id: selectedItem.rawAssigneeId,
      assignee_name: selectedItem.ownerName === 'Unassigned' ? null : selectedItem.ownerName,
      business_owner_id: selectedItem.rawBusinessOwnerId,
      reporter_id: null,
      reporter_name: null,
      department_id: null,
      department_name: null,
      department_code: null,
      target_quarter: null,
      business_ask_date: null,
      kickoff_date: selectedItem.startDate,
      target_complete: selectedItem.endDate,
      progress: selectedItem.progress,
      sort_order: 0,
      risk_count: 0,
      is_archived: false,
      score_strategic_alignment: null,
      score_business_impact: null,
      score_time_urgency: null,
      score_resource_feasibility: null,
      computed_score: null,
      created_at: '',
      updated_at: '',
      initiative_type_key: selectedItem.rawTypeKey || null,
      initiative_type_label: null,
      initiative_type_color_hex: null,
      health_status: null,
      business_value: null,
      on_roadmap: true,
    };
  }, [selectedItem]);

  const allAsTimeline = useMemo((): TimelineInitiative[] => {
    if (!selectedAsTimeline) return [];
    return [selectedAsTimeline];
  }, [selectedAsTimeline]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setIsDetailOpen(true);
  }, []);

  const handleToggleStar = useCallback((id: string, isCurrentlyStarred: boolean) => {
    toggleStar.mutate({ initiativeId: id, isCurrentlyStarred });
  }, [toggleStar]);

  const handleToday = useCallback(() => {
    const now = new Date();
    setTimelineStart(subMonths(now, 2));
    setTimelineEnd(addMonths(now, 10));
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => {
      if (!prev) { setPrevSidebar(sidebarExpanded); setSidebarExpanded(false); }
      else { setSidebarExpanded(prevSidebar); }
      return !prev;
    });
  }, [sidebarExpanded, setSidebarExpanded, prevSidebar]);

  // Escape exits fullscreen, closes detail panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDetailOpen) { setIsDetailOpen(false); return; }
        if (isFullscreen) { setIsFullscreen(false); setSidebarExpanded(prevSidebar); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen, isDetailOpen, setSidebarExpanded, prevSidebar]);

  // Inject scrollbar CSS
  useEffect(() => {
    const id = 'roadmap-scrollbar-css';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = SCROLLBAR_CSS;
    document.head.appendChild(style);
  }, []);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex flex-col h-full" style={{ fontFamily: FONT.body }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${surface.border}`, background: surface.card }}>
          <div>
            <div className="h-6 w-48 rounded animate-pulse" style={{ background: surface.borderLight }} />
            <div className="h-4 w-64 rounded mt-2 animate-pulse" style={{ background: surface.borderLight }} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 px-6 py-3" style={{ background: surface.page }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 rounded-lg animate-pulse" style={{ background: surface.borderLight }} />
          ))}
        </div>
        <div className="flex-1 px-6 py-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-11 mb-1 rounded animate-pulse" style={{ background: surface.borderLight }} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-full" style={{ fontFamily: FONT.body }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${surface.border}`, background: surface.card }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: ink[1], margin: 0 }}>Product Roadmap</h1>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg" style={{ background: isDark ? 'rgba(220,38,38,0.12)' : '#FEF2F2', border: `1px solid ${isDark ? 'rgba(220,38,38,0.25)' : '#FECACA'}` }}>
            <AlertCircle size={18} style={{ color: '#EF4444' }} />
            <span style={{ fontSize: 14, color: isDark ? '#FCA5A5' : '#991B1B', fontWeight: 500 }}>
              Failed to load roadmap data: {(error as Error).message}
            </span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            style={{ border: `1px solid ${surface.border}`, color: ink[2], transition: 'background-color 0.15s ease' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = isDark ? '#292929' : surface.page)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const isEmpty = initiatives.length === 0;

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: FONT.body }}>
      {/* Page Header */}
      {!isFullscreen && (
        <ProductHubPageHeader
          title="Product Roadmap"
          subtitle="Initiative timeline & delivery planning"
          actions={
            <>
              <button
                className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                style={{ border: `1px solid ${surface.border}`, borderRadius: 6, color: ink[2], transition: 'background-color 0.15s ease', fontFamily: "'Inter', system-ui, sans-serif" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = isDark ? '#292929' : surface.page)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Download className="w-4 h-4" /> Export
              </button>
              <button
                onClick={toggleFullscreen}
                className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                style={{ border: `1px solid ${surface.border}`, borderRadius: 6, color: ink[2], transition: 'background-color 0.15s ease', fontFamily: "'Inter', system-ui, sans-serif" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = isDark ? '#292929' : surface.page)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Maximize2 className="w-4 h-4" /> Fullscreen
              </button>
            </>
          }
        />
      )}

      {isFullscreen && (
        <div className="flex items-center justify-between px-4 py-1.5" style={{ background: surface.page, borderBottom: `1px solid ${surface.border}` }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: ink[1] }}>Product Roadmap</span>
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            style={{ border: `1px solid ${surface.border}`, color: ink[2], transition: 'background-color 0.15s ease' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = isDark ? '#292929' : surface.borderLight)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Minimize2 className="w-3.5 h-3.5" /> Exit
          </button>
        </div>
      )}

      {!isFullscreen && <RoadmapKPIStrip stats={stats} />}

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          <div style={{ fontSize: 48 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: ink[2] }}>No initiatives on the roadmap yet</div>
          <p style={{ fontSize: 13, fontWeight: 500, color: ink[3], maxWidth: 360, textAlign: 'center' }}>
            Add your first initiative from the product backlog to get started.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-10 px-5 text-sm font-medium rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            style={{ background: '#2563EB', color: '#FFFFFF', transition: 'opacity 0.15s ease' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <Plus className="w-4 h-4" /> Add Initiative
          </button>
        </div>
      ) : (
        <>
          {!isFullscreen && (
            <>
              <RoadmapToolbar
                zoom={zoom}
                onZoomChange={setZoom}
                groupBy={groupBy}
                onGroupByChange={setGroupBy}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onToday={handleToday}
                zoomScale={zoomScale}
                onZoomScaleChange={setZoomScale}
              />

              <RoadmapFilters
                search={search}
                onSearchChange={setSearch}
                quickFilter={quickFilter}
                onQuickFilterChange={setQuickFilter}
                typeFilter={typeFilter}
                onTypeFilterChange={setTypeFilter}
              />
            </>
          )}

          <RoadmapTimeline
            groups={groups}
            zoom={zoom}
            zoomScale={zoomScale}
            timelineStart={timelineStart}
            timelineEnd={timelineEnd}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={handleSelect}
            onHover={setHoveredId}
            onAddClick={() => setIsAddModalOpen(true)}
            onToggleStar={handleToggleStar}
          />
        </>
      )}

      {isDetailOpen && selectedAsTimeline && (
        <InitiativeDetailPanel
          initiative={selectedAsTimeline}
          initiatives={allAsTimeline}
          onClose={() => setIsDetailOpen(false)}
        />
      )}
      <AddInitiativeModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
}

export default ProductRoadmapPage;
