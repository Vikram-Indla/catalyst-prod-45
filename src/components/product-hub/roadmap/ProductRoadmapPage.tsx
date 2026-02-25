/**
 * Product Roadmap — Main page container
 * Assembles: Header, KPI Strip, Toolbar, Filters, Timeline, DetailPanel, AddModal
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Download, Maximize2, Minimize2 } from 'lucide-react';
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

import type { ZoomLevel } from './types/roadmap.types';
import { INK, SURFACE, FONT } from './constants/roadmap.constants';

export function ProductRoadmapPage() {
  const { initiatives, stats, isLoading } = useRoadmapData();
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

  // Selection & panels
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { sidebarExpanded, setSidebarExpanded } = useCatalystContext();
  const [prevSidebar, setPrevSidebar] = useState(true);

  // Timeline range
  const [timelineStart, setTimelineStart] = useState(() => new Date(2025, 10, 1)); // Nov 2025
  const [timelineEnd, setTimelineEnd] = useState(() => new Date(2027, 0, 31));     // Jan 2027

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

  // ESC exits fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setIsFullscreen(false); setSidebarExpanded(prevSidebar); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen, setSidebarExpanded, prevSidebar]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-sm" style={{ color: INK[3] }}>Loading roadmap...</div>;
  }

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: FONT.body }}>
      {/* ── Page Header ── */}
      {!isFullscreen && (
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${SURFACE.border}`, background: SURFACE.card }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: INK[1], margin: 0, lineHeight: 1.3 }}>Product Roadmap</h1>
            <p style={{ fontSize: 13, color: INK[3], margin: 0 }}>Initiative timeline & delivery planning</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium transition-colors hover:bg-gray-50" style={{ border: `1px solid ${SURFACE.border}`, borderRadius: 6, color: INK[2] }}>
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={toggleFullscreen} className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium transition-colors hover:bg-gray-50" style={{ border: `1px solid ${SURFACE.border}`, borderRadius: 6, color: INK[2] }}>
              <Maximize2 className="w-4 h-4" /> Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen exit bar */}
      {isFullscreen && (
        <div className="flex items-center justify-between px-4 py-1.5" style={{ background: SURFACE.page, borderBottom: `1px solid ${SURFACE.border}` }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: INK[1] }}>Product Roadmap</span>
          <button onClick={toggleFullscreen} className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-md hover:bg-gray-100" style={{ border: `1px solid ${SURFACE.border}`, color: INK[2] }}>
            <Minimize2 className="w-3.5 h-3.5" /> Exit
          </button>
        </div>
      )}

      {/* ── KPI Strip ── */}
      {!isFullscreen && <RoadmapKPIStrip stats={stats} />}

      {/* ── Toolbar ── */}
      <RoadmapToolbar
        zoom={zoom}
        onZoomChange={setZoom}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onToday={handleToday}
      />

      {/* ── Filters ── */}
      <RoadmapFilters
        search={search}
        onSearchChange={setSearch}
        quickFilter={quickFilter}
        onQuickFilterChange={setQuickFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
      />

      {/* ── Timeline Body ── */}
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

      {/* ── Panels ── */}
      <RoadmapDetailPanel item={selectedItem} isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} />
      <AddInitiativeModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
}

export default ProductRoadmapPage;
