import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { AppliedDateFilter } from '@/components/roadmap/DateRangeFilter';

// Helper to compute date range from AppliedDateFilter
const getDateRangeFromFilter = (filter: AppliedDateFilter | null): { start: Date; end: Date } => {
  if (!filter) {
    // Default to current year
    const year = new Date().getFullYear();
    return {
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31),
    };
  }

  const { type, year, value, startDate, endDate } = filter;

  switch (type) {
    case 'year':
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31),
      };
    case 'quarter': {
      const qIndex = parseInt(String(value)[1]) - 1;
      const startMonth = qIndex * 3;
      const endMonth = startMonth + 2;
      return {
        start: new Date(year, startMonth, 1),
        end: new Date(year, endMonth + 1, 0), // Last day of end month
      };
    }
    case 'month': {
      const monthIdx = Number(value);
      return {
        start: new Date(year, monthIdx, 1),
        end: new Date(year, monthIdx + 1, 0), // Last day of month
      };
    }
    case 'custom':
      if (startDate && endDate) {
        return {
          start: new Date(startDate),
          end: new Date(endDate),
        };
      }
      // Fallback
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31),
      };
    default:
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31),
      };
  }
};

export const ObjectiveRoadmapPage: React.FC = () => {
  // Fetch real data from Supabase
  const { objectives, themes, owners, isLoading } = useObjectiveRoadmapData();
  
  const [scale, setScale] = useState<Scale>('monthly');
  const [groupBy, setGroupBy] = useState<GroupBy>('theme');
  const [showMilestones, setShowMilestones] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [columnWidth, setColumnWidth] = useState(340);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(DEFAULT_FILTERS);
  
  // Date filter state
  const currentYear = new Date().getFullYear();
  const currentQuarter = `Q${Math.floor(new Date().getMonth() / 3) + 1}`;
  const [appliedDateFilter, setAppliedDateFilter] = useState<AppliedDateFilter | null>({
    type: 'year',
    year: currentYear,
    value: currentYear,
  });
  
  // Compute timeline dates from filter
  const { start: timelineStart, end: timelineEnd } = getDateRangeFromFilter(appliedDateFilter);
  
  // Drawer state
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  
  const objectivesListRef = useRef<HTMLDivElement>(null);
  const timelineGridRef = useRef<HTMLDivElement>(null);
  
  const filteredObjectives = filterObjectives(objectives, activeFilters, searchQuery);
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

  const handleApplyDateFilter = useCallback((filter: AppliedDateFilter) => {
    setAppliedDateFilter(filter);
  }, []);

  const handleClearDateFilter = useCallback(() => {
    setAppliedDateFilter({
      type: 'year',
      year: currentYear,
      value: currentYear,
    });
  }, [currentYear]);
  
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
        onScaleChange={setScale}
        groupBy={groupBy}
        onGroupByChange={handleGroupByChange}
        showMilestones={showMilestones}
        onToggleMilestones={() => setShowMilestones(!showMilestones)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        appliedDateFilter={appliedDateFilter}
        onApplyDateFilter={handleApplyDateFilter}
        onClearDateFilter={handleClearDateFilter}
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
    </div>
  );
};

export default ObjectiveRoadmapPage;
