/**
 * Product Roadmap — Main page container
 * Polish: scrollbar CSS injection, fullscreen, search auto-focus
 */
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Download, Maximize2, Minimize2, AlertCircle, RefreshCw, Plus } from 'lucide-react';
import { addMonths, subMonths } from 'date-fns';
import { useCatalystContext } from '@/contexts/CatalystContext';

import { RoadmapKPIStrip } from './RoadmapKPIStrip';
import { RoadmapToolbar } from './RoadmapToolbar';
import { RoadmapFilters } from './RoadmapFilters';
import { RoadmapTimeline } from './RoadmapTimeline';
import { RoadmapDetailPanel } from './RoadmapDetailPanel';
import { AddInitiativeModal } from './AddInitiativeModal';

import { useRoadmapData } from './hooks/useRoadmapData';
import { useRoadmapFilters } from './hooks/useRoadmapFilters';

import { INK, SURFACE, FONT, SCROLLBAR_CSS } from './constants/roadmap.constants';

export function ProductRoadmapPage() {
  const { initiatives, stats, isLoading, error } = useRoadmapData();
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
  const { sidebarExpanded, setSidebarExpanded } = useCatalystContext();
  const [prevSidebar, setPrevSidebar] = useState(true);
  const [timelineStart, setTimelineStart] = useState(() => new Date(2026, 0, 1));
  const [timelineEnd, setTimelineEnd] = useState(() => new Date(2026, 11, 31));

  const selectedItem = useMemo(() => filtered.find(i => i.id === selectedId) || null, [filtered, selectedId]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setIsDetailOpen(true);
  }, []);

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
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${SURFACE.border}`, background: SURFACE.card }}>
          <div>
            <div className="h-6 w-48 rounded animate-pulse" style={{ background: SURFACE.borderLight }} />
            <div className="h-4 w-64 rounded mt-2 animate-pulse" style={{ background: SURFACE.borderLight }} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 px-6 py-3" style={{ background: SURFACE.page }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 rounded-lg animate-pulse" style={{ background: SURFACE.borderLight }} />
          ))}
        </div>
        <div className="flex-1 px-6 py-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-11 mb-1 rounded animate-pulse" style={{ background: SURFACE.borderLight }} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-full" style={{ fontFamily: FONT.body }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${SURFACE.border}`, background: SURFACE.card }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: INK[1], margin: 0 }}>Product Roadmap</h1>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <AlertCircle size={18} style={{ color: '#EF4444' }} />
            <span style={{ fontSize: 14, color: '#991B1B', fontWeight: 500 }}>
              Failed to load roadmap data: {(error as Error).message}
            </span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            style={{ border: `1px solid ${SURFACE.border}`, color: INK[2], transition: 'background-color 0.15s ease' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = SURFACE.page)}
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
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${SURFACE.border}`, background: SURFACE.card }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: INK[1], margin: 0, lineHeight: 1.3 }}>Product Roadmap</h1>
            <p style={{ fontSize: 13, fontWeight: 500, color: INK[3], margin: 0 }}>Initiative timeline & delivery planning</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              style={{ border: `1px solid ${SURFACE.border}`, borderRadius: 6, color: INK[2], transition: 'background-color 0.15s ease' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = SURFACE.page)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Download className="w-4 h-4" /> Export
            </button>
            <button
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              style={{ border: `1px solid ${SURFACE.border}`, borderRadius: 6, color: INK[2], transition: 'background-color 0.15s ease' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = SURFACE.page)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Maximize2 className="w-4 h-4" /> Fullscreen
            </button>
          </div>
        </div>
      )}

      {isFullscreen && (
        <div className="flex items-center justify-between px-4 py-1.5" style={{ background: SURFACE.page, borderBottom: `1px solid ${SURFACE.border}` }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: INK[1] }}>Product Roadmap</span>
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            style={{ border: `1px solid ${SURFACE.border}`, color: INK[2], transition: 'background-color 0.15s ease' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = SURFACE.borderLight)}
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
          <div style={{ fontSize: 16, fontWeight: 600, color: INK[2] }}>No initiatives on the roadmap yet</div>
          <p style={{ fontSize: 13, fontWeight: 500, color: INK[3], maxWidth: 360, textAlign: 'center' }}>
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
            timelineStart={timelineStart}
            timelineEnd={timelineEnd}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={handleSelect}
            onHover={setHoveredId}
            onAddClick={() => setIsAddModalOpen(true)}
          />
        </>
      )}

      <RoadmapDetailPanel item={selectedItem} isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} />
      <AddInitiativeModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
}

export default ProductRoadmapPage;
