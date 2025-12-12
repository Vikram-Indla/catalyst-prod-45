// RoadmapEngine - Generic, config-driven roadmap visualization component
// This engine handles all shared roadmap logic and delegates entity-specific behavior to config

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  ChevronUp, 
  ChevronDown, 
  Maximize2, 
  Minimize2, 
  Download, 
  Lock,
  Filter,
  Clock,
  Calendar,
  Check,
  Info,
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RoadmapFiltersDialog, RoadmapFilters } from '@/components/executive-roadmap/RoadmapFiltersDialog';
import { RoadmapLegend } from '@/components/executive-roadmap/RoadmapLegend';
import { RoadmapConfig, RoadmapItem, TimeScale, Language, SortField, SortOrder } from '@/config/roadmaps/types';

// Constants
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const QUARTER_NAMES = ['Q1', 'Q2', 'Q3', 'Q4'];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth();
const AVAILABLE_YEARS = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

const MIN_FIRST_COLUMN_WIDTH = 280;
const MAX_FIRST_COLUMN_WIDTH = 420;
const DEFAULT_FIRST_COLUMN_WIDTH = 340;
const ROW_HEIGHT = 76;
const HEADER_HEIGHT = 52;

// Time period selection
interface TimePeriodSelection {
  years: number[];
  months: number[];
  quarters: number[];
  weeks: number[];
  weeklyMonth: number | null;
}

