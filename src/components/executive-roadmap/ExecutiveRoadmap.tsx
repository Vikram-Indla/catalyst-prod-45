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
  ChevronRight,
  Maximize2, 
  Minimize2, 
  Download, 
  Flag, 
  Menu,
  X,
  Lock,
  Filter,
  Clock,
  Calendar,
  Check,
  GripVertical
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RoadmapFiltersDialog, RoadmapFilters } from './RoadmapFiltersDialog';
import { BusinessRequestDrawer } from '@/components/business-requests/BusinessRequestDrawer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type TimeScale = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
type Language = 'en' | 'ar';
type SortField = 'rank' | 'platform' | 'submission' | 'score' | 'target' | 'quarter' | 'owner';
type SortOrder = 'asc' | 'desc';

const MIN_FIRST_COLUMN_WIDTH = 180;
const MAX_FIRST_COLUMN_WIDTH = 500;
const DEFAULT_FIRST_COLUMN_WIDTH = 280;

const TRANSLATIONS = {
  en: {
    executiveRoadmap: 'EXECUTIVE ROADMAP',
    industryRequests: 'Industry Requests Portfolio',
    newRequest: 'NEW REQUEST',
    analyse: 'ANALYSE',
    approved: 'APPROVED',
    implement: 'IMPLEMENT',
    closed: 'CLOSED',
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
    newRequest: 'طلب جديد',
    analyse: 'تحليل',
    approved: 'موافق عليه',
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

const STATUS_COLORS: Record<RoadmapStatus, string> = {
  'NEW': '#C69C6D',
  'ANALYSE': '#5B7B9B',
  'APPROVED': '#A67F52',
  'IMPLEMENT': '#4A6355',
  'CLOSED': '#5C5650',
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
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
      // For quarterly, generate 12 month columns (will be grouped into quarters in header)
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
      { label: 'Q4 2024', span: 3 }, // Oct, Nov, Dec
      { label: 'Q1 2025', span: 3 }, // Jan, Feb, Mar
      { label: 'Q2 2025', span: 3 }, // Apr, May, Jun
      { label: 'Q3 2025', span: 3 }, // Jul, Aug, Sep
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
    return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', year: '2-digit' }).replace(' ', ' \'');
  };

  // Handle export
  const handleExport = () => {
    window.print();
  };

  // Toggle fullscreen - use CSS-based fullscreen instead of native API
  // Native fullscreen breaks portalled components (dialogs, dropdowns)
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const kpiCards = [
    { status: 'NEW' as RoadmapStatus, label: t.newRequest, subtitle: t.awaitingReview },
    { status: 'ANALYSE' as RoadmapStatus, label: t.analyse, subtitle: t.underAnalysis },
    { status: 'APPROVED' as RoadmapStatus, label: t.approved, subtitle: t.readyToStart },
    { status: 'IMPLEMENT' as RoadmapStatus, label: t.implement, subtitle: t.inProgress },
    { status: 'CLOSED' as RoadmapStatus, label: t.closed, subtitle: t.completed },
  ];

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex flex-col bg-secondary overflow-hidden print:bg-white font-sans",
        isRTL && "direction-rtl",
        isFullscreen 
          ? "fixed inset-0 z-50" 
          : "h-full",
        className
      )}
      style={{ direction: isRTL ? 'rtl' : 'ltr' }}
    >
      {/* Print-only Header */}
      <div className="hidden print:flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-gold flex items-center justify-center text-primary-foreground font-bold text-xs">
            MIM
          </div>
          <div>
            <div className="text-xs text-brand-gold font-medium tracking-wider">EXECUTIVE ROADMAP</div>
            <div className="text-sm font-semibold text-foreground">Industry Requests Portfolio</div>
          </div>
        </div>
        <div className="text-xl font-semibold">
          <span className="text-foreground">Cata</span>
          <span className="text-brand-gold">lyst</span>
        </div>
      </div>

      {/* Header with top controls - fixed height 72px to align with sidebar */}
      <div className="h-[72px] flex items-center justify-between px-4 sm:px-6 border-b border-border bg-card print:hidden shrink-0 relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-gold flex items-center justify-center text-primary-foreground font-bold text-xs">
            MIM
          </div>
          <div>
            <div className="text-xs text-brand-gold font-medium tracking-wider">{t.executiveRoadmap}</div>
            <div className="text-sm font-semibold text-foreground">{t.industryRequests}</div>
          </div>
        </div>

        {/* Floating Pills Toolbar */}
        <div className="inline-flex items-center gap-2 relative z-30" style={{ direction: 'ltr' }}>
          {/* Milestones Toggle */}
          <button
            onClick={() => setShowMilestones(!showMilestones)}
            className={cn(
              "w-[38px] h-[38px] flex items-center justify-center rounded-xl border-none cursor-pointer transition-all duration-200",
              "shadow-sm hover:shadow-md hover:-translate-y-0.5",
              showMilestones ? "bg-brand-gold text-primary-foreground" : "bg-secondary text-muted-foreground"
            )}
          >
            <Clock className="w-[18px] h-[18px]" />
          </button>

          {/* Filter */}
          <button
            onClick={() => setFiltersDialogOpen(true)}
            className={cn(
              "w-[38px] h-[38px] flex items-center justify-center rounded-xl border-none cursor-pointer transition-all duration-200",
              "bg-secondary text-muted-foreground shadow-sm",
              "hover:shadow-md hover:-translate-y-0.5"
            )}
          >
            <Filter className="w-[18px] h-[18px]" />
          </button>

          {/* Period Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "w-[38px] h-[38px] flex items-center justify-center rounded-xl border-none cursor-pointer transition-all duration-200",
                  "bg-secondary text-muted-foreground shadow-sm",
                  "hover:shadow-md hover:-translate-y-0.5"
                )}
              >
                <Calendar className="w-[18px] h-[18px]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 bg-card z-50 shadow-lg rounded-lg border border-border">
              {(['weekly', 'monthly', 'quarterly', 'yearly'] as TimeScale[]).map((scale) => (
                <DropdownMenuItem
                  key={scale}
                  onClick={() => setTimeScale(scale)}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-secondary"
                >
                  <span className="w-4">
                    {timeScale === scale && <Check className="w-4 h-4 text-brand-gold" />}
                  </span>
                  <span className={cn("text-sm", timeScale === scale && "font-medium text-foreground")}>
                    {t[scale]}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Language Toggle */}
          <div className="flex bg-secondary rounded-xl p-1 gap-0.5 shadow-sm">
            <button
              onClick={() => setLanguage('en')}
              className={cn(
                "w-[30px] h-[30px] flex items-center justify-center rounded-lg text-xs font-bold cursor-pointer transition-all duration-150",
                language === 'en' ? "bg-brand-gold text-primary-foreground" : "bg-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('ar')}
              className={cn(
                "w-[30px] h-[30px] flex items-center justify-center rounded-lg text-xs font-bold cursor-pointer transition-all duration-150",
                language === 'ar' ? "bg-brand-gold text-primary-foreground" : "bg-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              ع
            </button>
          </div>

          {/* Export PDF */}
          <button
            onClick={handleExport}
            className={cn(
              "w-[38px] h-[38px] flex items-center justify-center rounded-xl border-none cursor-pointer transition-all duration-200",
              "bg-secondary text-muted-foreground shadow-sm",
              "hover:shadow-md hover:-translate-y-0.5"
            )}
          >
            <Download className="w-[18px] h-[18px]" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className={cn(
              "w-[38px] h-[38px] flex items-center justify-center rounded-xl border-none cursor-pointer transition-all duration-200",
              "bg-secondary text-muted-foreground shadow-sm",
              "hover:shadow-md hover:-translate-y-0.5"
            )}
          >
            {isFullscreen ? <Minimize2 className="w-[18px] h-[18px]" /> : <Maximize2 className="w-[18px] h-[18px]" />}
          </button>
        </div>
      </div>

      {/* Show/Hide Details Toggle with Status Pills */}
      <div 
        className="flex items-center justify-between px-4 sm:px-6 py-2 border-b border-border bg-card print:hidden"
      >
        <div 
          className="flex items-center gap-2 cursor-pointer hover:bg-muted px-2 py-1 rounded transition-colors"
          onClick={() => setShowFilters(!showFilters)}
        >
          <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", showFilters && "rotate-90")} />
          <span className="text-xs font-medium text-muted-foreground">
            {showFilters ? (isRTL ? 'إخفاء التفاصيل' : 'Hide Details') : (isRTL ? 'إظهار التفاصيل' : 'Show Details')}
          </span>
        </div>
      </div>

      {/* Status Pills - shown when Details expanded */}
      {showFilters && (
        <div className="flex items-center gap-3 px-4 sm:px-6 py-2 border-b border-border bg-card print:hidden">
          {/* Status Pill Strip */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mr-1">
              {isRTL ? 'الحالة:' : 'STATUS:'}
            </span>
            {kpiCards.map((kpi) => {
              const isActive = activeKPI === kpi.status;
              return (
                <button
                  key={kpi.status}
                  onClick={() => setActiveKPI(isActive ? null : kpi.status)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border",
                    isActive 
                      ? "bg-brand-gold/10 border-brand-gold text-foreground" 
                      : "bg-muted border-transparent text-muted-foreground hover:bg-accent"
                  )}
                >
                  <span 
                    className="w-1.5 h-1.5 rounded-full" 
                    style={{ backgroundColor: STATUS_COLORS[kpi.status] }}
                  />
                  <span>{kpi.status === 'NEW' ? (isRTL ? 'جديد' : 'New') : kpi.status === 'ANALYSE' ? (isRTL ? 'تحليل' : 'Analyse') : kpi.status === 'APPROVED' ? (isRTL ? 'موافق' : 'Approved') : kpi.status === 'IMPLEMENT' ? (isRTL ? 'تنفيذ' : 'Implement') : (isRTL ? 'مغلق' : 'Closed')}</span>
                  <span className="font-bold">{statusCounts[kpi.status]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline Grid - smooth scroll */}
      <div className="flex-1 overflow-auto scroll-smooth" style={{ scrollBehavior: 'smooth', direction: 'ltr' }}>
        <div className="min-w-[1200px]">
          {/* Timeline Header */}
          <div className="border-b border-border bg-card sticky top-0 z-10">
            <div className={cn("flex", isRTL && "flex-row-reverse")}>
              <div 
                className={cn(
                  "shrink-0 px-3 bg-muted relative group flex items-center overflow-hidden",
                  timeScale === 'quarterly' ? 'py-2' : 'py-2',
                  isRTL ? "border-l border-border" : "border-r border-border"
                )}
                style={{ width: `${firstColumnWidth}px`, direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' }}
              >
                <div className="flex items-center justify-between w-full min-w-0 gap-2">
                  <span className="text-xs font-medium text-muted-foreground truncate">{t.businessRequest}</span>
                  <button 
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="text-xs font-medium text-brand-gold flex items-center gap-0.5 hover:opacity-80 shrink-0"
                  >
                    {sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {sortField === 'rank' ? t.rank : sortField === 'platform' ? t.platform : t.owner}
                  </button>
                </div>
                {/* Resize Handle */}
                <div
                  className={cn(
                    "absolute top-0 h-full w-1 cursor-col-resize z-20 transition-colors",
                    "hover:bg-brand-gold/60 active:bg-brand-gold",
                    isResizing && "bg-brand-gold"
                  )}
                  style={{ [isRTL ? 'left' : 'right']: 0 }}
                  onMouseDown={handleResizeMouseDown}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Wider hit area for easier grabbing */}
                  <div className="absolute -left-1 -right-1 top-0 h-full" />
                </div>
              </div>
              
              {/* Timeline columns - handle quarterly specially */}
              {timeScale === 'quarterly' ? (
                <div className="flex-1 flex flex-col">
                  {/* Top row: Months */}
                  <div className="flex border-b border-border">
                    {timelineColumns.map((col, i) => (
                      <div 
                        key={i} 
                        className="flex-1 px-1 py-1.5 text-center border-r border-border last:border-r-0"
                      >
                        <div className="text-xs font-medium text-muted-foreground">{col.label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Bottom row: Quarters */}
                  <div className="flex">
                    {quarterlyGroups?.map((quarter, i) => (
                      <div 
                        key={i} 
                        className="flex-1 px-1 py-1.5 text-center border-r border-border last:border-r-0"
                        style={{ flex: quarter.span }}
                      >
                        <div className="text-xs font-semibold text-foreground">{quarter.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex">
                  {timelineColumns.map((col, i) => (
                    <div 
                      key={i} 
                      className="flex-1 px-1 py-2 text-center border-r border-border last:border-r-0"
                    >
                      <div className="text-xs font-medium text-foreground">{col.label}</div>
                      {col.subLabel && <div className="text-xs text-muted-foreground">{col.subLabel}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rows */}
          {filteredItems.map((item) => {
            const barPos = getBarPosition(item);
            const statusColor = STATUS_COLORS[item.status];

              return (
                <div 
                  key={item.id}
                  className={cn(
                    "flex border-b border-border hover:bg-secondary transition-colors",
                    hoveredItem === item.id && "bg-brand-gold/5",
                    isRTL && "flex-row-reverse"
                  )}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                {/* Request Info - No tooltip here */}
                <div 
                  className={cn("shrink-0 px-3 py-3 overflow-hidden", isRTL ? "border-l border-border" : "border-r border-border")}
                  style={{ width: `${firstColumnWidth}px`, direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' }}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex items-center gap-0.5 shrink-0">
                      <span className="text-sm font-medium text-foreground">{item.rank}</span>
                      {(item.rank === 1 || item.rank === 3 || item.rank === 9) && (
                        <Lock className="h-3 w-3 text-brand-gold" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRequestId(item.id);
                        }}
                        className="text-xs text-brand-gold font-medium hover:underline cursor-pointer bg-transparent border-none p-0"
                      >
                        {item.id}
                      </button>
                      <div className="text-sm font-medium text-foreground truncate leading-tight">
                        {isRTL ? item.titleAr : item.titleEn}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {isRTL ? item.ownerAr : item.ownerEn}
                        <span className="mx-1">·</span>
                        <span style={{ color: statusColor }}>{isRTL ? STAGE_NAMES_AR[item.status] : STAGE_NAMES[item.status]}</span>
                        <span className="mx-1">·</span>
                        <span className="text-brand-gold">{isRTL ? PLATFORM_INFO[item.platform]?.nameAr : item.platform}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline Bar - Tooltip only here */}
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex-1 relative py-3 px-2 cursor-pointer">
                        {/* Today line */}
                        {todayPosition !== null && (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-destructive z-20 pointer-events-none"
                            style={{ left: `${todayPosition}%` }}
                          >
                            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-destructive rounded-full" />
                          </div>
                        )}
                        {/* Date labels */}
                        <div className="absolute text-xs text-muted-foreground" style={{ left: barPos.left, top: '2px' }}>
                          {formatDateLabel(item.startDate)}
                        </div>
                        <div 
                          className="absolute text-xs text-muted-foreground" 
                          style={{ left: `calc(${barPos.left} + ${barPos.width})`, top: '2px', transform: 'translateX(-100%)' }}
                        >
                          {formatDateLabel(item.endDate)}
                        </div>

                        {/* Bar */}
                        <div 
                          className="absolute h-5 rounded-full"
                          style={{ 
                            left: barPos.left, 
                            width: barPos.width, 
                            top: '50%', 
                            transform: 'translateY(-50%)',
                            background: `linear-gradient(90deg, ${statusColor}40, ${statusColor}60)`,
                            border: `1px solid ${statusColor}80`
                          }}
                        >
                          {/* Milestones with date tooltip */}
                          {showMilestones && item.milestones.map((ms) => {
                            const pos = getMilestonePosition(ms.date, item.startDate, item.endDate);
                            const msDate = new Date(ms.date);
                            const dateLabel = msDate.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' });
                            return (
                              <div
                                key={ms.step}
                                className={cn(
                                  "absolute w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-medium group cursor-pointer",
                                  ms.state === 'complete' && "bg-brand-gold border-brand-gold text-primary-foreground",
                                  ms.state === 'current' && "bg-card border-brand-gold text-brand-gold",
                                  ms.state === 'pending' && "bg-card border-muted-foreground/30 text-muted-foreground"
                                )}
                                style={{ left: `${pos}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
                                title={dateLabel}
                              >
                                {ms.state === 'complete' ? '✓' : ms.step}
                                {/* Date tooltip on hover */}
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-foreground text-primary-foreground text-xs px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                  {dateLabel}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </TooltipTrigger>

                    {/* Tooltip content - shows on hover over timeline only */}
                    <TooltipContent side="bottom" align="start" className="w-80 p-0 bg-card shadow-lg border border-border">
                      <div className="p-3 border-b border-border">
                        <div className="text-xs text-brand-gold font-medium">{item.id}</div>
                        <div className="text-sm font-semibold text-foreground">{isRTL ? item.titleAr : item.titleEn}</div>
                        <span 
                          className="inline-block mt-1.5 px-2 py-0.5 text-xs rounded-full"
                          style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
                        >
                          {isRTL ? STAGE_NAMES_AR[item.status] : STAGE_NAMES[item.status]}
                        </span>
                      </div>
                      {item.risks.length > 0 && (
                        <div className="p-3 border-b border-border">
                          <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-2">
                            {t.risks}
                            <span className="bg-muted px-1.5 py-0.5 rounded text-xs">{item.risks.length}</span>
                          </div>
                          {item.risks.map(risk => (
                            <div key={risk.sno} className="flex items-center justify-between text-xs py-0.5">
                              <span className="text-muted-foreground">{risk.sno}. {risk.title}</span>
                              <span className={cn(
                                "text-xs px-1.5 py-0.5 rounded",
                                risk.status === 'resolved' && "bg-success/10 text-success",
                                risk.status === 'pending' && "bg-brand-gold/10 text-brand-gold",
                                risk.status === 'blocked' && "bg-destructive/10 text-destructive"
                              )}>
                                {risk.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {item.dependencies.length > 0 && (
                        <div className="p-3">
                          <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-2">
                            {t.dependencies}
                            <span className="bg-muted px-1.5 py-0.5 rounded text-xs">{item.dependencies.length}</span>
                          </div>
                          {item.dependencies.map(dep => (
                            <div key={dep.sno} className="flex items-center justify-between text-xs py-0.5">
                              <span className="text-muted-foreground">{dep.sno}. {dep.title}</span>
                              <span className={cn(
                                "text-xs px-1.5 py-0.5 rounded",
                                dep.status === 'resolved' && "bg-success/10 text-success",
                                dep.status === 'pending' && "bg-brand-gold/10 text-brand-gold",
                                dep.status === 'blocked' && "bg-destructive/10 text-destructive"
                              )}>
                                {dep.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {item.risks.length === 0 && item.dependencies.length === 0 && (
                        <div className="p-3 text-xs text-muted-foreground text-center">
                          {isRTL ? 'لا توجد مخاطر أو اعتماديات' : 'No risks or dependencies'}
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            );
          })}
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:border-b-2 { border-bottom-width: 2px !important; }
          .print\\:gap-4 { gap: 1rem !important; }
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
