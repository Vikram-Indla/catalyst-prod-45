import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RoadmapToolbar } from '@/components/objective-roadmap/RoadmapToolbar';
import { ObjectivesColumn } from '@/components/objective-roadmap/ObjectivesColumn';
import { TimelineArea } from '@/components/objective-roadmap/TimelineArea';
import { LoadMoreStrip } from '@/components/objective-roadmap/LoadMoreStrip';
import { ObjectiveRoadmapLegend } from '@/components/objective-roadmap/ObjectiveRoadmapLegend';
import { groupObjectives, countNeedAttention } from '@/utils/objective-roadmap-utils';
import { Scale, GroupBy, Objective } from '@/types/objective-roadmap';
import { useObjectiveRoadmapData } from '@/hooks/useObjectiveRoadmapData';
import { ObjectiveAnalyticsDrawer } from '@/modules/okr-v2';
import GlobalPageHeader from '@/components/layout/GlobalPageHeader';
import { Loader2 } from 'lucide-react';
import { 
  RoadmapViewport,
  getDefaultViewport,
  RoadmapDebugOverlay 
} from '@/components/roadmaps/RoadmapDateFilterV2';
import {
  EnterpriseFilters,
  DEFAULT_ENTERPRISE_FILTERS,
  getCurrentQuarterDates,
  getNextQuarterDates,
} from '@/components/objective-roadmap/EnterpriseRoadmapFiltersDialog';

// ─────────────────────────────────────────────────────────────────────────────────
// FILTER HELPERS
// ─────────────────────────────────────────────────────────────────────────────────

function filterObjectivesByEnterprise(
  objectives: Objective[],
  filters: EnterpriseFilters,
  searchQuery: string
): Objective[] {
  return objectives.filter(obj => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!obj.name.toLowerCase().includes(query)) {
        return false;
      }
    }
    
    // Owner filter
    if (filters.owners.length > 0 && !filters.owners.includes(obj.ownerId)) {
      return false;
    }
    
    // Theme filter
    if (filters.themes.length > 0 && !filters.themes.includes(obj.themeId)) {
      return false;
    }
    
    // Status filter
    if (filters.status.length > 0 && !filters.status.includes(obj.status)) {
      return false;
    }
    
    // Health filter (mapped from status for now)
    if (filters.health.length > 0) {
      const healthStatus = obj.status === 'on-track' || obj.status === 'at-risk' || obj.status === 'off-track' 
        ? obj.status 
        : 'on-track';
      if (!filters.health.includes(healthStatus)) {
        return false;
      }
    }
    
    // Active In Period filter (timeline overlap logic)
    if (filters.activeInPeriod !== 'any') {
      let periodStart: Date | null = null;
      let periodEnd: Date | null = null;
      
      if (filters.activeInPeriod === 'this-quarter') {
        const q = getCurrentQuarterDates();
        periodStart = q.start;
        periodEnd = q.end;
      } else if (filters.activeInPeriod === 'next-quarter') {
        const q = getNextQuarterDates();
        periodStart = q.start;
        periodEnd = q.end;
      } else if (filters.activeInPeriod === 'custom' && filters.customRangeStart && filters.customRangeEnd) {
        periodStart = filters.customRangeStart;
        periodEnd = filters.customRangeEnd;
      }
      
      if (periodStart && periodEnd) {
        // Timeline overlap: obj.startDate <= periodEnd AND obj.endDate >= periodStart
        const objStart = obj.startDate.getTime();
        const objEnd = obj.endDate.getTime();
        const pStart = periodStart.getTime();
        const pEnd = periodEnd.getTime();
        
        if (!(objStart <= pEnd && objEnd >= pStart)) {
          return false;
        }
      }
    }
    
    return true;
  });
}

function countEnterpriseFilters(filters: EnterpriseFilters): number {
  let count = 0;
  count += filters.owners.length;
  count += filters.themes.length;
  count += filters.status.length;
  count += filters.health.length;
  if (filters.activeInPeriod !== 'any') count += 1;
  return count;
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

export const ObjectiveRoadmapPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const debugMode = searchParams.get('debugViewport') === '1';
  
  // Fetch real data from Supabase
  const { objectives, themes, owners, isLoading } = useObjectiveRoadmapData();
  
  // Enterprise filters (dialog-based)
  const [enterpriseFilters, setEnterpriseFilters] = useState<EnterpriseFilters>(DEFAULT_ENTERPRISE_FILTERS);
  
  // Viewport state
  const [appliedViewport, setAppliedViewport] = useState<RoadmapViewport>(getDefaultViewport);
  const [draftViewport, setDraftViewport] = useState<RoadmapViewport>(getDefaultViewport);
  
  // Derive scale from viewport
  const scale = appliedViewport.scale;
  
  const [groupBy, setGroupBy] = useState<GroupBy>('theme');
  const [showMilestones, setShowMilestones] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [columnWidth, setColumnWidth] = useState(340);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Check if viewport is at default
  const isViewportAtDefault = useMemo(() => {
    const defaultVp = getDefaultViewport();
    return (
      appliedViewport.scale === defaultVp.scale &&
      JSON.stringify(appliedViewport.selectedYears) === JSON.stringify(defaultVp.selectedYears) &&
      JSON.stringify(appliedViewport.selectedQuarters) === JSON.stringify(defaultVp.selectedQuarters)
    );
  }, [appliedViewport]);
  
  // Timeline dates derived from viewport (or dataset bounds when at default)
  const timelineBounds = useMemo(() => {
    if (isViewportAtDefault && objectives.length > 0) {
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
  
  // Active filter count
  const activeFilterCount = useMemo(() => countEnterpriseFilters(enterpriseFilters), [enterpriseFilters]);
  
  // Apply filters to objectives
  const filteredObjectives = useMemo(
    () => filterObjectivesByEnterprise(objectives, enterpriseFilters, searchQuery),
    [objectives, enterpriseFilters, searchQuery]
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

  const handleScaleChange = useCallback((newScale: Scale) => {
    setDraftViewport(prev => ({ ...prev, scale: newScale }));
  }, []);
  
  const handleApplyFilters = useCallback(() => {
    setAppliedViewport({ ...draftViewport });
    setVisibleCount(10);
  }, [draftViewport]);
  
  const handleClearAll = useCallback(() => {
    const defaultVp = getDefaultViewport();
    setEnterpriseFilters(DEFAULT_ENTERPRISE_FILTERS);
    setAppliedViewport(defaultVp);
    setDraftViewport(defaultVp);
    setSearchQuery('');
    setVisibleCount(10);
  }, []);
  
  const handleEnterpriseFiltersChange = useCallback((filters: EnterpriseFilters) => {
    setEnterpriseFilters(filters);
    setVisibleCount(10);
  }, []);
  
  // Scroll sync
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
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
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
        showLegend={showLegend}
        onToggleLegend={() => setShowLegend(!showLegend)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        appliedViewport={appliedViewport}
        draftViewport={draftViewport}
        onDraftViewportChange={setDraftViewport}
        enterpriseFilters={enterpriseFilters}
        onEnterpriseFiltersChange={handleEnterpriseFiltersChange}
        activeFilterCount={activeFilterCount}
        onApplyFilters={handleApplyFilters}
        onClearAll={handleClearAll}
        themes={themes}
        owners={owners}
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
