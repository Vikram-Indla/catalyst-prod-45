import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductRoadmapToolbar, DemandGroupBy } from '@/components/product-roadmap/ProductRoadmapToolbar';
import { DemandColumn } from '@/components/product-roadmap/DemandColumn';
import { DemandTimelineArea } from '@/components/product-roadmap/DemandTimelineArea';
import { ProductRoadmapLegend } from '@/components/product-roadmap/ProductRoadmapLegend';
import { LoadMoreStrip } from '@/components/objective-roadmap/LoadMoreStrip';
import { filterDemandsCanonical, countMatchingDemands, filterByViewportOverlap } from '@/utils/product-roadmap-filter-utils';
import { Scale, Demand } from '@/types/product-roadmap';
import { useProductRoadmapData } from '@/hooks/useProductRoadmapData';
import { useProductRoadmapFilters } from '@/hooks/useProductRoadmapFilters';
import { BusinessRequestDrawer } from '@/components/business-requests/BusinessRequestDrawer';
import GlobalPageHeader from '@/components/layout/GlobalPageHeader';
import { Loader2 } from 'lucide-react';
import { RoadmapViewport, RoadmapDebugOverlay } from '@/components/roadmaps/RoadmapDateFilterV2';
import { TimelineFilterState, DEFAULT_TIMELINE_FILTER } from '@/components/roadmap/TimelineFilterPopover';

// Group demands by a specific field
export interface DemandGroup {
  key: string;
  label: string;
  demands: Demand[];
}

function groupDemands(demands: Demand[], groupBy: DemandGroupBy): DemandGroup[] {
  if (groupBy === 'none') {
    return [{ key: 'all', label: '', demands }];
  }
  
  const groups = new Map<string, Demand[]>();
  
  demands.forEach(demand => {
    // For quarter grouping, a demand can appear in multiple groups
    if (groupBy === 'quarter') {
      const quarters = demand.plannedQuarters || ['unplanned'];
      quarters.forEach(q => {
        const key = q === 'unplanned' ? 'Unplanned' : q;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(demand);
      });
    } else {
      // For other groupings, single group per demand
      let key: string;
      switch (groupBy) {
        case 'platform':
          key = demand.platform || 'Unassigned';
          break;
        case 'owner':
          key = demand.ownerName || 'Unassigned';
          break;
        default:
          key = 'Unassigned';
      }
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(demand);
    }
  });
  
  // Sort groups, putting "Unassigned"/"Unplanned" last
  const sortedEntries = Array.from(groups.entries()).sort((a, b) => {
    const unassigned = ['Unassigned', 'Unplanned'];
    if (unassigned.includes(a[0]) && !unassigned.includes(b[0])) return 1;
    if (!unassigned.includes(a[0]) && unassigned.includes(b[0])) return -1;
    // Sort quarters in order Q1, Q2, Q3, Q4
    if (groupBy === 'quarter') {
      const quarterOrder = ['Q1', 'Q2', 'Q3', 'Q4', 'Unplanned'];
      return quarterOrder.indexOf(a[0]) - quarterOrder.indexOf(b[0]);
    }
    return a[0].localeCompare(b[0]);
  });
  
  return sortedEntries.map(([key, demands]) => ({
    key,
    label: key,
    demands,
  }));
}

