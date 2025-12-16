import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RoadmapToolbar } from '@/components/objective-roadmap/RoadmapToolbar';
import { ObjectivesColumn } from '@/components/objective-roadmap/ObjectivesColumn';
import { TimelineArea } from '@/components/objective-roadmap/TimelineArea';
import { LoadMoreStrip } from '@/components/objective-roadmap/LoadMoreStrip';
import { ObjectiveRoadmapLegend } from '@/components/objective-roadmap/ObjectiveRoadmapLegend';
import { groupObjectives, countNeedAttention } from '@/utils/objective-roadmap-utils';
import { filterObjectivesCanonical, countMatchingObjectives } from '@/utils/canonical-roadmap-filter-utils';
import { Scale, GroupBy } from '@/types/objective-roadmap';
import { useObjectiveRoadmapData } from '@/hooks/useObjectiveRoadmapData';
import { useCanonicalRoadmapFilters } from '@/hooks/useCanonicalRoadmapFilters';
import { ObjectiveAnalyticsDrawer } from '@/modules/okr-v2';
import GlobalPageHeader from '@/components/layout/GlobalPageHeader';
import { Loader2 } from 'lucide-react';
import { 
  RoadmapViewport, 
  RoadmapDebugOverlay 
} from '@/components/roadmaps/RoadmapDateFilterV2';

// ─────────────────────────────────────────────────────────────────────────────────
// OVERLAP FILTER: Items must overlap viewport range (not just start inside)
// ─────────────────────────────────────────────────────────────────────────────────

