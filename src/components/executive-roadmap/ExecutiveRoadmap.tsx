import React, { useState, useMemo, useRef, useCallback } from 'react';
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
  FileDown, 
  Flag, 
  Menu,
  X,
  Lock
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type TimeScale = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
type Language = 'en' | 'ar';
type SortField = 'rank' | 'platform' | 'submission' | 'score' | 'target' | 'quarter' | 'owner';
type SortOrder = 'asc' | 'desc';

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
  const [timeScale, setTimeScale] = useState<TimeScale>('monthly');
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
  const containerRef = useRef<HTMLDivElement>(null);

  const t = TRANSLATIONS[language];
  const isRTL = language === 'ar';

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
      const quarters = ['Q4', 'Q1', 'Q2', 'Q3'];
      const years = [2024, 2025, 2025, 2025];
      for (let i = 0; i < 4; i++) {
        cols.push({
          label: quarters[i],
          subLabel: String(years[i])
        });
      }
    } else if (timeScale === 'yearly') {
      cols.push({ label: '2024', subLabel: '' });
      cols.push({ label: '2025', subLabel: '' });
    }

    return cols;
  }, [timeScale, isRTL]);

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

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
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
        "h-full flex flex-col bg-[#FAF8F5] overflow-hidden print:bg-white",
        isRTL && "direction-rtl",
        className
      )}
      style={{ direction: isRTL ? 'rtl' : 'ltr' }}
    >
      {/* Header with Status Pills - hidden in print */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[#E8E4DD] bg-white print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#C69C6D] flex items-center justify-center text-white font-bold text-xs">
            MIM
          </div>
          <div>
            <div className="text-[10px] text-[#C69C6D] font-medium tracking-wider">{t.executiveRoadmap}</div>
            <div className="text-sm font-semibold text-[#2C2825]">{t.industryRequests}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Pill Strip - pushed to right */}
          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-[#5C5650] uppercase tracking-wide mr-1">
              {isRTL ? 'الحالة:' : 'STATUS:'}
            </span>
            {kpiCards.map((kpi) => {
              const isActive = activeKPI === kpi.status;
              return (
                <button
                  key={kpi.status}
                  onClick={() => setActiveKPI(isActive ? null : kpi.status)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer border",
                    isActive 
                      ? "bg-[#F5EFE6] border-[#C69C6D] text-[#2C2825]" 
                      : "bg-[#F5F2ED] border-transparent text-[#5C5650] hover:bg-[#E8E4DD]"
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

          {/* Language toggle */}
          <div className="flex items-center bg-[#F5F2ED] rounded-lg p-0.5">
            <button
              onClick={() => setLanguage('en')}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded-md transition-all",
                language === 'en' ? "bg-[#C69C6D] text-white" : "text-[#5C5650] hover:text-[#2C2825]"
              )}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('ar')}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded-md transition-all",
                language === 'ar' ? "bg-[#C69C6D] text-white" : "text-[#5C5650] hover:text-[#2C2825]"
              )}
            >
              عربي
            </button>
          </div>

          {/* Export */}
          <Button variant="ghost" size="icon" onClick={handleExport} className="h-8 w-8">
            <FileDown className="h-4 w-4" />
          </Button>

          {/* Fullscreen */}
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="hidden sm:flex h-8 w-8">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 border-b border-[#E8E4DD] bg-white print:hidden">
        {/* Mobile menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="sm:hidden h-7">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side={isRTL ? "right" : "left"} className="w-[280px]">
            <div className="space-y-4 py-4">
              <div>
                <label className="text-xs font-medium text-[#5C5650] mb-2 block">{t.platform}</label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">{t.allPlatforms}</SelectItem>
                    {Object.keys(PLATFORM_INFO).map(p => (
                      <SelectItem key={p} value={p}>{isRTL ? PLATFORM_INFO[p].nameAr : p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#5C5650] mb-2 block">{t.status}</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">{t.allStatuses}</SelectItem>
                    {Object.entries(isRTL ? STAGE_NAMES_AR : STAGE_NAMES).map(([s, name]) => (
                      <SelectItem key={s} value={s}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#5C5650] mb-2 block">{t.owner}</label>
                <Select value={owner} onValueChange={setOwner}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">{t.allOwners}</SelectItem>
                    {uniqueOwners.map(o => {
                      const item = items.find(i => i.ownerEn === o);
                      return <SelectItem key={o} value={o}>{isRTL ? item?.ownerAr : o}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop filters */}
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-[10px] text-[#5C5650] font-medium uppercase">{t.platform}</span>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-[130px] h-7 text-xs bg-[#F5F2ED] border-0"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="all">{t.allPlatforms}</SelectItem>
              {Object.keys(PLATFORM_INFO).map(p => (
                <SelectItem key={p} value={p}>{isRTL ? PLATFORM_INFO[p].nameAr : p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-[10px] text-[#5C5650] font-medium uppercase">{t.status}</span>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[110px] h-7 text-xs bg-[#F5F2ED] border-0"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="all">{t.allStatuses}</SelectItem>
              {Object.entries(isRTL ? STAGE_NAMES_AR : STAGE_NAMES).map(([s, name]) => (
                <SelectItem key={s} value={s}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-[10px] text-[#5C5650] font-medium uppercase">{t.owner}</span>
          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger className="w-[130px] h-7 text-xs bg-[#F5F2ED] border-0"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="all">{t.allOwners}</SelectItem>
              {uniqueOwners.map(o => {
                const item = items.find(i => i.ownerEn === o);
                return <SelectItem key={o} value={o}>{isRTL ? item?.ownerAr : o}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Period dropdown - replaces time scale buttons */}
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-[10px] text-[#5C5650] font-medium uppercase">{isRTL ? 'الفترة' : 'PERIOD'}</span>
          <Select value={timeScale} onValueChange={(v) => setTimeScale(v as TimeScale)}>
            <SelectTrigger className="w-[100px] h-7 text-xs bg-[#F5F2ED] border-0"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="weekly">{t.weekly}</SelectItem>
              <SelectItem value="monthly">{t.monthly}</SelectItem>
              <SelectItem value="quarterly">{t.quarterly}</SelectItem>
              <SelectItem value="yearly">{t.yearly}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#5C5650] font-medium uppercase hidden sm:inline">{t.sortBy}</span>
          <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
            <SelectTrigger className="w-[80px] h-7 text-xs bg-[#F5F2ED] border-0"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="rank">{t.rank}</SelectItem>
              <SelectItem value="platform">{t.platform}</SelectItem>
              <SelectItem value="owner">{t.owner}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className={cn("h-7 w-7", sortOrder === 'asc' ? "bg-[#2C2825] text-white" : "")}
            onClick={() => setSortOrder('asc')}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={cn("h-7 w-7", sortOrder === 'desc' ? "bg-[#2C2825] text-white" : "")}
            onClick={() => setSortOrder('desc')}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>

        {/* Milestones toggle */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#5C5650] font-medium uppercase hidden sm:inline">{t.milestones}</span>
          <Switch 
            checked={showMilestones} 
            onCheckedChange={setShowMilestones}
            className="data-[state=checked]:bg-[#C69C6D] scale-90"
          />
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[1200px]">
          {/* Timeline Header */}
          <div className="flex border-b border-[#E8E4DD] bg-white sticky top-0 z-10">
            <div className="w-[320px] shrink-0 px-4 py-3 border-r border-[#E8E4DD] bg-[#F5F2ED]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#5C5650]">{t.businessRequest}</span>
                <span className="text-xs font-medium text-[#C69C6D] flex items-center gap-1">
                  <ChevronUp className="h-3 w-3" /> {t.rank}
                </span>
              </div>
            </div>
            <div className="flex-1 flex">
              {timelineColumns.map((col, i) => (
                <div 
                  key={i} 
                  className="flex-1 px-2 py-3 text-center border-r border-[#E8E4DD] last:border-r-0"
                >
                  <div className="text-xs font-medium text-[#2C2825]">{col.label}</div>
                  {col.subLabel && <div className="text-[10px] text-[#9A9389]">{col.subLabel}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {filteredItems.map((item) => {
            const barPos = getBarPosition(item);
            const statusColor = STATUS_COLORS[item.status];
            const hasRisksOrDeps = item.risks.length > 0 || item.dependencies.length > 0;

            return (
              <Popover key={item.id}>
                <PopoverTrigger asChild>
                  <div 
                    className={cn(
                      "flex border-b border-[#E8E4DD] hover:bg-[#FAF8F5] cursor-pointer transition-colors",
                      hoveredItem === item.id && "bg-[#F7F1E8]"
                    )}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    {/* Request Info */}
                    <div className="w-[320px] shrink-0 px-4 py-4 border-r border-[#E8E4DD]">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-[#2C2825]">{item.rank}</span>
                          {(item.rank === 1 || item.rank === 3 || item.rank === 9) && (
                            <Lock className="h-3 w-3 text-[#C69C6D]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-[#C69C6D] font-medium">{item.id}</div>
                          <div className="text-sm font-medium text-[#2C2825] truncate">
                            {isRTL ? item.titleAr : item.titleEn}
                          </div>
                          <div className="text-xs text-[#9A9389] mt-0.5">
                            {isRTL ? item.ownerAr : item.ownerEn}
                            <span className="mx-1">·</span>
                            <span style={{ color: statusColor }}>{isRTL ? STAGE_NAMES_AR[item.status] : STAGE_NAMES[item.status]}</span>
                            <span className="mx-1">·</span>
                            <span className="text-[#C69C6D]">{isRTL ? PLATFORM_INFO[item.platform]?.nameAr : item.platform}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Bar */}
                    <div className="flex-1 relative py-4 px-2">
                      {/* Date labels */}
                      <div className="absolute text-[10px] text-[#9A9389]" style={{ left: barPos.left, top: '4px' }}>
                        {formatDateLabel(item.startDate)}
                      </div>
                      <div 
                        className="absolute text-[10px] text-[#9A9389]" 
                        style={{ left: `calc(${barPos.left} + ${barPos.width})`, top: '4px', transform: 'translateX(-100%)' }}
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
                        {/* Milestones */}
                        {showMilestones && item.milestones.map((ms) => {
                          const pos = getMilestonePosition(ms.date, item.startDate, item.endDate);
                          return (
                            <div
                              key={ms.step}
                              className={cn(
                                "absolute w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-medium",
                                ms.state === 'complete' && "bg-[#C69C6D] border-[#C69C6D] text-white",
                                ms.state === 'current' && "bg-white border-[#C69C6D] text-[#C69C6D]",
                                ms.state === 'pending' && "bg-white border-[#C4BEB4] text-[#9A9389]"
                              )}
                              style={{ left: `${pos}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
                            >
                              {ms.state === 'complete' ? '✓' : ms.step}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </PopoverTrigger>

                {/* Tooltip/Popover */}
                {hasRisksOrDeps && (
                  <PopoverContent className="w-80 p-0" side="bottom" align="start">
                    <div className="p-4 border-b border-[#E8E4DD]">
                      <div className="text-xs text-[#C69C6D] font-medium">{item.id}</div>
                      <div className="text-sm font-semibold text-[#2C2825]">{isRTL ? item.titleAr : item.titleEn}</div>
                      <span 
                        className="inline-block mt-2 px-2 py-0.5 text-[10px] rounded-full"
                        style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
                      >
                        {isRTL ? STAGE_NAMES_AR[item.status] : STAGE_NAMES[item.status]}
                      </span>
                    </div>
                    {item.risks.length > 0 && (
                      <div className="p-4 border-b border-[#E8E4DD]">
                        <div className="text-xs font-medium text-[#5C5650] mb-2 flex items-center gap-2">
                          {t.risks}
                          <span className="bg-[#F5F2ED] px-1.5 py-0.5 rounded text-[10px]">{item.risks.length}</span>
                        </div>
                        {item.risks.map(risk => (
                          <div key={risk.sno} className="flex items-center justify-between text-xs py-1">
                            <span className="text-[#5C5650]">{risk.sno}. {risk.title}</span>
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded",
                              risk.status === 'resolved' && "bg-[#EEF2EF] text-[#4A6355]",
                              risk.status === 'pending' && "bg-[#F7F1E8] text-[#C69C6D]",
                              risk.status === 'blocked' && "bg-[#FCEAEA] text-[#9B6B6B]"
                            )}>
                              {risk.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {item.dependencies.length > 0 && (
                      <div className="p-4">
                        <div className="text-xs font-medium text-[#5C5650] mb-2 flex items-center gap-2">
                          {t.dependencies}
                          <span className="bg-[#F5F2ED] px-1.5 py-0.5 rounded text-[10px]">{item.dependencies.length}</span>
                        </div>
                        {item.dependencies.map(dep => (
                          <div key={dep.sno} className="flex items-center justify-between text-xs py-1">
                            <span className="text-[#5C5650]">{dep.sno}. {dep.title}</span>
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded",
                              dep.status === 'resolved' && "bg-[#EEF2EF] text-[#4A6355]",
                              dep.status === 'pending' && "bg-[#F7F1E8] text-[#C69C6D]",
                              dep.status === 'blocked' && "bg-[#FCEAEA] text-[#9B6B6B]"
                            )}>
                              {dep.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </PopoverContent>
                )}
              </Popover>
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
    </div>
  );
}

export default ExecutiveRoadmap;
