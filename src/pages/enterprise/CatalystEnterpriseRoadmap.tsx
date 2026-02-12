/**
 * Catalyst Enterprise Roadmap Page
 */

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';
import { CommandCenterHeader } from '@/components/shared/CommandCenterHeader';
import { useRoadmapState } from '@/hooks/useRoadmapState';
import {
  RoadmapHeader,
  RoadmapSummary,
  RoadmapFilterPanel,
  RoadmapObjectivesPanel,
  RoadmapTimeline,
  RoadmapMinimap,
  RoadmapTooltip,
  RoadmapContextMenu,
  RoadmapKeyboardOverlay,
  RoadmapLegend,
} from '@/components/catalyst-roadmap';

export default function CatalystEnterpriseRoadmap() {
  const {
    data,
    state,
    actions,
    computed,
    contextMenu,
    tooltip,
    timelineRef,
  } = useRoadmapState();

  // Mobile panel state
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  // Viewport state for minimap
  const [viewport, setViewport] = useState({ scrollLeft: 0, scrollWidth: 1, clientWidth: 1 });

  // Update viewport on scroll
  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;

    const handleScroll = () => {
      setViewport({
        scrollLeft: timeline.scrollLeft,
        scrollWidth: timeline.scrollWidth,
        clientWidth: timeline.clientWidth,
      });
    };

    // Initial measurement
    handleScroll();

    timeline.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      timeline.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [timelineRef]);

  // Close mobile panel on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobilePanelOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle minimap viewport drag
  const handleViewportDrag = useCallback((scrollPercent: number) => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    
    const scrollLeft = (scrollPercent / 100) * timeline.scrollWidth;
    timeline.scrollLeft = scrollLeft;
  }, [timelineRef]);

  // Get the objective for tooltip
  const tooltipObjective = useMemo(() => {
    if (!tooltip) return null;
    return data.themes.flatMap(t => t.objs).find(o => o.id === tooltip.id) || null;
  }, [tooltip, data.themes]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const isMeta = e.metaKey || e.ctrlKey;

      if (isMeta && e.key === 'z') {
        e.preventDefault();
        actions.undo();
      } else if (isMeta && e.key === 'y') {
        e.preventDefault();
        actions.redo();
      } else if (e.key === 't' || e.key === 'T') {
        actions.scrollToToday();
      } else if (e.key === 'f' || e.key === 'F') {
        actions.toggleFilter();
      } else if (e.key === 'd' || e.key === 'D') {
        actions.toggleDark();
      } else if (e.key === 'p' || e.key === 'P') {
        actions.togglePresentation();
      } else if (e.key === '?') {
        actions.showHelp();
      } else if (e.key === 'Escape') {
        actions.select(null);
        actions.hideContextMenu();
        actions.hideHelp();
        actions.cancelEdit();
        setIsMobilePanelOpen(false);
      } else if (isMeta && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        actions.zoomIn();
      } else if (isMeta && e.key === '-') {
        e.preventDefault();
        actions.zoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);

  const handleExport = useCallback(async () => {
    // TODO: Implement PDF export
    console.log('Export PDF');
  }, []);

  return (
    <div 
      className={cn(
        "flex flex-col h-full animate-in fade-in duration-500",
        state.dark && "dark",
        state.presentation && "presentation"
      )}
    >
      {/* Command Center Header */}
      {!state.presentation && (
        <CommandCenterHeader
          title="Enterprise Roadmap"
          subtitle="Strategic timeline with objectives & dependencies"
        />
      )}

      {/* Header with toolbar */}
      {!state.presentation && (
        <RoadmapHeader
          slice={state.slice}
          zoom={state.zoom}
          snap={state.snap}
          dark={state.dark}
          presentation={state.presentation}
          canUndo={computed.canUndo}
          canRedo={computed.canRedo}
          activeFiltersCount={computed.activeFiltersCount}
          onSliceChange={actions.setSlice}
          onZoomIn={actions.zoomIn}
          onZoomOut={actions.zoomOut}
          onToggleSnap={actions.toggleSnap}
          onToggleFilter={actions.toggleFilter}
          onToggleDark={actions.toggleDark}
          onTogglePresentation={actions.togglePresentation}
          onUndo={actions.undo}
          onRedo={actions.redo}
          onScrollToToday={actions.scrollToToday}
          onExport={handleExport}
          onShowHelp={actions.showHelp}
          // Mobile hamburger props
          onToggleMobilePanel={() => setIsMobilePanelOpen(prev => !prev)}
          isMobilePanelOpen={isMobilePanelOpen}
        />
      )}

      {/* Executive Summary KPIs */}
      {!state.presentation && (
        <RoadmapSummary
          totalObjectives={computed.totalObjectives}
          onTrackCount={computed.onTrackCount}
          atRiskCount={computed.atRiskCount}
          blockedCount={computed.blockedCount}
          healthPercent={computed.healthPercent}
          nextMilestone={computed.nextMilestone}
        />
      )}

      {/* Main content area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Filter Panel (slides in) */}
        {!state.presentation && (
          <RoadmapFilterPanel
            isOpen={state.filterOpen}
            filters={state.filters}
            groupBy={state.groupBy}
            allOwners={computed.allOwners}
            statusCounts={computed.statusCounts}
            onClose={actions.toggleFilter}
            onFiltersChange={actions.setFilters}
            onGroupByChange={actions.setGroupBy}
            onClearFilters={actions.clearFilters}
          />
        )}

        {/* Objectives Panel - responsive with mobile overlay */}
        {!state.presentation && (
          <RoadmapObjectivesPanel
            groups={computed.groups}
            collapsed={state.collapsed}
            selected={state.selected}
            filteredCount={computed.filteredCount}
            totalCount={computed.totalObjectives}
            onToggleCollapse={actions.toggleCollapse}
            onSelect={actions.select}
            canReorderThemes={state.groupBy === 'theme'}
            onReorderTheme={actions.reorderThemes}
            isMobileOpen={isMobilePanelOpen}
            onMobileClose={() => setIsMobilePanelOpen(false)}
          />
        )}

        {/* Timeline */}
        <RoadmapTimeline
          ref={timelineRef}
          groups={computed.groups}
          deps={data.deps}
          collapsed={state.collapsed}
          selected={state.selected}
          editing={state.editing}
          slice={state.slice}
          zoom={state.zoom}
          timelineConfig={computed.timelineConfig}
          onSelect={actions.select}
          onStartEdit={actions.startEdit}
          onFinishEdit={actions.finishEdit}
          onCancelEdit={actions.cancelEdit}
          onContextMenu={actions.showContextMenu}
          onShowTooltip={actions.showTooltip}
          onHideTooltip={actions.hideTooltip}
        />

        {/* Minimap */}
        {!state.presentation && (
          <RoadmapMinimap
            groups={computed.groups}
            timelineConfig={computed.timelineConfig}
            todayPosition={computed.todayPosition}
            viewport={viewport}
            onViewportDrag={handleViewportDrag}
          />
        )}
      </div>

      {/* Legend */}
      {!state.presentation && <RoadmapLegend />}

      {/* Overlays */}
      <RoadmapTooltip 
        objective={tooltipObjective} 
        position={tooltip} 
      />
      
      <RoadmapContextMenu
        position={contextMenu}
        onClose={actions.hideContextMenu}
        onRename={actions.startEdit}
        onAddDependency={actions.startDepMode}
        onRemoveDependencies={actions.removeDependencies}
      />
      
      <RoadmapKeyboardOverlay
        isOpen={state.helpOpen}
        onClose={actions.hideHelp}
      />

      {/* Presentation watermark */}
      {state.presentation && (
        <div className="fixed bottom-5 right-5 flex items-center gap-2 px-3.5 py-2 bg-surface-0 rounded-lg shadow-lg z-50">
          <div className="w-5 h-5 bg-gradient-to-br from-brand-primary to-purple-600 rounded flex items-center justify-center text-white font-bold text-[10px]">
            C
          </div>
          <span className="text-[11px] font-medium text-text-secondary">Catalyst Strategic</span>
        </div>
      )}
    </div>
  );
}
