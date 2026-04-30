// ExecutiveRoadmap - Demand Roadmap using the generic RoadmapEngine
// This component wraps the RoadmapEngine with demand-specific configuration

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { BusinessRequestRoadmapItem, PLATFORM_INFO, STAGE_NAMES, STAGE_NAMES_AR } from '@/types/roadmapTypes';
import { RoadmapLegend } from './RoadmapLegend';
import { RoadmapFiltersDialog, type RoadmapFilters } from './RoadmapFiltersDialog';
// jira-compare cycle 5 — BusinessRequestDetailModal replaced by CatalystViewBusinessRequestV2.
// Legacy import retained as commented sunset breadcrumb.
// import { BusinessRequestDetailModal } from '@/components/business-requests/BusinessRequestDetailModal';
import CatalystViewBusinessRequestV2 from '@/components/catalyst-detail-views/business-request/CatalystViewBusinessRequest.v2';
import { useRoadmapBusinessRequests } from '@/hooks/useRoadmapBusinessRequests';
import {
  TimeScale,
  Language,
  SortField,
  SortOrder,
  TimePeriodSelection,
  MONTH_NAMES,
  MONTH_NAMES_AR,
  QUARTER_NAMES,
  TRANSLATIONS,
  currentYear,
  currentMonth,
  AVAILABLE_YEARS,
  MIN_FIRST_COLUMN_WIDTH,
  MAX_FIRST_COLUMN_WIDTH,
  DEFAULT_FIRST_COLUMN_WIDTH,
} from './roadmapConstants';
import { getWeeksForMonth, getVisibleDateRange, formatDisplayKey } from './roadmapTimeUtils';
import { RoadmapToolbar } from './RoadmapToolbar';
import { RoadmapLeftPanel } from './RoadmapLeftPanel';
import { RoadmapTimelinePanel } from './RoadmapTimelinePanel';

interface ExecutiveRoadmapProps {
  className?: string;
  apiItems?: BusinessRequestRoadmapItem[];
}