export const ProductRoadmapPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const debugMode = searchParams.get('debugViewport') === '1';
  
  // Fetch real data from Supabase
  const { demands, owners, assignees, platforms, isLoading } = useProductRoadmapData();
  
  // Canonical filter state
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
    toggleOwner,
    togglePlatform,
    toggleAssignee,
    toggleQuarter,
    togglePriorityTier,
    toggleHealth,
    toggleMilestoneCondition,
    updateDraftViewport,
    isViewportAtDefault,
  } = useProductRoadmapFilters();
  
  // Derive scale from viewport
  const scale = appliedViewport.scale;
  
  const [showMilestones, setShowMilestones] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [columnWidth, setColumnWidth] = useState(380);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<DemandGroupBy>('none');
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilterState>(DEFAULT_TIMELINE_FILTER);
  
  // Timeline dates derived from viewport (or dataset bounds)
  const timelineBounds = useMemo(() => {
    if (isViewportAtDefault && demands.length > 0) {
      let minStart = demands[0].startDate.getTime();
      let maxEnd = demands[0].endDate.getTime();
      demands.forEach(d => {
        minStart = Math.min(minStart, d.startDate.getTime());
        maxEnd = Math.max(maxEnd, d.endDate.getTime());
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
  }, [appliedViewport, demands, isViewportAtDefault]);
  
  const timelineStart = timelineBounds.start;
  const timelineEnd = timelineBounds.end;
  
  // Drawer state
  const [selectedDemandId, setSelectedDemandId] = useState<string | null>(null);
  
  const demandListRef = useRef<HTMLDivElement>(null);
  const timelineGridRef = useRef<HTMLDivElement>(null);
  
  // Skip viewport filtering when at default
  const demandsInViewport = useMemo(() => {
    if (isViewportAtDefault) {
      return demands;
    }
    return filterByViewportOverlap(demands, appliedViewport.start, appliedViewport.end);
  }, [demands, appliedViewport, isViewportAtDefault]);
  
  // Apply canonical filters
  const filteredDemands = useMemo(
    () => filterDemandsCanonical(demandsInViewport, appliedFilters, searchQuery),
    [demandsInViewport, appliedFilters, searchQuery]
  );
  
  // Calculate matching count for draft filters
  const draftMatchingCount = useMemo(
    () => countMatchingDemands(demandsInViewport, draftFilters, searchQuery),
    [demandsInViewport, draftFilters, searchQuery]
  );
  
  // Group filtered demands
  const groupedDemands = useMemo(
    () => groupDemands(filteredDemands, groupBy),
    [filteredDemands, groupBy]
  );
  
  const visibleDemands = filteredDemands.slice(0, visibleCount);
  const remainingDemands = filteredDemands.slice(visibleCount);
  
  // Count "needs attention" (on-hold or blocked)
  const needAttentionCount = remainingDemands.filter(
    d => d.status === 'on-hold'
  ).length;
  
  const handleLoadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + 10, filteredDemands.length));
  }, [filteredDemands.length]);
  
  const handleDemandClick = useCallback((demandId: string) => {
    setSelectedDemandId(demandId);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedDemandId(null);
  }, []);

  const handleScaleChange = useCallback((newScale: Scale) => {
    updateDraftViewport({
      ...draftViewport,
      scale: newScale,
    });
  }, [updateDraftViewport, draftViewport]);
  
  // Handle clear all - reset search and visible count
  const handleClearAll = useCallback(() => {
    clearAll();
    setSearchQuery('');
    setVisibleCount(20);
  }, [clearAll]);
  
  // Handle apply filters - reset visible count
  const handleApplyFilters = useCallback(() => {
    applyFilters();
    setVisibleCount(20);
  }, [applyFilters]);
  
  // Scroll sync (vertical only)
  useEffect(() => {
    const demandList = demandListRef.current;
    const timelineGrid = timelineGridRef.current;
    if (!demandList || !timelineGrid) return;
    
    const syncFromList = () => { if (timelineGrid) timelineGrid.scrollTop = demandList.scrollTop; };
    const syncFromGrid = () => { if (demandList) demandList.scrollTop = timelineGrid.scrollTop; };
    
    demandList.addEventListener('scroll', syncFromList);
    timelineGrid.addEventListener('scroll', syncFromGrid);
    return () => {
      demandList.removeEventListener('scroll', syncFromList);
      timelineGrid.removeEventListener('scroll', syncFromGrid);
    };
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <GlobalPageHeader sectionLabel="PRODUCT" pageTitle="Product Roadmap" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <GlobalPageHeader sectionLabel="PRODUCT" pageTitle="Product Roadmap" />
      
      <ProductRoadmapToolbar
        scale={scale}
        onScaleChange={handleScaleChange}
        showMilestones={showMilestones}
        onToggleMilestones={() => setShowMilestones(!showMilestones)}
        showLegend={showLegend}
        onToggleLegend={() => setShowLegend(!showLegend)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        timelineFilter={timelineFilter}
        onTimelineFilterChange={setTimelineFilter}
        appliedViewport={appliedViewport}
        draftViewport={draftViewport}
        onDraftViewportChange={updateDraftViewport}
        draftFilters={draftFilters}
        activeFilterCount={activeFilterCount}
        onToggleStatus={toggleStatus}
        onToggleOwner={toggleOwner}
        onTogglePlatform={togglePlatform}
        onToggleAssignee={toggleAssignee}
        onToggleQuarter={toggleQuarter}
        onTogglePriorityTier={togglePriorityTier}
        onToggleHealth={toggleHealth}
        onToggleMilestoneCondition={toggleMilestoneCondition}
        onOpenFilters={openFilters}
        onApplyFilters={handleApplyFilters}
        onCancelFilters={cancelFilters}
        onClearAll={handleClearAll}
        owners={owners}
        assignees={assignees}
        platforms={platforms}
        matchingDemands={draftMatchingCount}
      />
      
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        <DemandColumn
          ref={demandListRef}
          demands={visibleDemands}
          groups={groupedDemands}
          groupBy={groupBy}
          owners={owners}
          onDemandClick={handleDemandClick}
          width={columnWidth}
          onWidthChange={setColumnWidth}
        />
        <DemandTimelineArea
          ref={timelineGridRef}
          demands={visibleDemands}
          groups={groupedDemands}
          groupBy={groupBy}
          scale={scale}
          showMilestones={showMilestones}
          timelineStart={timelineStart}
          timelineEnd={timelineEnd}
          onDemandClick={handleDemandClick}
        />
        
        {/* Legend */}
        <ProductRoadmapLegend isVisible={showLegend} showMilestones={showMilestones} />
      </div>
      
      <LoadMoreStrip
        visibleCount={Math.min(visibleCount, filteredDemands.length)}
        totalCount={filteredDemands.length}
        needAttentionCount={needAttentionCount}
        onLoadMore={handleLoadMore}
        hasMore={visibleCount < filteredDemands.length}
        entityLabel="demands"
      />

      {/* Business Request Drawer */}
      <BusinessRequestDrawer
        requestId={selectedDemandId}
        isOpen={!!selectedDemandId}
        onClose={handleCloseDrawer}
      />
      
      {/* Debug Overlay */}
      {debugMode && (
        <RoadmapDebugOverlay
          appliedViewport={appliedViewport}
          draftViewport={draftViewport}
          rowCountBefore={demands.length}
          rowCountAfter={filteredDemands.length}
        />
      )}
    </div>
  );
};

export default ProductRoadmapPage;
