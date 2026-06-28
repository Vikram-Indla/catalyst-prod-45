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
import { useBatchBusinessRequestHealth } from '@/hooks/useBatchBusinessRequestHealth';
import GlobalPageHeader from '@/components/layout/GlobalPageHeader';
import { Loader2 } from '@/lib/atlaskit-icons';
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
        case 'assignee':
          key = demand.assigneeName || 'Unassigned';
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
  
  const [colorByHealth, setColorByHealth] = useState(false);

  // Batch health for all demands
  const demandIds = useMemo(() => demands.map(d => d.id), [demands]);
  const { data: healthMap } = useBatchBusinessRequestHealth(demandIds);

  const [showMilestones, setShowMilestones] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [columnWidth, setColumnWidth] = useState(380);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<DemandGroupBy>('none');
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilterState>(DEFAULT_TIMELINE_FILTER);
  
  // Timeline dates derived from timelineFilter (applying user's date selection)
  const timelineBounds = useMemo(() => {
    const { selectedYears, selectedQuarters } = timelineFilter;
    
    if (selectedYears.length === 0) {
      // Fallback to current year
      const currentYear = new Date().getFullYear();
      return {
        start: new Date(currentYear, 0, 1),
        end: new Date(currentYear, 11, 31),
      };
    }
    
    const sortedYears = [...selectedYears].sort((a, b) => a - b);
    const sortedQuarters = selectedQuarters.length > 0 
      ? [...selectedQuarters].sort((a, b) => a - b) 
      : [1, 2, 3, 4];
    
    const firstYear = sortedYears[0];
    const lastYear = sortedYears[sortedYears.length - 1];
    const firstQuarter = sortedQuarters[0];
    const lastQuarter = sortedQuarters[sortedQuarters.length - 1];
    
    // Calculate start date (first day of first quarter of first year)
    const startMonth = (firstQuarter - 1) * 3;
    const start = new Date(firstYear, startMonth, 1);
    
    // Calculate end date (last day of last quarter of last year)
    const endMonth = lastQuarter * 3 - 1; // Last month of quarter
    const end = new Date(lastYear, endMonth + 1, 0); // Last day of that month
    
    return { start, end };
  }, [timelineFilter]);
  
  const timelineStart = timelineBounds.start;
  const timelineEnd = timelineBounds.end;
  
  // Filter demands by timeline viewport
  const demandsInViewport = useMemo(() => {
    return filterByViewportOverlap(demands, timelineStart, timelineEnd);
  }, [demands, timelineStart, timelineEnd]);
  
  // Drawer state
  const [selectedDemandId, setSelectedDemandId] = useState<string | null>(null);
  
  const demandListRef = useRef<HTMLDivElement>(null);
  const timelineGridRef = useRef<HTMLDivElement>(null);
  
  
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
      
      {/* Date Pulse health toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 16px', borderBottom: '1px solid var(--ds-border, #DFE1E6)', background: 'var(--ds-surface, #FFFFFF)' }}>
        <button
          onClick={() => setColorByHealth(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 4, fontSize: 'var(--ds-font-size-200)', fontWeight: 500, cursor: 'pointer',
            border: `1px solid ${colorByHealth ? 'var(--ds-border-focused, #1868DB)' : 'var(--ds-border, #DFE1E6)'}`,
            background: colorByHealth ? 'var(--ds-background-selected, #E9F2FE)' : 'var(--ds-surface, #FFFFFF)',
            color: colorByHealth ? 'var(--ds-link, #0052CC)' : 'var(--ds-text-subtle, #42526E)',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: colorByHealth ? 'var(--ds-background-accent-green-bolder, #1F845A)' : 'var(--ds-background-neutral-hovered, #DCDFE4)', display: 'inline-block' }} />
          Date Pulse health
        </button>
        {colorByHealth && (
          <div style={{ display: 'flex', gap: 12, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle, #42526E)' }}>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--ds-background-danger-bold, #C9372C)', marginRight: 4 }} />Overdue</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#C25100', marginRight: 4 }} />At Risk</span> // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--ds-background-success-bold, #1F845A)', marginRight: 4 }} />Healthy</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--ds-border-disabled, #DCDFE4)', marginRight: 4 }} />Uncommitted</span>
          </div>
        )}
      </div>

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
          healthMap={healthMap}
          colorByHealth={colorByHealth}
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

      {/* BR detail modal removed 2026-06-01 — canonical view is CatalystViewBusinessRequestV3 (open via CatalystDetailRouter). */}

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
