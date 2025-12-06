import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  SEED_ROADMAP_ITEMS, 
  PLATFORM_INFO, 
  STAGE_NAMES, 
  STAGE_NAMES_AR,
  BusinessRequestRoadmapItem,
  RoadmapStatus 
} from '@/data/roadmapSeed';
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
  LayoutList
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RoadmapFiltersDialog, RoadmapFilters } from './RoadmapFiltersDialog';
import { RoadmapLegend } from './RoadmapLegend';
import { BusinessRequestDrawer } from '@/components/business-requests/BusinessRequestDrawer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type TimeScale = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
type Language = 'en' | 'ar';
type SortField = 'rank' | 'platform' | 'submission' | 'score' | 'target' | 'quarter' | 'owner';
type SortOrder = 'asc' | 'desc';

const MIN_FIRST_COLUMN_WIDTH = 180;
const MAX_FIRST_COLUMN_WIDTH = 500;
const DEFAULT_FIRST_COLUMN_WIDTH = 320;

const TRANSLATIONS = {
  en: {
    executiveRoadmap: 'EXECUTIVE ROADMAP',
    industryRequests: 'Industry Requests Portfolio',
    newRequest: 'New',
    analyse: 'Analyse',
    approved: 'Approved',
    implement: 'Implement',
    closed: 'Closed',
    awaitingReview: 'Awaiting review',
    underAnalysis: 'Under analysis',
    readyToStart: 'Ready to start',
    inProgress: 'In progress',
    completed: 'Completed',
    platform: 'PLATFORM',
    status: 'STATUS',
    owner: 'OWNER',
    sortBy: 'SORT BY',
    milestones: 'MILESTONES',
    allPlatforms: 'All Platforms',
    allStatuses: 'All Statuses',
    allOwners: 'All Owners',
    rank: 'Rank',
    businessRequest: 'BUSINESS REQUEST',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
    risks: 'RISKS',
    dependencies: 'DEPENDENCIES',
  },
  ar: {
    executiveRoadmap: 'خارطة الطريق التنفيذية',
    industryRequests: 'محفظة الطلبات الصناعية',
    newRequest: 'جديد',
    analyse: 'تحليل',
    approved: 'موافق',
    implement: 'تنفيذ',
    closed: 'مغلق',
    awaitingReview: 'بانتظار المراجعة',
    underAnalysis: 'قيد التحليل',
    readyToStart: 'جاهز للبدء',
    inProgress: 'قيد التنفيذ',
    completed: 'مكتمل',
    platform: 'المنصة',
    status: 'الحالة',
    owner: 'المالك',
    sortBy: 'ترتيب حسب',
    milestones: 'المراحل',
    allPlatforms: 'جميع المنصات',
    allStatuses: 'جميع الحالات',
    allOwners: 'جميع الملاك',
    rank: 'الترتيب',
    businessRequest: 'طلب العمل',
    weekly: 'أسبوعي',
    monthly: 'شهري',
    quarterly: 'ربع سنوي',
    yearly: 'سنوي',
    risks: 'المخاطر',
    dependencies: 'الاعتماديات',
  }
};

// Status colors using CSS variables
const STATUS_COLORS: Record<RoadmapStatus, string> = {
  'NEW': 'hsl(var(--roadmap-status-new))',
  'ANALYSE': 'hsl(var(--roadmap-status-analyse))',
  'APPROVED': 'hsl(var(--roadmap-status-approved))',
  'IMPLEMENT': 'hsl(var(--roadmap-status-implement))',
  'CLOSED': 'hsl(var(--roadmap-status-closed))',
};

// 3-letter status abbreviations
const STATUS_ABBR: Record<RoadmapStatus, string> = {
  'NEW': 'NEW',
  'ANALYSE': 'ANL',
  'APPROVED': 'APR',
  'IMPLEMENT': 'IMP',
  'CLOSED': 'CLS',
};

interface ExecutiveRoadmapProps {
  className?: string;
  apiItems?: BusinessRequestRoadmapItem[];
}

