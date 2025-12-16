import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RoadmapToolbar } from '@/components/objective-roadmap/RoadmapToolbar';
import { ObjectivesColumn } from '@/components/objective-roadmap/ObjectivesColumn';
import { TimelineArea } from '@/components/objective-roadmap/TimelineArea';
import { LoadMoreStrip } from '@/components/objective-roadmap/LoadMoreStrip';
import { 
  groupObjectives, 
  countNeedAttention, 
  filterObjectives,
  DEFAULT_FILTERS 
} from '@/utils/objective-roadmap-utils';
import { Scale, GroupBy, ActiveFilters } from '@/types/objective-roadmap';
import { useObjectiveRoadmapData } from '@/hooks/useObjectiveRoadmapData';
import { ObjectiveAnalyticsDrawer } from '@/modules/okr-v2';
import GlobalPageHeader from '@/components/layout/GlobalPageHeader';
import { Loader2 } from 'lucide-react';
import { 
  RoadmapViewport, 
  getDefaultViewport,
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
  
  // Viewport state (single source of truth for date range + scale)
  const [appliedViewport, setAppliedViewport] = useState<RoadmapViewport>(getDefaultViewport);
  
  // Derive scale from viewport
  const scale = appliedViewport.scale;
  
  const [groupBy, setGroupBy] = useState<GroupBy>('theme');
  const [showMilestones, setShowMilestones] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [columnWidth, setColumnWidth] = useState(340);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(DEFAULT_FILTERS);
  
  // Timeline dates derived from viewport
  const timelineStart = appliedViewport.start;
  const timelineEnd = appliedViewport.end;
  
  // Drawer state
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  
  const objectivesListRef = useRef<HTMLDivElement>(null);
  const timelineGridRef = useRef<HTMLDivElement>(null);
  
  // Filter by viewport overlap FIRST, then by other filters
  const objectivesInViewport = useMemo(
    () => filterByViewportOverlap(objectives, appliedViewport),
    [objectives, appliedViewport]
  );
  
  const filteredObjectives = filterObjectives(objectivesInViewport, activeFilters, searchQuery);
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

  const handleApplyViewport = useCallback((viewport: RoadmapViewport) => {
    setAppliedViewport(viewport);
    // Reset visible count when viewport changes
    setVisibleCount(10);
  }, []);

  // Handle scale change from external sources (sync back to viewport)
  const handleScaleChange = useCallback((newScale: Scale) => {
    setAppliedViewport(prev => ({
      ...prev,
      scale: newScale,
    }));
  }, []);
  
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
        onApplyViewport={handleApplyViewport}
        onScrollToToday={handleScrollToToday}
        activeFilters={activeFilters}
        onApplyFilters={(filters) => { setActiveFilters(filters); setVisibleCount(10); }}
        onClearFilters={() => { setActiveFilters(DEFAULT_FILTERS); setVisibleCount(10); }}
        themes={themes}
        owners={owners}
        totalObjectives={objectives.length}
        matchingObjectives={filteredObjectives.length}
      />
      
      <div className="flex flex-1 min-h-0 overflow-hidden">
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
          rowCountBefore={objectives.length}
          rowCountAfter={filteredObjectives.length}
        />
      )}
    </div>
  );
};

export default ObjectiveRoadmapPage;