// Helper to get weeks for a specific month in a year
function getWeeksForMonth(year: number, month: number): { week: number; startDate: Date; label: string }[] {
  const weeks: { week: number; startDate: Date; label: string }[] = [];
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayOfYear = new Date(year, 0, 1);
  let currentDate = new Date(firstDayOfMonth);
  const dayOfWeek = currentDate.getDay();
  currentDate.setDate(currentDate.getDate() - dayOfWeek);
  
  while (currentDate <= lastDayOfMonth) {
    const daysSinceYearStart = Math.floor((currentDate.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNum = Math.ceil((daysSinceYearStart + firstDayOfYear.getDay() + 1) / 7);
    const weekEnd = new Date(currentDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    if (weekEnd >= firstDayOfMonth && currentDate <= lastDayOfMonth) {
      weeks.push({ week: weekNum, startDate: new Date(currentDate), label: `W${weekNum}` });
    }
    currentDate.setDate(currentDate.getDate() + 7);
  }
  return weeks;
}

// Compute visible date range based on selection AND scale
function getVisibleDateRange(selection: TimePeriodSelection, scale: TimeScale): { start: Date; end: Date } {
  const sortedYears = selection.years.length > 0 ? [...selection.years].sort((a, b) => a - b) : [currentYear];
  const startYear = sortedYears[0];
  const endYear = sortedYears[sortedYears.length - 1];

  if (scale === 'yearly') {
    return { start: new Date(startYear, 0, 1), end: new Date(endYear, 11, 31) };
  }

  if (scale === 'quarterly') {
    const sortedQuarters = selection.quarters.length > 0 ? [...selection.quarters].sort((a, b) => a - b) : [0, 1, 2, 3];
    const startQ = sortedQuarters[0];
    const endQ = sortedQuarters[sortedQuarters.length - 1];
    return { start: new Date(startYear, startQ * 3, 1), end: new Date(endYear, endQ * 3 + 3, 0) };
  }

  if (scale === 'weekly') {
    if (selection.weeklyMonth !== null) {
      const month = selection.weeklyMonth;
      const weeksInMonth = getWeeksForMonth(startYear, month);
      
      if (selection.weeks.length > 0 && weeksInMonth.length > 0) {
        const selectedWeeksInMonth = weeksInMonth.filter(w => selection.weeks.includes(w.week));
        if (selectedWeeksInMonth.length > 0) {
          const firstWeek = selectedWeeksInMonth[0];
          const lastWeek = selectedWeeksInMonth[selectedWeeksInMonth.length - 1];
          const endDate = new Date(lastWeek.startDate);
          endDate.setDate(endDate.getDate() + 6);
          return { start: firstWeek.startDate, end: endDate };
        }
      }
      
      if (weeksInMonth.length > 0) {
        const firstWeek = weeksInMonth[0];
        const lastWeek = weeksInMonth[weeksInMonth.length - 1];
        const endDate = new Date(lastWeek.startDate);
        endDate.setDate(endDate.getDate() + 6);
        return { start: firstWeek.startDate, end: endDate };
      }
    }
    
    const weeksInCurrentMonth = getWeeksForMonth(startYear, currentMonth);
    if (weeksInCurrentMonth.length > 0) {
      const firstWeek = weeksInCurrentMonth[0];
      const lastWeek = weeksInCurrentMonth[weeksInCurrentMonth.length - 1];
      const endDate = new Date(lastWeek.startDate);
      endDate.setDate(endDate.getDate() + 6);
      return { start: firstWeek.startDate, end: endDate };
    }
    return { start: new Date(startYear, currentMonth, 1), end: new Date(startYear, currentMonth + 1, 0) };
  }

  // Monthly
  const sortedMonths = selection.months.length > 0 ? [...selection.months].sort((a, b) => a - b) : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const startMonth = sortedMonths[0];
  const endMonth = sortedMonths[sortedMonths.length - 1];
  return { start: new Date(startYear, startMonth, 1), end: new Date(endYear, endMonth + 1, 0) };
}

interface RoadmapEngineProps {
  config: RoadmapConfig;
  items: RoadmapItem[];
  isLoading?: boolean;
  className?: string;
  onItemClick?: (id: string) => void;
}

export function RoadmapEngine({ config, items, isLoading, className, onItemClick }: RoadmapEngineProps) {
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

  const t = config.translations[language];
  const isRTL = language === 'ar';

  // Sync vertical scroll between left panel and timeline
  useEffect(() => {
    const leftPanel = leftPanelRef.current;
    const timeline = timelineScrollRef.current;
    if (!leftPanel || !timeline) return;

    let lastScrollSource: 'left' | 'timeline' | null = null;
    
    const handleLeftScroll = () => {
      if (lastScrollSource === 'timeline') { lastScrollSource = null; return; }
      lastScrollSource = 'left';
      timeline.scrollTop = leftPanel.scrollTop;
    };

    const handleTimelineScroll = () => {
      if (lastScrollSource === 'left') { lastScrollSource = null; return; }
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
      try { localStorage.setItem('roadmap-first-column-width', String(firstColumnWidth)); } catch (e) {}
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

  // Compute visible date range
  const visibleRange = useMemo(() => getVisibleDateRange(timePeriodSelection, timeScale), [timePeriodSelection, timeScale]);

  // Generate timeline columns
  const timelineColumns = useMemo(() => {
    const cols: { label: string; subLabel?: string; date: Date }[] = [];
    const monthNames = isRTL ? MONTH_NAMES_AR : MONTH_NAMES;
    const startYear = visibleRange.start.getFullYear();
    const endYear = visibleRange.end.getFullYear();
    const startMonth = visibleRange.start.getMonth();
    const endMonth = visibleRange.end.getMonth();

    if (timeScale === 'yearly') {
      for (let year = startYear; year <= endYear; year++) {
        cols.push({ label: String(year), date: new Date(year, 0, 1) });
      }
    } else if (timeScale === 'quarterly') {
      for (let year = startYear; year <= endYear; year++) {
        const qStart = year === startYear ? Math.floor(startMonth / 3) : 0;
        const qEnd = year === endYear ? Math.floor(endMonth / 3) : 3;
        for (let q = qStart; q <= qEnd; q++) {
          cols.push({ label: `Q${q + 1}`, subLabel: String(year), date: new Date(year, q * 3, 1) });
        }
      }
    } else if (timeScale === 'monthly') {
      for (let year = startYear; year <= endYear; year++) {
        const mStart = year === startYear ? startMonth : 0;
        const mEnd = year === endYear ? endMonth : 11;
        for (let m = mStart; m <= mEnd; m++) {
          cols.push({ label: monthNames[m], subLabel: String(year), date: new Date(year, m, 1) });
        }
      }
    } else if (timeScale === 'weekly') {
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

  // Calculate today line position
  const getTodayPosition = useCallback(() => {
    const today = new Date();
    if (today < visibleRange.start || today > visibleRange.end) return null;
    const totalDays = (visibleRange.end.getTime() - visibleRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceStart = (today.getTime() - visibleRange.start.getTime()) / (1000 * 60 * 60 * 24);
    return (daysSinceStart / totalDays) * 100;
  }, [visibleRange]);

  const todayPosition = getTodayPosition();

  // Calculate bar position
  const getBarPosition = useCallback((item: RoadmapItem) => {
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

  // Time period toggles
  const toggleYear = (year: number) => {
    setTimePeriodSelection(prev => {
      const newYears = prev.years.includes(year) ? prev.years.filter(y => y !== year) : [...prev.years, year];
      return { ...prev, years: newYears.length > 0 ? newYears : [currentYear] };
    });
  };

  const toggleMonth = (month: number) => {
    setTimePeriodSelection(prev => {
      const newMonths = prev.months.includes(month) ? prev.months.filter(m => m !== month) : [...prev.months, month];
      return { ...prev, months: newMonths };
    });
  };

  const toggleQuarter = (quarter: number) => {
    setTimePeriodSelection(prev => {
      const newQuarters = prev.quarters.includes(quarter) ? prev.quarters.filter(q => q !== quarter) : [...prev.quarters, quarter];
      return { ...prev, quarters: newQuarters };
    });
  };

  const toggleWeek = (week: number) => {
    setTimePeriodSelection(prev => {
      const newWeeks = prev.weeks.includes(week) ? prev.weeks.filter(w => w !== week) : [...prev.weeks, week];
      return { ...prev, weeks: newWeeks };
    });
  };

  const selectWeeklyMonth = (month: number) => {
    setTimePeriodSelection(prev => ({ ...prev, weeklyMonth: prev.weeklyMonth === month ? null : month, weeks: [] }));
  };

  const toggleAllMonths = () => {
    setTimePeriodSelection(prev => ({ ...prev, months: prev.months.length === 12 ? [] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }));
  };

  const toggleAllQuarters = () => {
    setTimePeriodSelection(prev => ({ ...prev, quarters: prev.quarters.length === 4 ? [] : [0, 1, 2, 3] }));
  };

  const availableWeeksForSelectedMonth = useMemo(() => {
    if (timeScale !== 'weekly' || timePeriodSelection.weeklyMonth === null) return [];
    const selectedYear = timePeriodSelection.years[0] || currentYear;
    return getWeeksForMonth(selectedYear, timePeriodSelection.weeklyMonth);
  }, [timeScale, timePeriodSelection.weeklyMonth, timePeriodSelection.years]);

  const toggleAllWeeksInMonth = () => {
    setTimePeriodSelection(prev => {
      const allWeekNumbers = availableWeeksForSelectedMonth.map(w => w.week);
      const allSelected = allWeekNumbers.every(w => prev.weeks.includes(w));
      return { ...prev, weeks: allSelected ? [] : allWeekNumbers };
    });
  };

  const handleExport = () => window.print();
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  const getColumnMinWidth = () => {
    switch (timeScale) {
      case 'weekly': return 70;
      case 'monthly': return 90;
      case 'quarterly': return 140;
      case 'yearly': return 200;
      default: return 90;
    }
  };

  // Get status gradient from config
  const getStatusGradient = (statusKey: string) => {
    return config.statusColors[statusKey]?.gradient || 'linear-gradient(90deg, #C69C6D, #E8D5C0)';
  };

  // Get status label from config
  const getStatusLabel = (statusKey: string) => {
    const statusConfig = config.statusColors[statusKey];
    return isRTL ? statusConfig?.labelAr || statusKey : statusConfig?.label || statusKey;
  };

  // Get platform name from config - returns empty string if platform is a UUID (for Epic/Theme roadmaps)
  const getPlatformName = (platformKey: string) => {
    // Skip UUIDs (theme_id, snapshot_id used for lane grouping)
    if (platformKey && platformKey.match(/^[0-9a-f]{8}-[0-9a-f]{4}-/i)) {
      return '';
    }
    const platformConfig = config.platforms[platformKey];
    return isRTL ? platformConfig?.nameAr || platformKey : platformConfig?.name || platformKey;
  };

  // Format short date labels
  const formatShortDate = (date: Date) => {
    const day = date.getDate();
    const monthShort = isRTL ? MONTH_NAMES_AR[date.getMonth()].slice(0, 3) : MONTH_NAMES[date.getMonth()];
    return `${day} ${monthShort}`;
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
        fontFamily: 'Inter, sans-serif',
        backgroundColor: 'hsl(var(--roadmap-ivory))'
      }}
    >
      {/* Print Header */}
      <div className="hidden print:flex items-center justify-between px-6 py-4 border-b bg-white" style={{ borderColor: 'hsl(var(--roadmap-sandstone))' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white font-bold text-sm" style={{ background: config.header.iconGradient }}>
            {config.header.icon}
          </div>
          <div>
            <div className="text-xs font-medium tracking-wider" style={{ color: 'hsl(var(--roadmap-status-new))' }}>{t.roadmapTitle}</div>
            <div className="text-sm font-semibold" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>{t.roadmapSubtitle}</div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div 
        className="h-[72px] flex items-center justify-between px-4 sm:px-6 border-b print:hidden shrink-0 relative z-[100]"
        style={{ backgroundColor: 'white', borderColor: 'hsl(var(--roadmap-sandstone))' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white font-bold text-sm shadow-sm" style={{ background: config.header.iconGradient }}>
            {config.header.icon}
          </div>
          <div>
            <div className="text-xs font-medium tracking-wider" style={{ color: 'hsl(var(--roadmap-status-new))' }}>{t.roadmapTitle}</div>
            <div className="text-base font-semibold" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>{t.roadmapSubtitle}</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="inline-flex items-center gap-1.5 relative z-[100]" style={{ direction: 'ltr' }}>
          {/* Search */}
          <div className="flex items-center">
            {isSearchExpanded && (
              <div className="overflow-hidden transition-all duration-300 ease-out mr-1.5" style={{ width: '180px' }}>
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder={isRTL ? 'بحث...' : 'Search ID or title...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 text-xs bg-white px-3"
                  style={{ border: '1px solid hsl(var(--roadmap-sandstone))', borderRadius: '10px' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearchQuery('');
                      setIsSearchExpanded(false);
                    }
                  }}
                />
              </div>
            )}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      if (isSearchExpanded && searchQuery) setSearchQuery('');
                      setIsSearchExpanded(!isSearchExpanded);
                      if (!isSearchExpanded) setTimeout(() => searchInputRef.current?.focus(), 100);
                    }}
                    className={cn(
                      "w-9 h-9 flex items-center justify-center rounded-[10px] cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md",
                      isSearchExpanded ? "text-white" : "bg-white text-[hsl(var(--roadmap-charcoal))]"
                    )}
                    style={{ 
                      backgroundColor: isSearchExpanded ? 'hsl(var(--roadmap-status-new))' : undefined,
                      border: isSearchExpanded ? 'none' : '1px solid hsl(var(--roadmap-sandstone))'
                    }}
                  >
                    <Search className="w-[18px] h-[18px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Search</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Milestones Toggle */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowMilestones(!showMilestones)}
                  className={cn(
                    "w-9 h-9 flex items-center justify-center rounded-[10px] cursor-pointer transition-all shadow-sm hover:shadow-md",
                    showMilestones ? "text-white" : "bg-white text-[hsl(var(--roadmap-charcoal))]"
                  )}
                  style={{ 
                    backgroundColor: showMilestones ? 'hsl(var(--roadmap-status-new))' : undefined,
                    border: showMilestones ? 'none' : '1px solid hsl(var(--roadmap-sandstone))'
                  }}
                >
                  <Clock className="w-[18px] h-[18px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Milestones</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="w-px h-6 mx-1" style={{ backgroundColor: 'hsl(var(--roadmap-driftwood))' }} />

          {/* Filter */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setFiltersDialogOpen(true)}
                  className="w-9 h-9 flex items-center justify-center rounded-[10px] cursor-pointer transition-all bg-white shadow-sm hover:shadow-md"
                  style={{ border: '1px solid hsl(var(--roadmap-sandstone))', color: 'hsl(var(--roadmap-charcoal))' }}
                >
                  <Filter className="w-[18px] h-[18px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Filters</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Time Period Selector */}
          <Popover>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      className="w-9 h-9 flex items-center justify-center rounded-[10px] cursor-pointer transition-all bg-white shadow-sm hover:shadow-md"
                      style={{ border: '1px solid hsl(var(--roadmap-sandstone))', color: 'hsl(var(--roadmap-charcoal))' }}
                    >
                      <Calendar className="w-[18px] h-[18px]" />
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Time Period</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <PopoverContent 
              align="end" 
              className="w-[360px] p-0 bg-white shadow-xl rounded-xl z-[400]"
              style={{ border: '1px solid hsl(var(--roadmap-sandstone))' }}
            >
              {/* View Scale Section */}
              <div className="p-4 border-b" style={{ borderColor: 'hsl(var(--roadmap-sandstone))' }}>
                <div className="text-xs font-semibold mb-3" style={{ color: 'hsl(var(--roadmap-graphite))' }}>
                  {t.viewScale || 'View Scale'}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['weekly', 'monthly', 'quarterly', 'yearly'] as TimeScale[]).map((scale) => (
                    <button
                      key={scale}
                      onClick={() => setTimeScale(scale)}
                      className={cn(
                        "px-2 py-2.5 text-xs font-medium rounded-lg transition-all",
                        timeScale === scale 
                          ? "text-white" 
                          : "bg-[hsl(var(--roadmap-parchment))] hover:bg-[hsl(var(--roadmap-sandstone))]"
                      )}
                      style={{ 
                        backgroundColor: timeScale === scale ? 'hsl(var(--roadmap-status-new))' : undefined,
                        color: timeScale === scale ? 'white' : 'hsl(var(--roadmap-charcoal))'
                      }}
                    >
                      {t[scale] || scale}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year Selection */}
              <div className="p-4 border-b" style={{ borderColor: 'hsl(var(--roadmap-sandstone))' }}>
                <div className="text-xs font-semibold mb-3" style={{ color: 'hsl(var(--roadmap-graphite))' }}>
                  {t.selectYears || 'Select Years'}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {AVAILABLE_YEARS.map(year => (
                    <button
                      key={year}
                      onClick={() => toggleYear(year)}
                      className={cn(
                        "px-2 py-2 text-xs font-medium rounded-lg transition-all",
                        timePeriodSelection.years.includes(year)
                          ? "text-white"
                          : "bg-[hsl(var(--roadmap-parchment))] hover:bg-[hsl(var(--roadmap-sandstone))]"
                      )}
                      style={{
                        backgroundColor: timePeriodSelection.years.includes(year) ? 'hsl(var(--roadmap-status-new))' : undefined,
                        color: timePeriodSelection.years.includes(year) ? 'white' : 'hsl(var(--roadmap-charcoal))'
                      }}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>

              {/* Monthly Scale: Show Months */}
              {timeScale === 'monthly' && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-semibold" style={{ color: 'hsl(var(--roadmap-graphite))' }}>
                      {t.selectMonths || 'Select Months'}
                    </div>
                    <button onClick={toggleAllMonths} className="text-xs font-medium hover:underline" style={{ color: 'hsl(var(--roadmap-status-new))' }}>
                      {timePeriodSelection.months.length === 12 ? 'Clear' : t.allMonths || 'All'}
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {MONTH_NAMES.map((month, i) => (
                      <button
                        key={i}
                        onClick={() => toggleMonth(i)}
                        className={cn(
                          "px-2 py-2 text-xs font-medium rounded-lg transition-all",
                          timePeriodSelection.months.includes(i) ? "text-white" : "bg-[hsl(var(--roadmap-parchment))] hover:bg-[hsl(var(--roadmap-sandstone))]"
                        )}
                        style={{
                          backgroundColor: timePeriodSelection.months.includes(i) ? 'hsl(var(--roadmap-status-new))' : undefined,
                          color: timePeriodSelection.months.includes(i) ? 'white' : 'hsl(var(--roadmap-charcoal))'
                        }}
                      >
                        {isRTL ? MONTH_NAMES_AR[i] : month}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quarterly Scale: Show Quarters */}
              {timeScale === 'quarterly' && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-semibold" style={{ color: 'hsl(var(--roadmap-graphite))' }}>
                      {t.selectQuarters || 'Select Quarters'}
                    </div>
                    <button onClick={toggleAllQuarters} className="text-xs font-medium hover:underline" style={{ color: 'hsl(var(--roadmap-status-new))' }}>
                      {timePeriodSelection.quarters.length === 4 ? 'Clear' : t.allQuarters || 'All'}
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {QUARTER_NAMES.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => toggleQuarter(i)}
                        className={cn(
                          "px-2 py-2 text-xs font-medium rounded-lg transition-all",
                          timePeriodSelection.quarters.includes(i) ? "text-white" : "bg-[hsl(var(--roadmap-parchment))] hover:bg-[hsl(var(--roadmap-sandstone))]"
                        )}
                        style={{
                          backgroundColor: timePeriodSelection.quarters.includes(i) ? 'hsl(var(--roadmap-status-new))' : undefined,
                          color: timePeriodSelection.quarters.includes(i) ? 'white' : 'hsl(var(--roadmap-charcoal))'
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Weekly Scale: Show Month selector then weeks */}
              {timeScale === 'weekly' && (
                <div className="p-4">
                  <div className="text-xs font-semibold mb-3" style={{ color: 'hsl(var(--roadmap-graphite))' }}>
                    Select Month
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 mb-4">
                    {MONTH_NAMES.map((month, i) => (
                      <button
                        key={i}
                        onClick={() => selectWeeklyMonth(i)}
                        className={cn(
                          "px-2 py-2 text-xs font-medium rounded-lg transition-all",
                          timePeriodSelection.weeklyMonth === i ? "text-white" : "bg-[hsl(var(--roadmap-parchment))] hover:bg-[hsl(var(--roadmap-sandstone))]"
                        )}
                        style={{
                          backgroundColor: timePeriodSelection.weeklyMonth === i ? 'hsl(var(--roadmap-status-new))' : undefined,
                          color: timePeriodSelection.weeklyMonth === i ? 'white' : 'hsl(var(--roadmap-charcoal))'
                        }}
                      >
                        {isRTL ? MONTH_NAMES_AR[i] : month}
                      </button>
                    ))}
                  </div>

                  {timePeriodSelection.weeklyMonth !== null && availableWeeksForSelectedMonth.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-semibold" style={{ color: 'hsl(var(--roadmap-graphite))' }}>
                          {t.selectWeeks || 'Select Weeks'}
                        </div>
                        <button onClick={toggleAllWeeksInMonth} className="text-xs font-medium hover:underline" style={{ color: 'hsl(var(--roadmap-status-new))' }}>
                          {timePeriodSelection.weeks.length === availableWeeksForSelectedMonth.length ? 'Clear' : t.allWeeks || 'All'}
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {availableWeeksForSelectedMonth.map((weekInfo) => {
                          const isSelected = timePeriodSelection.weeks.includes(weekInfo.week);
                          return (
                            <button
                              key={weekInfo.week}
                              onClick={() => toggleWeek(weekInfo.week)}
                              className={cn(
                                "px-2 py-2 text-xs font-medium rounded-lg transition-all",
                                isSelected ? "text-white" : "bg-[hsl(var(--roadmap-parchment))] hover:bg-[hsl(var(--roadmap-sandstone))]"
                              )}
                              style={{
                                backgroundColor: isSelected ? 'hsl(var(--roadmap-status-new))' : undefined,
                                color: isSelected ? 'white' : 'hsl(var(--roadmap-fossil))'
                              }}
                            >
                              {weekInfo.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {timePeriodSelection.weeklyMonth === null && (
                    <div className="text-xs text-center py-2" style={{ color: 'hsl(var(--roadmap-fossil))' }}>
                      Select a month to view its weeks
                    </div>
                  )}
                </div>
              )}

              {/* Yearly Scale */}
              {timeScale === 'yearly' && (
                <div className="p-4">
                  <div className="text-xs text-center py-4" style={{ color: 'hsl(var(--roadmap-fossil))' }}>
                    Showing selected year(s) only
                  </div>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="h-9 px-2 flex items-center gap-1 rounded-[10px] cursor-pointer transition-all bg-white shadow-sm hover:shadow-md"
            style={{ border: '1px solid hsl(var(--roadmap-sandstone))' }}
          >
            <span className={cn("text-xs font-semibold px-1 py-0.5 rounded", language === 'en' ? "text-white" : "")} style={{ backgroundColor: language === 'en' ? 'hsl(var(--roadmap-status-new))' : 'transparent', color: language === 'en' ? 'white' : 'hsl(var(--roadmap-charcoal))' }}>EN</span>
            <span className={cn("text-xs font-semibold px-1 py-0.5 rounded", language === 'ar' ? "text-white" : "")} style={{ backgroundColor: language === 'ar' ? 'hsl(var(--roadmap-status-new))' : 'transparent', color: language === 'ar' ? 'white' : 'hsl(var(--roadmap-charcoal))' }}>ع</span>
          </button>

          <div className="w-px h-6 mx-1" style={{ backgroundColor: 'hsl(var(--roadmap-driftwood))' }} />

          {/* Export */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleExport}
                  className="w-9 h-9 flex items-center justify-center rounded-[10px] cursor-pointer transition-all bg-white shadow-sm hover:shadow-md"
                  style={{ border: '1px solid hsl(var(--roadmap-sandstone))', color: 'hsl(var(--roadmap-charcoal))' }}
                >
                  <Download className="w-[18px] h-[18px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Export</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Legend Toggle */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowLegend(!showLegend)}
                  className={cn(
                    "w-9 h-9 flex items-center justify-center rounded-[10px] cursor-pointer transition-all shadow-sm hover:shadow-md",
                    showLegend ? "text-white" : "bg-white text-[hsl(var(--roadmap-charcoal))]"
                  )}
                  style={{ 
                    backgroundColor: showLegend ? 'hsl(var(--roadmap-status-new))' : undefined,
                    border: showLegend ? 'none' : '1px solid hsl(var(--roadmap-sandstone))'
                  }}
                >
                  <Info className="w-[18px] h-[18px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Legend</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Fullscreen Toggle */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleFullscreen}
                  className="w-9 h-9 flex items-center justify-center rounded-[10px] cursor-pointer transition-all bg-white shadow-sm hover:shadow-md"
                  style={{ border: '1px solid hsl(var(--roadmap-sandstone))', color: 'hsl(var(--roadmap-charcoal))' }}
                >
                  {isFullscreen ? <Minimize2 className="w-[18px] h-[18px]" /> : <Maximize2 className="w-[18px] h-[18px]" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden print:overflow-visible">
        {/* Left Panel */}
        <div 
          ref={leftPanelRef}
          className="shrink-0 flex flex-col border-r overflow-y-auto overflow-x-hidden"
          style={{ 
            width: firstColumnWidth, 
            minWidth: firstColumnWidth,
            backgroundColor: 'white', 
            borderColor: 'hsl(var(--roadmap-sandstone))',
            position: 'sticky',
            left: 0,
            zIndex: 15
          }}
        >
          {/* Left Panel Header */}
          <div 
            className="flex items-center justify-between px-4 border-b relative shrink-0 sticky top-0 z-10"
            style={{ 
              backgroundColor: 'white', 
              borderColor: 'hsl(var(--roadmap-sandstone))',
              height: `${HEADER_HEIGHT}px`,
              minHeight: `${HEADER_HEIGHT}px`
            }}
          >
            <span className="text-xs font-semibold tracking-wider" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>
              {t.businessRequest}
            </span>
            <button 
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} 
              className="flex items-center gap-1 text-[10px] font-medium hover:underline"
              style={{ color: 'hsl(var(--roadmap-status-new))' }}
            >
              {sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {t.rank}
            </button>
            {/* Resize Handle */}
            <div
              className={cn("absolute right-0 top-0 h-full w-1 cursor-col-resize z-20 transition-colors hover:bg-[hsl(var(--roadmap-status-new))]", isResizing && "bg-[hsl(var(--roadmap-status-new))]")}
              onMouseDown={handleResizeMouseDown}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Left Panel Rows */}
          {filteredItems.map((item) => {
            const isSelected = selectedRow === item.id;
            return (
              <div 
                key={item.id}
                className={cn("border-b cursor-pointer transition-colors shrink-0")}
                style={{ 
                  height: `${ROW_HEIGHT}px`,
                  minHeight: `${ROW_HEIGHT}px`,
                  borderColor: 'hsl(var(--roadmap-sandstone))',
                  backgroundColor: isSelected ? 'hsla(var(--roadmap-status-new) / 0.08)' : hoveredItem === item.id ? 'hsla(var(--roadmap-status-new) / 0.04)' : 'white',
                  borderLeft: isSelected ? '3px solid hsl(var(--roadmap-status-new))' : 'none'
                }}
                onClick={() => setSelectedRow(isSelected ? null : item.id)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <div className="h-full px-4 py-2.5 flex flex-col justify-center overflow-hidden">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-bold shrink-0" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>#{item.rank}</span>
                    {(item.rank === 1 || item.rank === 3 || item.rank === 9) && (
                      <Lock className="h-3 w-3 shrink-0" style={{ color: 'hsl(var(--roadmap-status-new))' }} />
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); onItemClick?.(item.id); }}
                      className="text-xs font-medium hover:underline cursor-pointer bg-transparent border-none p-0 shrink-0"
                      style={{ color: 'hsl(var(--roadmap-status-new))' }}
                    >
                      {item.key || item.id.slice(0, 8)}
                    </button>
                  </div>
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-sm font-medium truncate leading-tight mt-1 cursor-default" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>
                          {isRTL ? item.titleAr : item.titleEn}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="top" 
                        align="start"
                        sideOffset={8}
                        className="max-w-[400px] px-4 py-3 text-sm leading-relaxed rounded-xl shadow-2xl z-[9999]"
                        style={{ 
                          backgroundColor: 'hsl(var(--roadmap-charcoal))',
                          color: 'white',
                          border: '1px solid hsla(35, 46%, 60%, 0.3)'
                        }}
                      >
                        <div className="font-semibold mb-1.5 text-xs uppercase tracking-wider" style={{ color: 'hsl(35, 46%, 70%)' }}>
                          {item.key || item.id.slice(0, 8)}
                        </div>
                        <div className="font-medium" style={{ color: 'white' }}>
                          {isRTL ? item.titleAr : item.titleEn}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div className="text-[11px] mt-1 truncate" style={{ color: 'hsl(var(--roadmap-fossil))' }}>
                    {isRTL ? item.ownerAr : item.ownerEn}
                    {getPlatformName(item.platform) && (
                      <>
                        <span className="mx-1.5">·</span>
                        <span style={{ color: 'hsl(var(--roadmap-status-new))' }}>{getPlatformName(item.platform)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline Panel */}
        <div ref={timelineScrollRef} className="flex-1 overflow-x-auto overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
          <div style={{ minWidth: Math.max(600, timelineColumns.length * getColumnMinWidth()) }}>
            {/* Timeline Header */}
            <div 
              className="sticky top-0 z-30 border-b"
              style={{ backgroundColor: 'white', borderColor: 'hsl(var(--roadmap-sandstone))', height: `${HEADER_HEIGHT}px`, minHeight: `${HEADER_HEIGHT}px` }}
            >
              {todayPosition !== null && (
                <div className="absolute pointer-events-none z-20" style={{ left: `${todayPosition}%`, top: '6px', transform: 'translateX(-50%)' }}>
                  <div className="px-2 py-0.5 text-[10px] font-semibold rounded-full whitespace-nowrap" style={{ backgroundColor: 'hsla(35, 46%, 60%, 0.2)', color: 'hsl(var(--roadmap-status-new))', border: '1px solid hsla(35, 46%, 60%, 0.4)' }}>
                    {isRTL ? 'اليوم' : 'Today'}
                  </div>
                </div>
              )}
              <div className="flex h-full">
                {timelineColumns.map((col, i) => (
                  <div 
                    key={i} 
                    className={cn("flex-1 px-2 text-center flex flex-col justify-center", i < timelineColumns.length - 1 && "border-r")}
                    style={{ borderColor: 'hsl(var(--roadmap-driftwood))', minWidth: getColumnMinWidth(), backgroundColor: 'white' }}
                  >
                    <div className="text-xs font-semibold" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>{col.label}</div>
                    {col.subLabel && <div className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--roadmap-fossil))' }}>{col.subLabel}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Rows */}
            {filteredItems.map((item) => {
              const barPos = getBarPosition(item);
              const isSelected = selectedRow === item.id;

              return (
                <div 
                  key={item.id}
                  className="relative border-b shrink-0"
                  style={{ 
                    height: `${ROW_HEIGHT}px`,
                    minHeight: `${ROW_HEIGHT}px`,
                    borderColor: 'hsl(var(--roadmap-sandstone))',
                    backgroundColor: isSelected ? 'hsla(var(--roadmap-status-new) / 0.08)' : hoveredItem === item.id ? 'hsla(var(--roadmap-status-new) / 0.04)' : 'white'
                  }}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {timelineColumns.map((_, i) => (
                      <div key={i} className={cn("flex-1", i < timelineColumns.length - 1 && "border-r")} style={{ borderColor: 'hsl(var(--roadmap-sandstone) / 0.4)', minWidth: getColumnMinWidth() }} />
                    ))}
                  </div>
                  
                  {/* Today line */}
                  {todayPosition !== null && (
                    <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `${todayPosition}%`, width: '1px', borderLeft: '1px dashed hsla(35, 46%, 60%, 0.6)', zIndex: 5 }} />
                  )}
                  
                  {/* Timeline Bar */}
                  {barPos && (() => {
                    const startDate = new Date(item.startDate);
                    const endDate = new Date(item.endDate);
                    const displayStartDate = barPos.continuesLeft ? visibleRange.start : startDate;
                    const displayEndDate = barPos.continuesRight ? visibleRange.end : endDate;
                    const barWidthPercent = parseFloat(barPos.width);
                    const isNarrowBar = barWidthPercent < 15;
                    const isVeryNarrowBar = barWidthPercent < 8;

                    return (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div 
                              className="absolute flex flex-col cursor-pointer"
                              style={{ left: barPos.left, width: barPos.width, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
                              onClick={(e) => { e.stopPropagation(); onItemClick?.(item.id); }}
                            >
                              {/* Labels Row */}
                              <div className={cn("mb-1 px-1 relative", isVeryNarrowBar ? "flex justify-center" : "flex justify-between items-center")} style={{ zIndex: 20 }}>
                                {isVeryNarrowBar ? (
                                  <span className="text-[9px] font-bold whitespace-nowrap" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>
                                    {formatShortDate(displayStartDate)}
                                  </span>
                                ) : isNarrowBar ? (
                                  <>
                                    <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>{formatShortDate(displayStartDate)}</span>
                                    <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>{formatShortDate(displayEndDate)}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>{formatShortDate(displayStartDate)}</span>
                                    <span className="text-[10px] font-semibold whitespace-nowrap truncate px-2 max-w-[60px]" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>{getStatusLabel(item.status)}</span>
                                    <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>{formatShortDate(displayEndDate)}</span>
                                  </>
                                )}
                              </div>

                              {/* The Bar */}
                              <div 
                                className={cn("h-5 w-full overflow-hidden transition-all hover:shadow-md", barPos.continuesLeft ? "rounded-l-none" : "rounded-l-full", barPos.continuesRight ? "rounded-r-none" : "rounded-r-full")}
                                style={{ background: getStatusGradient(item.status), position: 'relative', zIndex: 5 }}
                              >
                                {/* Milestones */}
                                {showMilestones && item.milestones.length > 0 && item.milestones.map((ms, index) => {
                                  const pos = getMilestonePosition(ms.date, item.startDate, item.endDate);
                                  const msDate = new Date(ms.date);
                                  if (msDate < displayStartDate || msDate > displayEndDate) return null;
                                  
                                  return (
                                    <div
                                      key={`${item.id}-ms-${index}`}
                                      className="absolute w-5 h-5 rounded-full border-2 flex items-center justify-center text-[8px] font-bold shadow-sm cursor-pointer hover:scale-110 transition-transform"
                                      style={{ 
                                        left: `${pos}%`, 
                                        top: '50%', 
                                        transform: 'translate(-50%, -50%)',
                                        backgroundColor: ms.state === 'complete' ? 'hsl(var(--roadmap-milestone-complete))' : 'white',
                                        borderColor: ms.state === 'complete' ? 'hsl(var(--roadmap-milestone-complete))' : ms.state === 'current' ? 'hsl(var(--roadmap-milestone-current))' : 'hsl(var(--roadmap-milestone-pending))',
                                        color: ms.state === 'complete' ? 'white' : ms.state === 'current' ? 'hsl(var(--roadmap-milestone-current))' : 'hsl(var(--roadmap-fossil))',
                                        zIndex: 15
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Call onMilestoneClick if provided (for Theme epic markers or Epic feature markers)
                                        if (config.onMilestoneClick) {
                                          const milestoneData = ms as any;
                                          config.onMilestoneClick({ 
                                            epicId: milestoneData.epicId,
                                            featureId: milestoneData.featureId,
                                            index 
                                          });
                                        }
                                      }}
                                    >
                                      {ms.state === 'complete' ? <Check className="w-2.5 h-2.5" /> : (index + 1)}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="top" 
                            align="center"
                            sideOffset={12}
                            className="max-w-[380px] px-4 py-3.5 rounded-lg shadow-2xl z-[9999]"
                            style={{ backgroundColor: 'hsl(20, 8%, 20%)', color: 'white', border: 'none' }}
                          >
                            <div className="text-xs font-medium mb-1.5" style={{ color: 'hsl(35, 30%, 65%)' }}>{item.id}</div>
                            <div className="font-medium text-sm mb-3 leading-snug" style={{ color: 'white' }}>{isRTL ? item.titleAr : item.titleEn}</div>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'hsl(35, 30%, 60%)' }}>STATUS:</span>
                              <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: 'hsla(35, 30%, 50%, 0.3)', color: 'hsl(35, 30%, 85%)' }}>{getStatusLabel(item.status)}</span>
                            </div>
                            <div className="flex items-center gap-2 py-2 px-3 rounded-md mb-3" style={{ backgroundColor: 'hsla(35, 30%, 50%, 0.15)' }}>
                              <Calendar className="w-3.5 h-3.5" style={{ color: 'hsl(35, 30%, 60%)' }} />
                              <span className="text-xs" style={{ color: 'hsl(35, 30%, 80%)' }}>{startDate.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              <span style={{ color: 'hsl(35, 30%, 50%)' }}>→</span>
                              <span className="text-xs" style={{ color: 'hsl(35, 30%, 80%)' }}>{endDate.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                            {showMilestones && item.milestones.length > 0 && (
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'hsl(35, 30%, 60%)' }}>
                                  {/* Show appropriate label based on roadmap type */}
                                  {config.workItemType === 'theme' ? `CHILD EPICS (${item.milestones.length})` : 
                                   config.workItemType === 'epic' ? `CHILD FEATURES (${item.milestones.length})` : 
                                   `MILESTONES (${item.milestones.length})`}
                                </div>
                                <div className="space-y-1.5">
                                  {item.milestones.slice(0, 5).map((ms, idx) => {
                                    const milestoneData = ms as any;
                                    const isEpicMarker = config.workItemType === 'theme' && milestoneData.epicKey;
                                    const isFeatureMarker = config.workItemType === 'epic' && milestoneData.featureId;
                                    
                                    return (
                                      <div key={idx} className="flex items-center gap-2 text-xs">
                                        <div className="w-4 h-4 rounded-full border flex items-center justify-center text-[8px] font-bold shrink-0" style={{ backgroundColor: ms.state === 'complete' ? 'hsl(var(--roadmap-milestone-complete))' : 'transparent', borderColor: ms.state === 'complete' ? 'hsl(var(--roadmap-milestone-complete))' : ms.state === 'current' ? 'hsl(var(--roadmap-milestone-current))' : 'hsl(35, 30%, 45%)', color: ms.state === 'complete' ? 'white' : 'hsl(35, 30%, 70%)' }}>
                                          {ms.state === 'complete' ? <Check className="w-2 h-2" /> : (idx + 1)}
                                        </div>
                                        {/* Theme-specific: show Epic key and name */}
                                        {isEpicMarker ? (
                                          <>
                                            <span className="font-medium" style={{ color: 'hsl(35, 30%, 85%)' }}>{milestoneData.epicKey}</span>
                                            <span className="truncate max-w-[120px]" style={{ color: 'hsl(35, 30%, 70%)' }}>{milestoneData.epicName}</span>
                                          </>
                                        ) : isFeatureMarker ? (
                                          <>
                                            <span className="font-medium truncate max-w-[180px]" style={{ color: 'hsl(35, 30%, 85%)' }}>{milestoneData.featureName}</span>
                                          </>
                                        ) : (
                                          <span style={{ color: 'hsl(35, 30%, 80%)' }}>{new Date(ms.date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}</span>
                                        )}
                                        <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ backgroundColor: ms.state === 'complete' ? 'hsla(142, 50%, 45%, 0.25)' : ms.state === 'current' ? 'hsla(35, 50%, 50%, 0.25)' : 'hsla(35, 30%, 50%, 0.2)', color: ms.state === 'complete' ? 'hsl(142, 50%, 65%)' : ms.state === 'current' ? 'hsl(35, 50%, 70%)' : 'hsl(35, 30%, 65%)' }}>
                                          {isEpicMarker ? (milestoneData.epicStatus || 'proposed').replace('_', ' ') : 
                                           isFeatureMarker ? (milestoneData.featureStatus || 'funnel').replace('_', ' ') : 
                                           (ms.state === 'complete' ? 'Complete' : ms.state === 'current' ? 'Current' : 'Pending')}
                                        </span>
                                      </div>
                                    );
                                  })}
                                  {item.milestones.length > 5 && (
                                    <div className="text-[10px] italic" style={{ color: 'hsl(35, 30%, 50%)' }}>
                                      +{item.milestones.length - 5} more {config.workItemType === 'theme' ? 'epics' : config.workItemType === 'epic' ? 'features' : 'milestones'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
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
    </div>
  );
}

export default RoadmapEngine;