export function ExecutiveRoadmap({ className, apiItems }: ExecutiveRoadmapProps) {
  const [language, setLanguage] = useState<Language>('en');
  const [timeScale, setTimeScale] = useState<TimeScale>('quarterly');
  const [platform, setPlatform] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [owner, setOwner] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showMilestones, setShowMilestones] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeKPI, setActiveKPI] = useState<RoadmapStatus | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [isTimelineView, setIsTimelineView] = useState(true);
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

  const t = TRANSLATIONS[language];
  const isRTL = language === 'ar';

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

  // Fetch the selected business request ID from request_key
  const { data: selectedRequestDbId } = useQuery({
    queryKey: ['business-request-id', selectedRequestId],
    queryFn: async () => {
      if (!selectedRequestId) return null;
      const { data, error } = await supabase
        .from('business_requests')
        .select('id')
        .eq('request_key', selectedRequestId)
        .maybeSingle();
      if (error) throw error;
      return data?.id || null;
    },
    enabled: !!selectedRequestId,
  });

  // Use API items if available, otherwise use seed data
  const items = useMemo(() => {
    return apiItems && apiItems.length > 0 ? apiItems : SEED_ROADMAP_ITEMS;
  }, [apiItems]);

  // Get unique owners
  const uniqueOwners = useMemo(() => {
    const owners = new Set(items.map(item => item.ownerEn));
    return Array.from(owners);
  }, [items]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Apply KPI filter
    if (activeKPI) {
      result = result.filter(item => item.status === activeKPI);
    }

    // Apply platform filter
    if (platform !== 'all') {
      result = result.filter(item => item.platform === platform);
    }

    // Apply status filter
    if (status !== 'all') {
      result = result.filter(item => item.status === status);
    }

    // Apply owner filter
    if (owner !== 'all') {
      result = result.filter(item => item.ownerEn === owner);
    }

    // Sort
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
  }, [items, activeKPI, platform, status, owner, sortField, sortOrder, isRTL]);

  // Count items by status
  const statusCounts = useMemo(() => {
    const counts: Record<RoadmapStatus, number> = {
      'NEW': 0, 'ANALYSE': 0, 'APPROVED': 0, 'IMPLEMENT': 0, 'CLOSED': 0
    };
    items.forEach(item => {
      if (platform === 'all' || item.platform === platform) {
        if (owner === 'all' || item.ownerEn === owner) {
          counts[item.status]++;
        }
      }
    });
    return counts;
  }, [items, platform, owner]);

  // Generate timeline columns
  const timelineColumns = useMemo(() => {
    const cols: { label: string; subLabel: string }[] = [];
    const monthNames = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    const monthNamesAr = ['أكتوبر', 'نوفمبر', 'ديسمبر', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر'];

    if (timeScale === 'monthly') {
      for (let i = 0; i < 12; i++) {
        const year = i < 3 ? 2024 : 2025;
        cols.push({
          label: isRTL ? monthNamesAr[i] : monthNames[i],
          subLabel: String(year)
        });
      }
    } else if (timeScale === 'weekly') {
      for (let i = 1; i <= 12; i++) {
        const startDate = new Date('2024-11-01');
        startDate.setDate(startDate.getDate() + (i - 1) * 7);
        cols.push({
          label: isRTL ? `أ${i}` : `W${i}`,
          subLabel: startDate.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })
        });
      }
    } else if (timeScale === 'quarterly') {
      for (let i = 0; i < 12; i++) {
        cols.push({
          label: isRTL ? monthNamesAr[i] : monthNames[i],
          subLabel: ''
        });
      }
    } else if (timeScale === 'yearly') {
      cols.push({ label: '2024', subLabel: '' });
      cols.push({ label: '2025', subLabel: '' });
    }

    return cols;
  }, [timeScale, isRTL]);

  // Generate quarterly grouping data
  const quarterlyGroups = useMemo(() => {
    if (timeScale !== 'quarterly') return null;
    return [
      { label: 'Q4 2024', span: 3 },
      { label: 'Q1 2025', span: 3 },
      { label: 'Q2 2025', span: 3 },
      { label: 'Q3 2025', span: 3 },
    ];
  }, [timeScale]);

  // Calculate today line position
  const getTodayPosition = useCallback(() => {
    const today = new Date();
    let rangeStart: Date, rangeEnd: Date;
    
    if (timeScale === 'monthly') {
      rangeStart = new Date('2024-10-01');
      rangeEnd = new Date('2025-09-30');
    } else if (timeScale === 'weekly') {
      rangeStart = new Date('2024-11-01');
      rangeEnd = new Date('2025-01-24');
    } else if (timeScale === 'quarterly') {
      rangeStart = new Date('2024-10-01');
      rangeEnd = new Date('2025-09-30');
    } else {
      rangeStart = new Date('2024-01-01');
      rangeEnd = new Date('2025-12-31');
    }

    if (today < rangeStart || today > rangeEnd) return null;
    
    const totalDays = (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceStart = (today.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
    return (daysSinceStart / totalDays) * 100;
  }, [timeScale]);

  const todayPosition = getTodayPosition();
  
  // Format today's date
  const todayLabel = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  }, [isRTL]);

  // Calculate bar position
  const getBarPosition = useCallback((item: BusinessRequestRoadmapItem) => {
    const start = new Date(item.startDate);
    const end = new Date(item.endDate);
    
    let rangeStart: Date, rangeEnd: Date;
    if (timeScale === 'monthly') {
      rangeStart = new Date('2024-10-01');
      rangeEnd = new Date('2025-09-30');
    } else if (timeScale === 'weekly') {
      rangeStart = new Date('2024-11-01');
      rangeEnd = new Date('2025-01-24');
    } else if (timeScale === 'quarterly') {
      rangeStart = new Date('2024-10-01');
      rangeEnd = new Date('2025-09-30');
    } else {
      rangeStart = new Date('2024-01-01');
      rangeEnd = new Date('2025-12-31');
    }

    const totalDays = (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
    const startOffset = Math.max(0, (start.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
    const endOffset = Math.min(totalDays, (end.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));

    const left = (startOffset / totalDays) * 100;
    const width = ((endOffset - startOffset) / totalDays) * 100;

    return { left: `${left}%`, width: `${Math.max(width, 2)}%` };
  }, [timeScale]);

  // Get milestone position within bar
  const getMilestonePosition = useCallback((milestoneDate: string, startDate: string, endDate: string) => {
    const milestone = new Date(milestoneDate);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = end.getTime() - start.getTime();
    const offset = milestone.getTime() - start.getTime();
    return Math.min(100, Math.max(0, (offset / duration) * 100));
  }, []);

  // Format date label
  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', year: '2-digit' }).replace(' ', " '");
  };

  // Handle export
  const handleExport = () => {
    window.print();
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const kpiCards = [
    { status: 'NEW' as RoadmapStatus, label: t.newRequest },
    { status: 'ANALYSE' as RoadmapStatus, label: t.analyse },
    { status: 'APPROVED' as RoadmapStatus, label: t.approved },
    { status: 'IMPLEMENT' as RoadmapStatus, label: t.implement },
    { status: 'CLOSED' as RoadmapStatus, label: t.closed },
  ];

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
      {/* Print-only Header */}
      <div className="hidden print:flex items-center justify-between px-6 py-4 border-b bg-white" style={{ borderColor: 'hsl(var(--roadmap-sandstone))' }}>
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #C69C6D, #E8D5C0)' }}
          >
            MIM
          </div>
          <div>
            <div className="text-xs font-medium tracking-wider" style={{ color: 'hsl(var(--roadmap-status-new))' }}>EXECUTIVE ROADMAP</div>
            <div className="text-sm font-semibold" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>Industry Requests Portfolio</div>
          </div>
        </div>
        {/* Catalyst branding on right side for print - matching brand style */}
        <div className="text-xl font-semibold" style={{ letterSpacing: '-0.02em' }}>
          <span style={{ color: '#1a1a1a' }}>Cata</span>
          <span style={{ color: '#C69C6D' }}>lyst</span>
        </div>
      </div>

      {/* Header with top controls */}
      <div 
        className="h-[72px] flex items-center justify-between px-4 sm:px-6 border-b print:hidden shrink-0 relative z-20"
        style={{ 
          backgroundColor: 'white',
          borderColor: 'hsl(var(--roadmap-sandstone))'
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white font-bold text-sm shadow-sm"
            style={{ background: 'linear-gradient(135deg, #C69C6D, #E8D5C0)' }}
          >
            MIM
          </div>
          <div>
            <div className="text-xs font-medium tracking-wider" style={{ color: 'hsl(var(--roadmap-status-new))' }}>
              {t.executiveRoadmap}
            </div>
            <div className="text-base font-semibold" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>
              {t.industryRequests}
            </div>
          </div>
        </div>

        {/* Floating Pills Toolbar */}
        <div className="inline-flex items-center gap-1.5 relative z-30" style={{ direction: 'ltr' }}>
          {/* Milestones Toggle */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowMilestones(!showMilestones)}
                  className={cn(
                    "w-9 h-9 flex items-center justify-center rounded-[10px] cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5",
                    showMilestones 
                      ? "text-white" 
                      : "bg-white text-[hsl(var(--roadmap-fossil))]"
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

          {/* Divider */}
          <div className="w-px h-6 mx-1" style={{ backgroundColor: 'hsl(var(--roadmap-driftwood))' }} />

          {/* Filter */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setFiltersDialogOpen(true)}
                  className="w-9 h-9 flex items-center justify-center rounded-[10px] cursor-pointer transition-all duration-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  style={{ 
                    border: '1px solid hsl(var(--roadmap-sandstone))',
                    color: 'hsl(var(--roadmap-fossil))'
                  }}
                >
                  <Filter className="w-[18px] h-[18px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Filters</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Period Dropdown */}
          <DropdownMenu>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="w-9 h-9 flex items-center justify-center rounded-[10px] cursor-pointer transition-all duration-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5"
                      style={{ 
                        border: '1px solid hsl(var(--roadmap-sandstone))',
                        color: 'hsl(var(--roadmap-fossil))'
                      }}
                    >
                      <Calendar className="w-[18px] h-[18px]" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Time Period</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="end" className="w-36 bg-white z-50 shadow-lg rounded-lg" style={{ border: '1px solid hsl(var(--roadmap-sandstone))' }}>
              {(['weekly', 'monthly', 'quarterly', 'yearly'] as TimeScale[]).map((scale) => (
                <DropdownMenuItem
                  key={scale}
                  onClick={() => setTimeScale(scale)}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[hsl(var(--roadmap-parchment))]"
                >
                  <span className="w-4">
                    {timeScale === scale && <Check className="w-4 h-4" style={{ color: 'hsl(var(--roadmap-status-new))' }} />}
                  </span>
                  <span className={cn("text-sm", timeScale === scale && "font-medium")} style={{ color: 'hsl(var(--roadmap-charcoal))' }}>
                    {t[scale]}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Divider */}
          <div className="w-px h-6 mx-1" style={{ backgroundColor: 'hsl(var(--roadmap-driftwood))' }} />

          {/* Language Toggle */}
          <div 
            className="flex rounded-[10px] p-0.5 gap-0.5 shadow-sm"
            style={{ backgroundColor: 'hsl(var(--roadmap-parchment))', border: '1px solid hsl(var(--roadmap-sandstone))' }}
          >
            <button
              onClick={() => setLanguage('en')}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold cursor-pointer transition-all duration-150",
                language === 'en' ? "text-white" : "bg-transparent hover:opacity-80"
              )}
              style={{ 
                backgroundColor: language === 'en' ? 'hsl(var(--roadmap-status-new))' : 'transparent',
                color: language === 'en' ? 'white' : 'hsl(var(--roadmap-fossil))'
              }}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('ar')}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold cursor-pointer transition-all duration-150",
                language === 'ar' ? "text-white" : "bg-transparent hover:opacity-80"
              )}
              style={{ 
                backgroundColor: language === 'ar' ? 'hsl(var(--roadmap-status-new))' : 'transparent',
                color: language === 'ar' ? 'white' : 'hsl(var(--roadmap-fossil))'
              }}
            >
              ع
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-6 mx-1" style={{ backgroundColor: 'hsl(var(--roadmap-driftwood))' }} />

          {/* Export PDF */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleExport}
                  className="w-9 h-9 flex items-center justify-center rounded-[10px] cursor-pointer transition-all duration-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  style={{ 
                    border: '1px solid hsl(var(--roadmap-sandstone))',
                    color: 'hsl(var(--roadmap-fossil))'
                  }}
                >
                  <Download className="w-[18px] h-[18px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Export PDF</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Fullscreen */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleFullscreen}
                  className="w-9 h-9 flex items-center justify-center rounded-[10px] cursor-pointer transition-all duration-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  style={{ 
                    border: '1px solid hsl(var(--roadmap-sandstone))',
                    color: 'hsl(var(--roadmap-fossil))'
                  }}
                >
                  {isFullscreen ? <Minimize2 className="w-[18px] h-[18px]" /> : <Maximize2 className="w-[18px] h-[18px]" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Status Pills - Always visible centered row */}
      <div 
        className="flex items-center justify-center gap-3 px-4 sm:px-6 py-3 border-b print:hidden"
        style={{ 
          backgroundColor: 'hsl(var(--roadmap-parchment))',
          borderColor: 'hsl(var(--roadmap-sandstone))'
        }}
      >
        {kpiCards.map((kpi) => {
          const isActive = activeKPI === kpi.status;
          return (
            <button
              key={kpi.status}
              onClick={() => setActiveKPI(isActive ? null : kpi.status)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer",
                isActive && "shadow-sm"
              )}
              style={{ 
                backgroundColor: isActive ? 'hsl(var(--roadmap-charcoal))' : 'hsl(var(--roadmap-parchment))',
                color: isActive ? 'white' : 'hsl(var(--roadmap-graphite))',
                border: isActive ? 'none' : '1px solid hsl(var(--roadmap-sandstone))'
              }}
            >
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: STATUS_COLORS[kpi.status] }}
              />
              <span className="font-bold">{statusCounts[kpi.status]}</span>
              <span>{kpi.label}</span>
            </button>
          );
        })}
      </div>

      {/* Timeline Grid */}
      <div className="flex-1 overflow-auto scroll-smooth relative" style={{ scrollBehavior: 'smooth', direction: 'ltr' }}>
        <div className="min-w-[1200px] relative">
          {/* Today line - More visible with higher z-index */}
          {todayPosition !== null && (
            <div
              className="absolute top-0 bottom-0 z-40 pointer-events-none"
              style={{ 
                left: `calc(${firstColumnWidth}px + (100% - ${firstColumnWidth}px) * ${todayPosition / 100})`,
                width: '2px',
                backgroundColor: '#ef4444'
              }}
            >
              {/* Today badge */}
              <div 
                className="absolute top-0 left-1/2 -translate-x-1/2 px-2 py-0.5 text-xs font-bold rounded-b whitespace-nowrap shadow-lg"
                style={{ 
                  backgroundColor: '#ef4444',
                  color: 'white'
                }}
              >
                {todayLabel}
              </div>
              {/* Pulsing dot */}
              <div 
                className="absolute top-6 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full animate-pulse shadow-md"
                style={{ backgroundColor: '#ef4444' }}
              />
            </div>
          )}

          {/* Timeline Header */}
          <div className="border-b sticky top-0 z-10" style={{ backgroundColor: 'white', borderColor: 'hsl(var(--roadmap-sandstone))' }}>
            <div className={cn("flex", isRTL && "flex-row-reverse")}>
              <div 
                className={cn(
                  "shrink-0 px-3 relative group flex items-center overflow-hidden box-border",
                  timeScale === 'quarterly' ? 'py-2' : 'py-2'
                )}
                style={{ 
                  width: `${firstColumnWidth}px`, 
                  direction: isRTL ? 'rtl' : 'ltr', 
                  textAlign: isRTL ? 'right' : 'left',
                  backgroundColor: 'hsl(var(--roadmap-parchment))',
                  borderRight: isRTL ? 'none' : '1px solid hsl(var(--roadmap-sandstone))',
                  borderLeft: isRTL ? '1px solid hsl(var(--roadmap-sandstone))' : 'none'
                }}
              >
                <div className="flex items-center justify-between w-full min-w-0 gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--roadmap-fossil))' }}>
                    {t.businessRequest}
                  </span>
                  <button 
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="text-xs font-medium flex items-center gap-0.5 hover:opacity-80 shrink-0"
                    style={{ color: 'hsl(var(--roadmap-status-new))' }}
                  >
                    {sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {t.rank} ↓
                  </button>
                </div>
                {/* Resize Handle */}
                <div
                  className={cn(
                    "absolute top-0 h-full w-1 cursor-col-resize z-20 transition-colors hover:opacity-80",
                    isResizing && "opacity-100"
                  )}
                  style={{ 
                    [isRTL ? 'left' : 'right']: 0,
                    backgroundColor: isResizing ? 'hsl(var(--roadmap-status-new))' : 'transparent'
                  }}
                  onMouseDown={handleResizeMouseDown}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="absolute -left-1 -right-1 top-0 h-full" />
                </div>
              </div>
              
              {/* Timeline columns with vertical separators */}
              {timeScale === 'quarterly' ? (
                <div className="flex-1 flex flex-col relative">
                  {/* Top row: Quarters */}
                  <div className="flex border-b" style={{ borderColor: 'hsl(var(--roadmap-sandstone))' }}>
                    {quarterlyGroups?.map((quarter, i) => (
                      <div 
                        key={i} 
                        className="flex-1 px-1 py-1.5 text-center border-r"
                        style={{ flex: quarter.span, borderColor: 'hsl(var(--roadmap-driftwood))' }}
                      >
                        <div className="text-xs font-semibold" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>{quarter.label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Bottom row: Months */}
                  <div className="flex">
                    {timelineColumns.map((col, i) => (
                      <div 
                        key={i} 
                        className="flex-1 px-1 py-1.5 text-center border-r"
                        style={{ borderColor: 'hsl(var(--roadmap-driftwood))' }}
                      >
                        <div className="text-xs font-medium" style={{ color: 'hsl(var(--roadmap-fossil))' }}>{col.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex">
                  {timelineColumns.map((col, i) => (
                    <div 
                      key={i} 
                      className="flex-1 px-1 py-2 text-center border-r"
                      style={{ borderColor: 'hsl(var(--roadmap-driftwood))' }}
                    >
                      <div className="text-xs font-medium" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>{col.label}</div>
                      {col.subLabel && <div className="text-xs" style={{ color: 'hsl(var(--roadmap-fossil))' }}>{col.subLabel}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rows */}
          {filteredItems.map((item) => {
            const barPos = getBarPosition(item);
            const isSelected = selectedRow === item.id;

            return (
              <div 
                key={item.id}
                className={cn(
                  "flex border-b transition-colors cursor-pointer",
                  isRTL && "flex-row-reverse"
                )}
                style={{ 
                  borderColor: 'hsl(var(--roadmap-sandstone))',
                  backgroundColor: isSelected 
                    ? 'hsla(var(--roadmap-status-new) / 0.08)' 
                    : hoveredItem === item.id 
                      ? 'hsla(var(--roadmap-status-new) / 0.04)' 
                      : 'white',
                  borderLeft: isSelected ? '3px solid hsl(var(--roadmap-status-new))' : '3px solid transparent'
                }}
                onClick={() => setSelectedRow(isSelected ? null : item.id)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {/* Request Info with Status Indicator */}
                <div 
                  className="shrink-0 px-3 py-3 overflow-hidden box-border"
                  style={{ 
                    width: `${firstColumnWidth}px`, 
                    direction: isRTL ? 'rtl' : 'ltr', 
                    textAlign: isRTL ? 'right' : 'left',
                    borderRight: isRTL ? 'none' : '1px solid hsl(var(--roadmap-sandstone))',
                    borderLeft: isRTL ? '1px solid hsl(var(--roadmap-sandstone))' : 'none'
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Status Indicator */}
                    <div className="flex flex-col items-center shrink-0 pt-0.5">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[item.status] }}
                      />
                      <span 
                        className="text-[9px] font-bold mt-0.5 tracking-wider"
                        style={{ color: STATUS_COLORS[item.status] }}
                      >
                        {STATUS_ABBR[item.status]}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>
                          #{item.rank}
                        </span>
                        {(item.rank === 1 || item.rank === 3 || item.rank === 9) && (
                          <Lock className="h-3 w-3" style={{ color: 'hsl(var(--roadmap-status-new))' }} />
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRequestId(item.id);
                          }}
                          className="text-xs font-medium hover:underline cursor-pointer bg-transparent border-none p-0"
                          style={{ color: 'hsl(var(--roadmap-status-new))' }}
                        >
                          {item.id}
                        </button>
                      </div>
                      <div className="text-sm font-medium truncate leading-tight mt-0.5" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>
                        {isRTL ? item.titleAr : item.titleEn}
                      </div>
                      <div className="text-xs mt-0.5 truncate" style={{ color: 'hsl(var(--roadmap-fossil))' }}>
                        {isRTL ? item.ownerAr : item.ownerEn}
                        <span className="mx-1">·</span>
                        <span style={{ color: 'hsl(var(--roadmap-status-new))' }}>
                          {isRTL ? PLATFORM_INFO[item.platform]?.nameAr : item.platform}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline Bar - No tooltip wrapper */}
                <div className="flex-1 relative py-3 px-2 cursor-pointer" style={{ display: 'flex', alignItems: 'center' }}>
                  {/* Vertical grid lines for timeline columns */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {timelineColumns.map((_, i) => (
                      <div 
                        key={i} 
                        className="flex-1 border-r" 
                        style={{ borderColor: 'hsl(var(--roadmap-sandstone) / 0.5)' }} 
                      />
                    ))}
                  </div>
                  {/* Date labels */}
                  <div 
                    className="absolute text-xs"
                    style={{ left: barPos.left, top: '2px', color: 'hsl(var(--roadmap-fossil))' }}
                  >
                    {formatDateLabel(item.startDate)}
                  </div>
                  <div 
                    className="absolute text-xs" 
                    style={{ 
                      left: `calc(${barPos.left} + ${barPos.width})`, 
                      top: '2px', 
                      transform: 'translateX(-100%)',
                      color: 'hsl(var(--roadmap-fossil))'
                    }}
                  >
                    {formatDateLabel(item.endDate)}
                  </div>

                  {/* Bar - UNIFORM gold gradient for all statuses */}
                  <div 
                    className="absolute h-[26px] rounded-full overflow-hidden"
                    style={{ 
                      left: barPos.left, 
                      width: barPos.width, 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      background: 'linear-gradient(90deg, #C69C6D, #E8D5C0)'
                    }}
                  >
                    {/* Milestones - positioned inside the bar with padding */}
                    {showMilestones && item.milestones.map((ms, index) => {
                      // Keep milestones inside bar: distribute evenly within bounds
                      const totalMilestones = item.milestones.length;
                      let pos: number;
                      if (totalMilestones === 1) {
                        pos = 50; // Center if only one
                      } else {
                        // Distribute from 10% to 90% to keep inside bar
                        pos = 10 + (index * (80 / (totalMilestones - 1)));
                      }
                      
                      return (
                        <div
                          key={ms.step}
                          className="absolute w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center text-[10px] font-medium cursor-pointer"
                          style={{ 
                            left: `${pos}%`, 
                            top: '50%', 
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: ms.state === 'complete' 
                              ? 'hsl(var(--roadmap-milestone-complete))' 
                              : 'white',
                            borderColor: ms.state === 'complete' 
                              ? 'hsl(var(--roadmap-milestone-complete))'
                              : ms.state === 'current'
                                ? 'hsl(var(--roadmap-milestone-current))'
                                : 'hsl(var(--roadmap-milestone-pending))',
                            color: ms.state === 'complete' 
                              ? 'white'
                              : ms.state === 'current'
                                ? 'hsl(var(--roadmap-milestone-current))'
                                : 'hsl(var(--roadmap-fossil))',
                            boxShadow: ms.state === 'current' 
                              ? '0 0 8px hsla(var(--roadmap-milestone-current) / 0.5)' 
                              : 'none'
                          }}
                        >
                          {ms.state === 'complete' ? <Check className="w-2.5 h-2.5" /> : ms.step}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend - Removed per user request */}

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
        filters={{
          platform,
          status,
          owner,
          sortField,
          showMilestones,
        }}
        onFiltersChange={(newFilters: RoadmapFilters) => {
          if (newFilters.platform) setPlatform(newFilters.platform);
          if (newFilters.status) setStatus(newFilters.status);
          if (newFilters.owner) setOwner(newFilters.owner);
          if (newFilters.sortField) setSortField(newFilters.sortField as SortField);
          if (newFilters.showMilestones !== undefined) setShowMilestones(newFilters.showMilestones);
        }}
        uniqueOwners={uniqueOwners}
      />

      {/* Business Request Drawer */}
      <BusinessRequestDrawer
        isOpen={!!selectedRequestId && !!selectedRequestDbId}
        onClose={() => setSelectedRequestId(null)}
        requestId={selectedRequestDbId || null}
      />
    </div>
  );
}

export default ExecutiveRoadmap;