export function ExecutiveRoadmap({ className, apiItems }: ExecutiveRoadmapProps) {
  const [language, setLanguage] = useState<Language>('en');
  const [timeScale, setTimeScale] = useState<TimeScale>('quarterly');
  const [timePeriodSelection, setTimePeriodSelection] = useState<TimePeriodSelection>({
    years: [currentYear],
    months: [],
    quarters: [],
    weeks: [],
    weeklyMonth: null
  });
  const [platform, setPlatform] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [owner, setOwner] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showMilestones, setShowMilestones] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [firstColumnWidth, setFirstColumnWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('roadmap-first-column-width');
      if (saved) return Math.max(MIN_FIRST_COLUMN_WIDTH, Math.min(MAX_FIRST_COLUMN_WIDTH, parseInt(saved, 10)));
    } catch (e) {}
    return DEFAULT_FIRST_COLUMN_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  // Dynamic today tracking - recalculates when day changes
  const [todayKey, setTodayKey] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    // Check if day has changed every minute
    const interval = setInterval(() => {
      const currentDay = format(new Date(), 'yyyy-MM-dd');
      if (currentDay !== todayKey) {
        setTodayKey(currentDay);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [todayKey]);

  const t = TRANSLATIONS[language];
  const isRTL = language === 'ar';

  // Fetch real business requests from database
  const { data: dbItems, isLoading: isLoadingDb } = useRoadmapBusinessRequests();

  // Sync vertical scroll between left panel and timeline - immediate sync without RAF delay
  useEffect(() => {
    const leftPanel = leftPanelRef.current;
    const timeline = timelineScrollRef.current;
    if (!leftPanel || !timeline) return;

    let ticking = false;
    let lastScrollSource: 'left' | 'timeline' | null = null;

    const handleLeftScroll = () => {
      if (lastScrollSource === 'timeline') {
        lastScrollSource = null;
        return;
      }
      lastScrollSource = 'left';
      timeline.scrollTop = leftPanel.scrollTop;
    };

    const handleTimelineScroll = () => {
      if (lastScrollSource === 'left') {
        lastScrollSource = null;
        return;
      }
      lastScrollSource = 'timeline';
      leftPanel.scrollTop = timeline.scrollTop;
    };

    leftPanel.addEventListener('scroll', handleLeftScroll, { passive: true });
    timeline.addEventListener('scroll', handleTimelineScroll, { passive: true });

    return () => {
      leftPanel.removeEventListener('scroll', handleLeftScroll);
      timeline.removeEventListener('scroll', handleTimelineScroll);
    };
  }, []);

  // Column resize handlers
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = firstColumnWidth;
  }, [firstColumnWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX.current;
      const newWidth = Math.max(MIN_FIRST_COLUMN_WIDTH, Math.min(MAX_FIRST_COLUMN_WIDTH, resizeStartWidth.current + delta));
      setFirstColumnWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      try {
        localStorage.setItem('roadmap-first-column-width', String(firstColumnWidth));
      } catch (e) {}
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, firstColumnWidth]);

  // selectedRequestId is already the database UUID (from item.id)
  // No need to fetch again - use it directly
  const selectedRequestDbId = selectedRequestId;

  // Use database items if available, fallback to API items - NO seed data fallback
  const items = useMemo(() => {
    if (dbItems && dbItems.length > 0) return dbItems;
    if (apiItems && apiItems.length > 0) return apiItems;
    return []; // Empty when no real data
  }, [dbItems, apiItems]);

  // Get unique owners
  const uniqueOwners = useMemo(() => {
    const owners = new Set(items.map(item => item.ownerEn));
    return Array.from(owners);
  }, [items]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = [...items];

    if (platform !== 'all') {
      result = result.filter(item => item.platform === platform);
    }
    if (status !== 'all') {
      result = result.filter(item => item.status === status);
    }
    if (owner !== 'all') {
      result = result.filter(item => item.ownerEn === owner);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(item =>
        item.id.toLowerCase().includes(query) ||
        item.titleEn.toLowerCase().includes(query) ||
        item.titleAr.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      let valA: any, valB: any;
      switch (sortField) {
        case 'rank':
          valA = a.rank ?? 999;
          valB = b.rank ?? 999;
          break;
        case 'platform':
          valA = a.platform;
          valB = b.platform;
          break;
        case 'owner':
          valA = isRTL ? a.ownerAr : a.ownerEn;
          valB = isRTL ? b.ownerAr : b.ownerEn;
          break;
        default:
          valA = a.rank ?? 999;
          valB = b.rank ?? 999;
      }
      const cmp = valA < valB ? -1 : valA > valB ? 1 : 0;
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [items, platform, status, owner, sortField, sortOrder, isRTL, searchQuery]);

  // Compute visible date range based on time period selection AND scale
  const visibleRange = useMemo(() => getVisibleDateRange(timePeriodSelection, timeScale), [timePeriodSelection, timeScale]);

  // Generate timeline columns based on time scale - STRICTLY controlled by scale
  const timelineColumns = useMemo(() => {
    const cols: { label: string; subLabel?: string; date: Date }[] = [];
    const monthNames = isRTL ? MONTH_NAMES_AR : MONTH_NAMES;

    const startYear = visibleRange.start.getFullYear();
    const endYear = visibleRange.end.getFullYear();
    const startMonth = visibleRange.start.getMonth();
    const endMonth = visibleRange.end.getMonth();

    // YEARLY: Only show years
    if (timeScale === 'yearly') {
      for (let year = startYear; year <= endYear; year++) {
        cols.push({ label: String(year), date: new Date(year, 0, 1) });
      }
    }
    // QUARTERLY: Only show quarters (no months!)
    else if (timeScale === 'quarterly') {
      for (let year = startYear; year <= endYear; year++) {
        const qStart = year === startYear ? Math.floor(startMonth / 3) : 0;
        const qEnd = year === endYear ? Math.floor(endMonth / 3) : 3;
        for (let q = qStart; q <= qEnd; q++) {
          cols.push({
            label: `Q${q + 1}`,
            subLabel: String(year),
            date: new Date(year, q * 3, 1)
          });
        }
      }
    }
    // MONTHLY: Only show months (no quarters!)
    else if (timeScale === 'monthly') {
      for (let year = startYear; year <= endYear; year++) {
        const mStart = year === startYear ? startMonth : 0;
        const mEnd = year === endYear ? endMonth : 11;
        for (let m = mStart; m <= mEnd; m++) {
          cols.push({
            label: monthNames[m],
            subLabel: String(year),
            date: new Date(year, m, 1)
          });
        }
      }
    }
    // WEEKLY: Only show weeks
    else if (timeScale === 'weekly') {
      const weekStart = new Date(visibleRange.start);
      let weekNum = 1;
      while (weekStart <= visibleRange.end) {
        cols.push({
          label: isRTL ? `أ${weekNum}` : `W${weekNum}`,
          subLabel: weekStart.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', year: '2-digit' }),
          date: new Date(weekStart)
        });
        weekStart.setDate(weekStart.getDate() + 7);
        weekNum++;
      }
    }

    return cols;
  }, [timeScale, isRTL, visibleRange]);

  // Calculate today line position - uses todayKey to trigger recalculation when day changes
  const todayPosition = useMemo(() => {
    // todayKey dependency ensures recalculation when day changes
    const today = new Date();
    if (today < visibleRange.start || today > visibleRange.end) return null;
    const totalDays = (visibleRange.end.getTime() - visibleRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceStart = (today.getTime() - visibleRange.start.getTime()) / (1000 * 60 * 60 * 24);
    return (daysSinceStart / totalDays) * 100;
  }, [visibleRange, todayKey]);

  // Calculate bar position with continuation indicators
  const getBarPosition = useCallback((item: BusinessRequestRoadmapItem) => {
    const itemStart = new Date(item.startDate);
    const itemEnd = new Date(item.endDate);

    if (itemEnd < visibleRange.start || itemStart > visibleRange.end) return null;

    const continuesLeft = itemStart < visibleRange.start;
    const continuesRight = itemEnd > visibleRange.end;
    const clippedStart = continuesLeft ? visibleRange.start : itemStart;
    const clippedEnd = continuesRight ? visibleRange.end : itemEnd;

    const totalDays = (visibleRange.end.getTime() - visibleRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const startOffset = (clippedStart.getTime() - visibleRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const endOffset = (clippedEnd.getTime() - visibleRange.start.getTime()) / (1000 * 60 * 60 * 24);

    const left = (startOffset / totalDays) * 100;
    const width = ((endOffset - startOffset) / totalDays) * 100;

    return {
      left: `${left}%`,
      width: `${Math.max(width, 3)}%`,
      continuesLeft,
      continuesRight,
      originalStart: itemStart,
      originalEnd: itemEnd
    };
  }, [visibleRange]);

  // Get milestone position within bar
  const getMilestonePosition = useCallback((milestoneDate: string, startDate: string, endDate: string) => {
    const milestone = new Date(milestoneDate);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = end.getTime() - start.getTime();
    const offset = milestone.getTime() - start.getTime();
    return Math.min(100, Math.max(0, (offset / duration) * 100));
  }, []);

  // Toggle year selection
  const toggleYear = (year: number) => {
    setTimePeriodSelection(prev => {
      const newYears = prev.years.includes(year)
        ? prev.years.filter(y => y !== year)
        : [...prev.years, year];
      return { ...prev, years: newYears.length > 0 ? newYears : [currentYear] };
    });
  };

  // Toggle month selection
  const toggleMonth = (month: number) => {
    setTimePeriodSelection(prev => {
      const newMonths = prev.months.includes(month)
        ? prev.months.filter(m => m !== month)
        : [...prev.months, month];
      return { ...prev, months: newMonths };
    });
  };

  // Toggle quarter selection
  const toggleQuarter = (quarter: number) => {
    setTimePeriodSelection(prev => {
      const newQuarters = prev.quarters.includes(quarter)
        ? prev.quarters.filter(q => q !== quarter)
        : [...prev.quarters, quarter];
      return { ...prev, quarters: newQuarters };
    });
  };

  // Toggle week selection
  const toggleWeek = (week: number) => {
    setTimePeriodSelection(prev => {
      const newWeeks = prev.weeks.includes(week)
        ? prev.weeks.filter(w => w !== week)
        : [...prev.weeks, week];
      return { ...prev, weeks: newWeeks };
    });
  };

  // Select weekly month (for filtering weeks in weekly view)
  const selectWeeklyMonth = (month: number) => {
    setTimePeriodSelection(prev => ({
      ...prev,
      weeklyMonth: prev.weeklyMonth === month ? null : month,
      weeks: [] // Clear weeks when month changes
    }));
  };

  // Select all / clear months
  const toggleAllMonths = () => {
    setTimePeriodSelection(prev => ({
      ...prev,
      months: prev.months.length === 12 ? [] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    }));
  };

  // Select all / clear quarters
  const toggleAllQuarters = () => {
    setTimePeriodSelection(prev => ({
      ...prev,
      quarters: prev.quarters.length === 4 ? [] : [0, 1, 2, 3]
    }));
  };

  // Get available weeks for the selected monthly context in weekly view
  const availableWeeksForSelectedMonth = useMemo(() => {
    if (timeScale !== 'weekly' || timePeriodSelection.weeklyMonth === null) {
      return [];
    }
    const selectedYear = timePeriodSelection.years[0] || currentYear;
    return getWeeksForMonth(selectedYear, timePeriodSelection.weeklyMonth);
  }, [timeScale, timePeriodSelection.weeklyMonth, timePeriodSelection.years]);

  // Select all / clear weeks for selected month
  const toggleAllWeeksInMonth = () => {
    setTimePeriodSelection(prev => {
      const allWeekNumbers = availableWeeksForSelectedMonth.map(w => w.week);
      const allSelected = allWeekNumbers.every(w => prev.weeks.includes(w));
      return {
        ...prev,
        weeks: allSelected ? [] : allWeekNumbers
      };
    });
  };

  const handleExport = () => window.print();
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  // Get column width based on scale
  const getColumnMinWidth = () => {
    switch (timeScale) {
      case 'weekly': return 70;
      case 'monthly': return 90;
      case 'quarterly': return 140;
      case 'yearly': return 200;
      default: return 90;
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col overflow-hidden print:bg-white",
        isRTL && "direction-rtl",
        isFullscreen ? "fixed inset-0 z-50" : "h-full",
        className
      )}
      style={{
        direction: isRTL ? 'rtl' : 'ltr',
        fontFamily: 'var(--cp-font-body)',
        backgroundColor: 'hsl(var(--roadmap-ivory))'
      }}
    >
      {/* Print Header */}
      <div className="hidden print:flex items-center justify-between px-6 py-4 border-b bg-white" style={{ borderColor: 'hsl(var(--roadmap-sandstone))' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-primary-foreground font-bold text-sm bg-gradient-to-br from-primary to-primary/70">
            MIM
          </div>
          <div>
            <div className="text-xs font-medium tracking-wider" style={{ color: 'hsl(var(--roadmap-status-new))' }}>EXECUTIVE ROADMAP</div>
            <div className="text-sm font-semibold" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>Industry Requests Portfolio</div>
          </div>
        </div>
      </div>

      {/* Toolbar Row */}
      <RoadmapToolbar
        language={language}
        setLanguage={setLanguage}
        timeScale={timeScale}
        setTimeScale={setTimeScale}
        timePeriodSelection={timePeriodSelection}
        showMilestones={showMilestones}
        setShowMilestones={setShowMilestones}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        showLegend={showLegend}
        setShowLegend={setShowLegend}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchInputRef={searchInputRef}
        isRTL={isRTL}
        setFiltersDialogOpen={setFiltersDialogOpen}
        handleExport={handleExport}
        toggleYear={toggleYear}
        toggleMonth={toggleMonth}
        toggleQuarter={toggleQuarter}
        toggleWeek={toggleWeek}
        selectWeeklyMonth={selectWeeklyMonth}
        toggleAllMonths={toggleAllMonths}
        toggleAllQuarters={toggleAllQuarters}
        toggleAllWeeksInMonth={toggleAllWeeksInMonth}
        availableWeeksForSelectedMonth={availableWeeksForSelectedMonth}
      />

      {/* Main Content Area - Sticky Left Panel + Scrollable Timeline */}
      <div
        className="flex-1 flex overflow-hidden print:overflow-visible"
        style={{ borderTop: '1px solid var(--divider)' }}
      >
        {/* STICKY LEFT PANEL */}
        <RoadmapLeftPanel
          leftPanelRef={leftPanelRef}
          firstColumnWidth={firstColumnWidth}
          filteredItems={filteredItems}
          selectedRow={selectedRow}
          setSelectedRow={setSelectedRow}
          hoveredItem={hoveredItem}
          setHoveredItem={setHoveredItem}
          setSelectedRequestId={setSelectedRequestId}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          isRTL={isRTL}
          isResizing={isResizing}
          handleResizeMouseDown={handleResizeMouseDown}
          t={{ businessRequest: t.businessRequest, rank: t.rank }}
        />

        {/* SCROLLABLE TIMELINE PANEL */}
        <RoadmapTimelinePanel
          timelineScrollRef={timelineScrollRef}
          filteredItems={filteredItems}
          timelineColumns={timelineColumns}
          getColumnMinWidth={getColumnMinWidth}
          getBarPosition={getBarPosition}
          getMilestonePosition={getMilestonePosition}
          todayPosition={todayPosition}
          visibleRange={visibleRange}
          selectedRow={selectedRow}
          hoveredItem={hoveredItem}
          setHoveredItem={setHoveredItem}
          setSelectedRequestId={setSelectedRequestId}
          showMilestones={showMilestones}
          isRTL={isRTL}
        />
      </div>

      {/* Legend */}
      <RoadmapLegend isVisible={showLegend} onToggle={() => setShowLegend(!showLegend)} isRTL={isRTL} />

      {/* Print Styles */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background: white !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          @page { size: A3 landscape; margin: 1cm; }
        }
      `}</style>

      {/* Filters Dialog */}
      <RoadmapFiltersDialog
        open={filtersDialogOpen}
        onOpenChange={setFiltersDialogOpen}
        filters={{ platform, status, owner, sortField, showMilestones }}
        onFiltersChange={(newFilters: RoadmapFilters) => {
          if (newFilters.platform) setPlatform(newFilters.platform);
          if (newFilters.status) setStatus(newFilters.status);
          if (newFilters.owner) setOwner(newFilters.owner);
          if (newFilters.sortField) setSortField(newFilters.sortField as SortField);
          if (newFilters.showMilestones !== undefined) setShowMilestones(newFilters.showMilestones);
        }}
        uniqueOwners={uniqueOwners}
      />

      {/* Business Request Detail Modal */}
      <CatalystViewBusinessRequestV2
        isOpen={!!selectedRequestId && !!selectedRequestDbId}
        onClose={() => setSelectedRequestId(null)}
        requestId={selectedRequestDbId || null}
      />
    </div>
  );
}

export default ExecutiveRoadmap;