function filterByViewportOverlap<T extends { startDate: Date; endDate: Date }>(
  items: T[],
  viewport: RoadmapViewport
): T[] {
  return items.filter(item => {
    const itemStart = item.startDate.getTime();
    const itemEnd = item.endDate.getTime();
    const viewStart = viewport.start.getTime();
    const viewEnd = viewport.end.getTime();
    
    // Item overlaps if: itemStart <= viewport.end AND itemEnd >= viewport.start
    return itemStart <= viewEnd && itemEnd >= viewStart;
  });
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

export const ObjectiveRoadmapPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const debugMode = searchParams.get('debugViewport') === '1';
  
  // Fetch real data from Supabase
  const { objectives, themes, owners, isLoading } = useObjectiveRoadmapData();
  
  // Canonical filter state (single source of truth)
  const {
    appliedFilters,
    appliedViewport,
    draftFilters,
    draftViewport,
    activeFilterCount,
    openFilters,
    applyFilters,
    cancelFilters,
    clearAll,
    toggleStatus,
    toggleTheme,
    toggleOwner,
    toggleProgressRange,
    toggleKRCondition,
    updateDraftViewport,
    isViewportAtDefault,
  } = useCanonicalRoadmapFilters();
  
  // Derive scale from viewport
  const scale = appliedViewport.scale;
  
  const [groupBy, setGroupBy] = useState<GroupBy>('theme');
  const [showMilestones, setShowMilestones] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [columnWidth, setColumnWidth] = useState(340);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Timeline dates derived from viewport (or dataset bounds when at default)
  const timelineBounds = useMemo(() => {
    if (isViewportAtDefault && objectives.length > 0) {
      // Calculate dataset bounds when at default viewport
      let minStart = objectives[0].startDate.getTime();
      let maxEnd = objectives[0].endDate.getTime();
      objectives.forEach(obj => {
        minStart = Math.min(minStart, obj.startDate.getTime());
        maxEnd = Math.max(maxEnd, obj.endDate.getTime());
      });
      return {
        start: new Date(minStart),
        end: new Date(maxEnd),
      };
    }
    return {
      start: appliedViewport.start,
      end: appliedViewport.end,
    };
  }, [appliedViewport, objectives, isViewportAtDefault]);
  
  const timelineStart = timelineBounds.start;
  const timelineEnd = timelineBounds.end;
  
  // Drawer state
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  
  const objectivesListRef = useRef<HTMLDivElement>(null);
  const timelineGridRef = useRef<HTMLDivElement>(null);
  
  // Skip viewport filtering when at default (show all objectives)
  const objectivesInViewport = useMemo(() => {
    if (isViewportAtDefault) {
      return objectives; // Show all when at default
    }
    return filterByViewportOverlap(objectives, appliedViewport);
  }, [objectives, appliedViewport, isViewportAtDefault]);
  
  // Apply canonical filters to objectives in viewport
  const filteredObjectives = useMemo(
    () => filterObjectivesCanonical(objectivesInViewport, appliedFilters, searchQuery),
    [objectivesInViewport, appliedFilters, searchQuery]
  );
  
  // Calculate matching count for draft filters (for "X objectives match" in panel)
  const draftMatchingCount = useMemo(
    () => countMatchingObjectives(objectivesInViewport, draftFilters, searchQuery),
    [objectivesInViewport, draftFilters, searchQuery]
  );
  
  const visibleObjectives = filteredObjectives.slice(0, visibleCount);
  const groups = groupObjectives(visibleObjectives, groupBy, themes);
  
  const remainingObjectives = filteredObjectives.slice(visibleCount);
  const needAttentionCount = countNeedAttention(remainingObjectives);
  
  const handleToggleGroup = useCallback((groupKey: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey);
      return next;
    });
  }, []);
  
  const handleLoadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + 5, filteredObjectives.length));
  }, [filteredObjectives.length]);
  
  const handleScrollToToday = useCallback(() => {
    if (timelineGridRef.current) {
      const now = new Date();
      const total = timelineEnd.getTime() - timelineStart.getTime();
      const pos = now.getTime() - timelineStart.getTime();
      const percentage = Math.max(0, Math.min(100, (pos / total) * 100));
      const scrollPos = (percentage / 100) * timelineGridRef.current.scrollWidth - timelineGridRef.current.clientWidth / 2;
      timelineGridRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  }, [timelineStart, timelineEnd]);
  
  const handleObjectiveClick = useCallback((objectiveId: string) => {
    setSelectedObjectiveId(objectiveId);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedObjectiveId(null);
  }, []);
  
  const handleGroupByChange = useCallback((newGroupBy: GroupBy) => {
    setGroupBy(newGroupBy);
    setCollapsedGroups(new Set());
  }, []);

  // Handle scale change from external sources (sync back to viewport)
  const handleScaleChange = useCallback((newScale: Scale) => {
    updateDraftViewport({
      ...draftViewport,
      scale: newScale,
    });
  }, [updateDraftViewport, draftViewport]);
  
  // Handle clear all - also reset search and visible count
  const handleClearAll = useCallback(() => {
    clearAll();
    setSearchQuery('');
    setVisibleCount(10);
  }, [clearAll]);
  
  // Handle apply filters - reset visible count
  const handleApplyFilters = useCallback(() => {
    applyFilters();
    setVisibleCount(10);
  }, [applyFilters]);
  
  // Scroll sync (vertical only - horizontal is handled in TimelineArea)
  useEffect(() => {
    const objectivesList = objectivesListRef.current;
    const timelineGrid = timelineGridRef.current;
    if (!objectivesList || !timelineGrid) return;
    
    const syncFromList = () => { if (timelineGrid) timelineGrid.scrollTop = objectivesList.scrollTop; };
    const syncFromGrid = () => { if (objectivesList) objectivesList.scrollTop = timelineGrid.scrollTop; };
    
    objectivesList.addEventListener('scroll', syncFromList);
    timelineGrid.addEventListener('scroll', syncFromGrid);
    return () => {
      objectivesList.removeEventListener('scroll', syncFromList);
      timelineGrid.removeEventListener('scroll', syncFromGrid);
    };
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <GlobalPageHeader sectionLabel="ENTERPRISE" pageTitle="Objective Roadmap" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <GlobalPageHeader sectionLabel="ENTERPRISE" pageTitle="Objective Roadmap" />
      
      <RoadmapToolbar
        scale={scale}
        onScaleChange={handleScaleChange}
        groupBy={groupBy}
        onGroupByChange={handleGroupByChange}
        showMilestones={showMilestones}
        onToggleMilestones={() => setShowMilestones(!showMilestones)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        appliedViewport={appliedViewport}
        draftViewport={draftViewport}
        onDraftViewportChange={updateDraftViewport}
        // Canonical filter props
        draftFilters={draftFilters}
        activeFilterCount={activeFilterCount}
        onToggleStatus={toggleStatus}
        onToggleTheme={toggleTheme}
        onToggleOwner={toggleOwner}
        onToggleProgressRange={toggleProgressRange}
        onToggleKRCondition={toggleKRCondition}
        onOpenFilters={openFilters}
        onApplyFilters={handleApplyFilters}
        onCancelFilters={cancelFilters}
        onClearAll={handleClearAll}
        themes={themes}
        owners={owners}
        matchingObjectives={draftMatchingCount}
      />
      
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        <ObjectivesColumn
          ref={objectivesListRef}
          groups={groups}
          groupBy={groupBy}
          themes={themes}
          owners={owners}
          collapsedGroups={collapsedGroups}
          onToggleGroup={handleToggleGroup}
          onObjectiveClick={handleObjectiveClick}
          width={columnWidth}
          onWidthChange={setColumnWidth}
        />
        <TimelineArea
          ref={timelineGridRef}
          groups={groups}
          groupBy={groupBy}
          collapsedGroups={collapsedGroups}
          scale={scale}
          showMilestones={showMilestones}
          timelineStart={timelineStart}
          timelineEnd={timelineEnd}
          onObjectiveClick={handleObjectiveClick}
        />
        
        {/* Legend */}
        <ObjectiveRoadmapLegend isVisible={showLegend && showMilestones} />
      </div>
      
      <LoadMoreStrip
        visibleCount={Math.min(visibleCount, filteredObjectives.length)}
        totalCount={filteredObjectives.length}
        needAttentionCount={needAttentionCount}
        onLoadMore={handleLoadMore}
        hasMore={visibleCount < filteredObjectives.length}
      />

      {/* Objective Analytics Drawer */}
      <ObjectiveAnalyticsDrawer
        objectiveId={selectedObjectiveId}
        open={!!selectedObjectiveId}
        onClose={handleCloseDrawer}
      />
      
      {/* Debug Overlay (enabled via ?debugViewport=1) */}
      {debugMode && (
        <RoadmapDebugOverlay
          appliedViewport={appliedViewport}
          draftViewport={draftViewport}
          rowCountBefore={objectives.length}
          rowCountAfter={filteredObjectives.length}
        />
      )}
    </div>
  );
};

export default ObjectiveRoadmapPage;
