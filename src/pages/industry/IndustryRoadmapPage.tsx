/**
 * Industry Roadmap Page - Business Request Roadmap
 * Route: /industry/roadmaps-v1
 * 
 * Pixel-perfect clone of ProgramRoadmapPage.tsx
 * Swaps Programs → Business Requests from Supabase
 */

import React, { useState, useRef, useCallback, useMemo, useEffect, useLayoutEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Layers, Filter, Info, ChevronDown, Check, X, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import GlobalPageHeader from '@/components/layout/GlobalPageHeader';
import { TimelineFilterPopover, TimelineFilterState, DEFAULT_TIMELINE_FILTER } from '@/components/roadmap/TimelineFilterPopover';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { BusinessRequestDetailModal } from '@/components/business-requests/BusinessRequestDetailModal';
import { IndustryRoadmapFiltersDialog, IndustryFilters, DEFAULT_INDUSTRY_FILTERS, getCurrentQuarterDates, getNextQuarterDates } from '@/components/industry/IndustryRoadmapFiltersDialog';

// ===== TYPES =====
interface LinkedFeature {
  id: string;
  key: string;
  title: string;
  status: 'Open' | 'In Progress' | 'Done' | 'Closed';
}

interface Milestone {
  title: string;
  date: string;
  status: 'complete' | 'current' | 'pending' | 'overdue';
}

interface BusinessRequestItem {
  id: string;
  key: string;
  title: string;
  owner: string;
  ownerId: string | null;
  product: string;
  productId: string | null;
  department: string;
  departmentId: string | null;
  targetQuarters: string[];
  health: 'On Track' | 'At Risk' | 'Blocked';
  status: string;
  startDate: string;
  endDate: string;
  progress: number;
  rank: number | null;
  milestones: Milestone[];
  linkedFeatures: LinkedFeature[];
  hasDependencies?: boolean;
  isBlocked?: boolean;
  isBlocking?: boolean;
}

interface Product {
  id: string;
  name: string;
}

interface Owner {
  id: string;
  name: string;
}

interface Quarter {
  label: string;
  start: Date;
  end: Date;
}

// ===== CONSTANTS =====
const TODAY = new Date();
const QUARTER_COLUMN_WIDTH = 180; // px per quarter column
const MIN_VISIBLE_QUARTERS = 4;
const MAX_VISIBLE_QUARTERS = 12;
const QUARTER_BUFFER = 4; // extra quarters for scrolling

// ===== UTILITIES =====

/**
 * Generate quarters starting from a given offset before/after today's quarter
 * @param offsetFromToday - negative = quarters before today, 0 = today's quarter
 * @param count - total number of quarters to generate
 */
function generateQuartersFromToday(offsetFromToday: number, count: number): Quarter[] {
  const todayQuarter = Math.floor(TODAY.getMonth() / 3);
  const todayYear = TODAY.getFullYear();
  
  // Calculate starting quarter (add offset)
  let startQ = todayQuarter + offsetFromToday;
  let startYear = todayYear;
  
  // Normalize if offset pushes us to previous/next year
  while (startQ < 0) {
    startQ += 4;
    startYear -= 1;
  }
  while (startQ > 3) {
    startQ -= 4;
    startYear += 1;
  }
  
  return Array.from({ length: count }, (_, i) => {
    let q = startQ + i;
    let year = startYear;
    
    // Normalize quarter overflow
    while (q > 3) {
      q -= 4;
      year += 1;
    }
    
    const startMonth = q * 3;
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, startMonth + 3, 0);
    
    return {
      label: `Q${q + 1} ${year}`,
      start,
      end,
    };
  });
}

function generateQuartersForFilter(filter: TimelineFilterState): Quarter[] {
  const quarters: Quarter[] = [];
  const years = filter.selectedYears.length > 0 
    ? [...filter.selectedYears].sort((a, b) => a - b)
    : [TODAY.getFullYear()];
  const selectedQuarters = filter.selectedQuarters.length > 0
    ? [...filter.selectedQuarters].sort((a, b) => a - b)
    : [1, 2, 3, 4];

  for (const year of years) {
    for (const q of selectedQuarters) {
      const startMonth = (q - 1) * 3;
      quarters.push({
        label: `Q${q} ${year}`,
        start: new Date(year, startMonth, 1),
        end: new Date(year, startMonth + 3, 0),
      });
    }
  }
  return quarters;
}

function parseDate(str: string | null): Date {
  if (!str) return new Date();

  // Parse date-only strings safely (avoid locale parsing)
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(str);

  if (Number.isNaN(d.getTime())) {
    console.warn(`[Roadmap] Invalid date string: ${str}`);
    return new Date();
  }

  return d;
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

function formatDateRange(start: string, end: string): string {
  return `${formatDate(start)} → ${formatDate(end)}`;
}

function getOwnerInitials(name: string): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Map process_step to health
function mapHealthFromStatus(processStep: string | null, health: string | null): 'On Track' | 'At Risk' | 'Blocked' {
  if (health === 'red' || processStep === 'on_hold') return 'Blocked';
  if (health === 'yellow') return 'At Risk';
  return 'On Track';
}


// ===== COMPONENT =====
export default function IndustryRoadmapPage() {
  // State
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState<'none' | 'owner' | 'product' | 'quarters' | 'department'>('none');
  const [showMilestones, setShowMilestones] = useState(true);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilterState>(DEFAULT_TIMELINE_FILTER);
  const [isTimelineAuto, setIsTimelineAuto] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  
  // Filter state
  const [filters, setFilters] = useState<IndustryFilters>(DEFAULT_INDUSTRY_FILTERS);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  
  // Dropdown states
  const [groupByMenuOpen, setGroupByMenuOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  
  // Tooltip state
  const [tooltip, setTooltip] = useState<{ visible: boolean; request: BusinessRequestItem | null; x: number; y: number }>({
    visible: false,
    request: null,
    x: 0,
    y: 0
  });
  
  // Refs for scroll sync and resize
  const listBodyRef = useRef<HTMLDivElement>(null);
  const timelineBodyRef = useRef<HTMLDivElement>(null);
  const timelineHeaderRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  
  // Responsive quarter count based on container width
  const [containerWidth, setContainerWidth] = useState(0);
  
  // Measure container width with ResizeObserver
  useLayoutEffect(() => {
    const container = timelineContainerRef.current;
    if (!container) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    
    observer.observe(container);
    // Initial measurement
    setContainerWidth(container.clientWidth);
    
    return () => observer.disconnect();
  }, []);
  
  // Calculate visible quarter count from container width
  const visibleQuarterCount = useMemo(() => {
    if (containerWidth === 0) return MIN_VISIBLE_QUARTERS;
    const count = Math.floor(containerWidth / QUARTER_COLUMN_WIDTH);
    return Math.max(MIN_VISIBLE_QUARTERS, Math.min(MAX_VISIBLE_QUARTERS, count));
  }, [containerWidth]);
  
  // Total quarters = visible + buffer for scrolling
  const totalQuarterCount = visibleQuarterCount + QUARTER_BUFFER;
  
  // Dynamic timeline quarters
  // Auto mode: start 1 quarter before today, show visibleQuarterCount + buffer
  // Custom mode: driven by TimelineFilterPopover selections
  const visibleQuarters = useMemo(() => {
    if (!isTimelineAuto) {
      return generateQuartersForFilter(timelineFilter);
    }
    // Start 1 quarter before today for context, generate enough quarters
    return generateQuartersFromToday(-1, totalQuarterCount);
  }, [isTimelineAuto, timelineFilter, totalQuarterCount]);
  
  // Timeline calculation helpers
  const getTimelineStart = useCallback(() => {
    return visibleQuarters.length > 0 ? visibleQuarters[0].start : new Date();
  }, [visibleQuarters]);
  
  const getTimelineEnd = useCallback(() => {
    return visibleQuarters.length > 0 ? visibleQuarters[visibleQuarters.length - 1].end : new Date();
  }, [visibleQuarters]);
  
  const dateToPercent = useCallback((date: Date | string): number => {
    const d = typeof date === 'string' ? parseDate(date) : date;
    const start = getTimelineStart();
    const end = getTimelineEnd();
    const total = end.getTime() - start.getTime();
    const offset = d.getTime() - start.getTime();
    if (total <= 0 || Number.isNaN(total) || Number.isNaN(offset)) return 0;
    return Math.max(0, Math.min(100, (offset / total) * 100));
  }, [getTimelineStart, getTimelineEnd]);
  
  const todayPercent = useMemo(() => dateToPercent(TODAY), [dateToPercent]);
  
  // Fetch business requests with milestones
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['industry-roadmap-requests'],
    queryFn: async () => {
      const { data, error } = await typedQuery('business_requests')
        .select(`
          id,
          request_key,
          title,
          process_step,
          health,
          start_date,
          end_date,
          impl_start_date,
          impl_target_end_date,
          business_owner,
          business_owner_id,
          product_id,
          department_id,
          planned_quarter,
          rank,
          business_score,
          progress,
          created_at,
          products (
            id,
            name
          ),
          business_owners (
            id,
            name
          ),
          departments (
            id,
            name
          ),
          milestones (
            id,
            title,
            start_date,
            end_date,
            state,
            completed_date
          )
        `)
        .is('deleted_at', null)
        .order('business_score', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return (data || []) as any[];
    },
  });
  
  // Fetch products for filter
  const { data: productsData } = useQuery({
    queryKey: ['industry-roadmap-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });
  
  // Fetch owners for filter
  const { data: ownersData } = useQuery({
    queryKey: ['industry-roadmap-owners'],
    queryFn: async () => {
      const { data, error } = await typedQuery('business_owners')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string }>;
    },
  });

  // Fetch process steps for filter (dynamic from DB)
  const { data: processStepsData } = useQuery({
    queryKey: ['industry-roadmap-process-steps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demand_process_steps')
        .select('id, value, label, sort_order')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  // Transform to BusinessRequestItem format
  const businessRequests: BusinessRequestItem[] = useMemo(() => {
    // First pass: filter scored items to calculate ranks
    const scoredItems = (requestsData || []).filter((req: any) => req.business_score != null);
    
    return (requestsData || []).map((req: any, index: number) => {
      // Canonical date logic: prefer impl_start_date → impl_target_end_date
      // Fallback to start_date → end_date if impl dates are missing OR inverted
      let startDate: string;
      let endDate: string | null;
      
      const hasImplDates = req.impl_start_date && req.impl_target_end_date;
      const implDatesInverted = hasImplDates && new Date(req.impl_start_date) > new Date(req.impl_target_end_date);
      
      if (hasImplDates && !implDatesInverted) {
        // Use impl dates (canonical)
        startDate = req.impl_start_date;
        endDate = req.impl_target_end_date;
      } else {
        // Fallback to start_date/end_date
        startDate = req.start_date || req.created_at;
        endDate = req.end_date || null;
        
        // Log warning for data quality tracking
        if (implDatesInverted) {
          console.warn(
            `[Roadmap] Inverted impl dates for demand ${req.id} (${req.request_key || req.title}): ` +
            `impl_start_date=${req.impl_start_date} > impl_target_end_date=${req.impl_target_end_date}. ` +
            `Falling back to start_date/end_date.`
          );
        } else if (req.impl_start_date || req.impl_target_end_date) {
          console.warn(
            `[Roadmap] Missing impl dates for demand ${req.id} (${req.request_key || req.title}): ` +
            `impl_start_date=${req.impl_start_date}, impl_target_end_date=${req.impl_target_end_date}. ` +
            `Falling back to start_date/end_date.`
          );
        }
      }
      
      // Default end date if still missing (3 months from start)
      const actualEndDate = endDate || (() => {
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + 3);
        return d.toISOString().split('T')[0];
      })();
      
      // Transform milestones from DB format to UI format
      const transformedMilestones: Milestone[] = (req.milestones || []).map((m: any) => {
        const endDate = m.end_date ? new Date(m.end_date) : null;
        const today = new Date();
        
        // Determine status based on state and dates
        let status: 'complete' | 'current' | 'pending' | 'overdue';
        if (m.state === 'completed' || m.completed_date) {
          status = 'complete';
        } else if (endDate && endDate < today) {
          status = 'overdue';
        } else if (m.state === 'in_progress') {
          status = 'current';
        } else {
          status = 'pending';
        }
        
        return {
          title: m.title,
          date: m.end_date || m.start_date || '',
          status,
        };
      });
      
      // Compute rank: use explicit rank if set, otherwise calculate from position among scored items
      let computedRank: number | null = null;
      if (req.rank != null) {
        computedRank = req.rank;
      } else if (req.business_score != null) {
        // Find position among scored items (already sorted by business_score desc)
        const positionInScored = scoredItems.findIndex((r: any) => r.id === req.id);
        computedRank = positionInScored >= 0 ? positionInScored + 1 : null;
      }
      
      return {
        id: req.id,
        key: req.request_key || `BR-${req.id.slice(0, 4).toUpperCase()}`,
        title: req.title,
        owner: req.business_owners?.name || req.business_owner || 'Unassigned',
        ownerId: req.business_owner_id,
        product: req.products?.name || 'No Product',
        productId: req.product_id,
        department: req.departments?.name || 'No Department',
        departmentId: req.department_id,
        targetQuarters: req.planned_quarter || [],
        health: mapHealthFromStatus(req.process_step, req.health),
        status: req.process_step || 'new',
        startDate: startDate,
        endDate: actualEndDate,
        progress: req.progress || 0,
        rank: computedRank,
        milestones: transformedMilestones,
        linkedFeatures: [],
        hasDependencies: false,
        isBlocked: req.process_step === 'on_hold',
        isBlocking: false,
      };
    });
  }, [requestsData]);
  
  // Helper to check if request is overdue
  const isRequestOverdue = (request: BusinessRequestItem): boolean => {
    const endDate = parseDate(request.endDate);
    return endDate < TODAY && request.progress < 100;
  };
  
  // Helper to check if request is active in a period
  const isRequestActiveInPeriod = (request: BusinessRequestItem, filters: IndustryFilters): boolean => {
    if (filters.activeInPeriod === 'any') return true;
    
    const requestStart = parseDate(request.startDate);
    const requestEnd = parseDate(request.endDate);
    
    let periodStart: Date;
    let periodEnd: Date;
    
    if (filters.activeInPeriod === 'this-quarter') {
      const quarter = getCurrentQuarterDates();
      periodStart = quarter.start;
      periodEnd = quarter.end;
    } else if (filters.activeInPeriod === 'next-quarter') {
      const quarter = getNextQuarterDates();
      periodStart = quarter.start;
      periodEnd = quarter.end;
    } else if (filters.activeInPeriod === 'custom') {
      if (!filters.customRangeStart || !filters.customRangeEnd) return true;
      periodStart = filters.customRangeStart;
      periodEnd = filters.customRangeEnd;
    } else {
      return true;
    }
    
    return requestStart <= periodEnd && requestEnd >= periodStart;
  };
  
  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.owners.length > 0) count += filters.owners.length;
    if (filters.products.length > 0) count += filters.products.length;
    if (filters.status.length > 0) count += filters.status.length;
    if (filters.health.length > 0) count += filters.health.length;
    if (filters.activeInPeriod !== 'any') count += 1;
    if (filters.overdueOnly) count += 1;
    return count;
  }, [filters]);
  
  // Filter requests
  const filteredRequests = useMemo(() => {
    let filtered = [...businessRequests];
    
    // Text search
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.key.toLowerCase().includes(s) ||
        r.title.toLowerCase().includes(s) ||
        r.owner.toLowerCase().includes(s)
      );
    }
    
    // Owner filter
    if (filters.owners.length > 0) {
      filtered = filtered.filter(r => r.ownerId && filters.owners.includes(r.ownerId));
    }
    
    // Product filter
    if (filters.products.length > 0) {
      filtered = filtered.filter(r => r.productId && filters.products.includes(r.productId));
    }
    
    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(r => filters.status.includes(r.status));
    }
    
    // Health filter
    if (filters.health.length > 0) {
      filtered = filtered.filter(r => filters.health.includes(r.health));
    }
    
    // Active in period filter
    if (filters.activeInPeriod !== 'any') {
      filtered = filtered.filter(r => isRequestActiveInPeriod(r, filters));
    }
    
    // Overdue filter
    if (filters.overdueOnly) {
      filtered = filtered.filter(r => isRequestOverdue(r));
    }
    
    return filtered;
  }, [businessRequests, search, filters]);
  
  // Handle filter change from dialog
  const handleFiltersChange = (newFilters: IndustryFilters) => {
    setFilters(newFilters);
  };
  
  // Group requests
  const groupedRequests = useMemo(() => {
    // Handle 'none' - flat list, no grouping
    if (groupBy === 'none') {
      return [{ key: '__flat__', requests: filteredRequests }];
    }
    
    const groups: Record<string, BusinessRequestItem[]> = {};
    
    filteredRequests.forEach(request => {
      if (groupBy === 'quarters') {
        // For quarters, a request can appear in multiple groups if it spans multiple quarters
        const quarters = request.targetQuarters.length > 0 ? request.targetQuarters : ['No Quarter'];
        quarters.forEach(quarter => {
          if (!groups[quarter]) groups[quarter] = [];
          groups[quarter].push(request);
        });
      } else {
        let key: string;
        if (groupBy === 'product') key = request.product;
        else if (groupBy === 'owner') key = request.owner;
        else if (groupBy === 'department') key = request.department;
        else key = 'All';
        
        if (!groups[key]) groups[key] = [];
        groups[key].push(request);
      }
    });
    
    // Sort groups - quarters should be sorted chronologically
    const entries = Object.entries(groups);
    if (groupBy === 'quarters') {
      entries.sort((a, b) => {
        if (a[0] === 'No Quarter') return 1;
        if (b[0] === 'No Quarter') return -1;
        // Parse quarter format like "Q1 2025"
        const parseQuarter = (q: string) => {
          const match = q.match(/Q(\d)\s*(\d{4})/);
          if (!match) return 0;
          return parseInt(match[2]) * 10 + parseInt(match[1]);
        };
        return parseQuarter(a[0]) - parseQuarter(b[0]);
      });
    }
    
    return entries.map(([key, requests]) => ({ key, requests }));
  }, [filteredRequests, groupBy]);
  
  // Toggle group collapse
  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  
  // Scroll sync
  const handleListScroll = useCallback(() => {
    if (listBodyRef.current && timelineBodyRef.current) {
      timelineBodyRef.current.scrollTop = listBodyRef.current.scrollTop;
    }
  }, []);
  
  const handleTimelineScroll = useCallback(() => {
    if (listBodyRef.current && timelineBodyRef.current) {
      listBodyRef.current.scrollTop = timelineBodyRef.current.scrollTop;
    }
    // Sync horizontal scroll to header
    if (timelineBodyRef.current && timelineHeaderRef.current) {
      timelineHeaderRef.current.scrollLeft = timelineBodyRef.current.scrollLeft;
    }
  }, []);
  
  // Tooltip handlers
  const showTooltip = useCallback((e: React.MouseEvent, request: BusinessRequestItem) => {
    setTooltip({
      visible: true,
      request,
      x: e.clientX + 16,
      y: e.clientY + 16
    });
  }, []);
  
  const moveTooltip = useCallback((e: React.MouseEvent) => {
    if (!tooltip.visible) return;
    
    let x = e.clientX + 16;
    let y = e.clientY + 16;
    
    if (x + 300 > window.innerWidth - 20) x = e.clientX - 316;
    if (y + 400 > window.innerHeight - 20) y = e.clientY - 400;
    
    setTooltip(prev => ({ ...prev, x, y }));
  }, [tooltip.visible]);
  
  const hideTooltip = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);
  
  // Handle row click - open drawer
  const handleRowClick = useCallback((request: BusinessRequestItem) => {
    setSelectedRequestId(request.id);
  }, []);
  
  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = () => {
      setGroupByMenuOpen(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
  
  // todayPercent is now computed above via useMemo
  
  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-background overflow-hidden">
        <GlobalPageHeader sectionLabel="INDUSTRY" pageTitle="Business Request Roadmap" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <GlobalPageHeader 
        sectionLabel="INDUSTRY" 
        pageTitle="Business Request Roadmap"
        toolbar={
          <div className="flex items-center justify-between w-full">
            {/* Left: Search → Group by → Filters */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  className="h-9 w-52 pl-9 pr-8 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-brand-primary"
                  placeholder="Search requests..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button 
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setSearch('')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              
              {/* Group By */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button 
                  className="h-9 px-3 flex items-center gap-2 text-sm border border-border rounded-lg bg-background hover:bg-muted"
                  onClick={() => setGroupByMenuOpen(!groupByMenuOpen)}
                >
                  <Layers size={16} />
                  Group by
                  <ChevronDown size={12} />
                </button>
                {groupByMenuOpen && (
                  <div className="absolute top-full mt-1 left-0 w-40 py-1 bg-background border border-border rounded-lg shadow-lg z-50">
                    {[
                      { value: 'none', label: 'None' },
                      { value: 'owner', label: 'Business Owner' },
                      { value: 'product', label: 'Product' },
                      { value: 'quarters', label: 'Quarters' },
                      { value: 'department', label: 'Department' }
                    ].map(option => (
                      <div
                        key={option.value}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-muted",
                          groupBy === option.value && "text-brand-primary"
                        )}
                        onClick={() => {
                          setGroupBy(option.value as typeof groupBy);
                          setCollapsedGroups(new Set());
                          setGroupByMenuOpen(false);
                        }}
                      >
                        {option.label}
                        {groupBy === option.value && <Check size={16} className="text-brand-primary" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Filters Button */}
              <button 
                className={cn(
                  "h-9 px-3 flex items-center gap-2 text-sm border border-border rounded-lg bg-background hover:bg-muted",
                  activeFilterCount > 0 && "border-brand-primary text-brand-primary"
                )}
                onClick={() => setFiltersDialogOpen(true)}
              >
                <Filter size={16} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-semibold bg-brand-primary text-white rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
            
            {/* Right: Milestones toggle + Year + Info */}
            <div className="flex items-center gap-3">
              {/* Milestones Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Milestones</span>
                <div 
                  className={cn(
                    "w-10 h-5 rounded-full cursor-pointer transition-colors relative",
                    showMilestones ? "bg-brand-primary" : "bg-muted"
                  )}
                  onClick={() => setShowMilestones(!showMilestones)}
                >
                  <div className={cn(
                    "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                    showMilestones ? "translate-x-5" : "translate-x-0.5"
                  )} />
                </div>
              </div>
              
              <div className="w-px h-6 bg-border" />
              
              {/* Timeline Filter Popover */}
              <TimelineFilterPopover
                value={timelineFilter}
                onChange={(next) => {
                  setIsTimelineAuto(false);
                  setTimelineFilter(next);
                }}
              />
              
              {/* Info Button */}
              <button
                className={cn(
                  "h-9 w-9 flex items-center justify-center border border-border rounded-lg transition-colors",
                  legendOpen 
                    ? "bg-brand-primary text-white border-brand-primary" 
                    : "bg-background text-muted-foreground hover:bg-muted"
                )}
                onClick={() => setLegendOpen(!legendOpen)}
              >
                <Info size={16} />
              </button>
            </div>
          </div>
        }
      />
      
      {/* Roadmap Container */}
      <div className="flex-1 flex overflow-hidden border-t border-border">
        {/* Left List Panel */}
        <div className="w-[36%] min-w-[340px] max-w-[480px] border-r border-border flex flex-col">
          <div className="h-10 px-4 flex items-center border-b border-border bg-background">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              BUSINESS REQUESTS
            </span>
          </div>
          
          <div
            ref={listBodyRef}
            onScroll={handleListScroll}
            className="flex-1 overflow-y-auto"
          >
            {businessRequests.length === 0 ? (
              /* True empty state - no data at all */
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Home size={28} className="text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">No business requests yet</h3>
                <p className="text-sm text-muted-foreground max-w-[260px]">
                  Create your first business request to see it on the roadmap timeline.
                </p>
              </div>
            ) : groupedRequests.length === 0 ? (
              /* Filtered empty state - data exists but filtered out */
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Filter size={24} className="text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">No matching requests</h3>
                <p className="text-sm text-muted-foreground max-w-[240px]">
                  Try adjusting your filters or search to find what you're looking for.
                </p>
                {(search || activeFilterCount > 0) && (
                  <button 
                    className="mt-3 text-sm text-brand-primary hover:underline"
                    onClick={() => {
                      setSearch('');
                      setFilters(DEFAULT_INDUSTRY_FILTERS);
                    }}
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              groupedRequests.map(group => {
                const isCollapsed = collapsedGroups.has(group.key);
                const isFlat = groupBy === 'none';
                
                return (
                  <React.Fragment key={group.key}>
                    {/* Group Header - skip for flat list */}
                    {!isFlat && (
                      <div
                        onClick={() => toggleGroup(group.key)}
                        className="h-11 px-3 pl-4 flex items-center gap-2 border-b border-border bg-muted/50 cursor-pointer hover:bg-muted"
                      >
                        <div className={cn(
                          "w-5 h-5 flex items-center justify-center text-muted-foreground text-xs transition-transform",
                          isCollapsed && "-rotate-90"
                        )}>
                          ▾
                        </div>
                        <div className="w-[3px] h-6 rounded bg-brand-primary" />
                        <div className="flex-1">
                          <div className="text-[13px] font-semibold text-foreground">{group.key}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {group.requests.length} request{group.requests.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                      </div>
                    )}
                    
                    {/* Request Rows */}
                    {(isFlat || !isCollapsed) && group.requests.map(request => (
                      <div
                        key={request.id}
                        onMouseEnter={(e) => showTooltip(e, request)}
                        onMouseMove={moveTooltip}
                        onMouseLeave={hideTooltip}
                        onClick={() => handleRowClick(request)}
                        className="h-14 px-3 pl-4 flex items-center gap-2.5 border-b border-border bg-background cursor-pointer hover:bg-muted"
                      >
                        {/* Icon */}
                        <div className="w-7 h-7 rounded-full border-2 border-brand-primary flex items-center justify-center flex-shrink-0">
                          <div className="w-2.5 h-2.5 rounded-full bg-brand-primary" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-foreground truncate">
                            {request.rank != null && (
                              <span className="text-muted-foreground mr-1">#{request.rank}</span>
                            )}
                            {request.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {formatDateRange(request.startDate, request.endDate)}
                          </div>
                        </div>
                        
                        {/* Status Badge */}
                        <div
                          className="px-2 py-1 rounded text-[10px] font-medium flex-shrink-0 capitalize"
                          style={{
                            backgroundColor: `var(--process-${(request.status || 'new_demand').replace(/_/g, '-')})`,
                            color: 'hsl(var(--primary-foreground))',
                          }}
                        >
                          {request.status?.replace(/_/g, ' ') || 'New'}
                        </div>
                      </div>
                    ))}
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
        
        {/* Right Timeline Panel */}
        <div ref={timelineContainerRef} className="flex-1 flex flex-col overflow-hidden">
          {/* Timeline Header - scrolls horizontally with body, uses same width as body */}
          <div 
            ref={timelineHeaderRef}
            className="h-10 border-b border-border bg-background overflow-x-hidden"
          >
            <div className="relative" style={{ width: `${visibleQuarters.length * QUARTER_COLUMN_WIDTH}px` }}>
              {/* Quarter labels */}
              <div className="flex h-10">
                {visibleQuarters.map((q, i) => (
                  <div
                    key={q.label}
                    className={cn(
                      "flex-1 h-10 flex items-center justify-center text-xs font-medium text-muted-foreground",
                      i < visibleQuarters.length - 1 && "border-r border-border"
                    )}
                  >
                    {q.label}
                  </div>
                ))}
              </div>
              {/* TODAY Badge - positioned using same todayPercent as the line */}
              {todayPercent >= 0 && todayPercent <= 100 && (
                <div
                  className="absolute top-1.5 bg-secondary-bronze text-white text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider z-10"
                  style={{ 
                    left: `${todayPercent}%`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  TODAY
                </div>
              )}
            </div>
          </div>
          
          {/* Timeline Body */}
          <div
            ref={timelineBodyRef}
            onScroll={handleTimelineScroll}
            className="flex-1 overflow-auto relative"
          >
            {/* Empty state overlay when no data */}
            {(businessRequests.length === 0 || groupedRequests.length === 0) && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <div className="text-sm text-muted-foreground">
                  {businessRequests.length === 0 
                    ? 'Create business requests to visualize your roadmap'
                    : 'Adjust filters to view requests on the timeline'
                  }
                </div>
              </div>
            )}
            
            <div className="relative" style={{ width: `${visibleQuarters.length * QUARTER_COLUMN_WIDTH}px`, minHeight: '100%' }}>
              {/* Grid Lines */}
              <div className="absolute inset-0 flex pointer-events-none">
                {visibleQuarters.map((q, i) => (
                  <div
                    key={q.label}
                    className={cn(
                      "flex-1",
                      i < visibleQuarters.length - 1 && "border-r border-border"
                    )}
                  />
                ))}
              </div>
              
              {/* Today Line */}
              {todayPercent >= 0 && todayPercent <= 100 && (
                <div
                  className="absolute top-0 w-0.5 bg-secondary-bronze z-10 pointer-events-none"
                  style={{
                    left: `${todayPercent}%`,
                    height: `${groupedRequests.reduce((acc, g) => {
                      const collapsed = collapsedGroups.has(g.key);
                      const isFlat = groupBy === 'none';
                      const headerHeight = isFlat ? 0 : 44;
                      return acc + headerHeight + (collapsed && !isFlat ? 0 : g.requests.length * 56);
                    }, 0)}px`
                  }}
                />
              )}
              
              {/* Rows */}
              {groupedRequests.map(group => {
                const isCollapsed = collapsedGroups.has(group.key);
                const isFlat = groupBy === 'none';
                
                return (
                  <React.Fragment key={group.key}>
                    {/* Group Row - skip for flat list */}
                    {!isFlat && (
                      <div className={cn(
                        "h-11 border-b border-border bg-muted/50",
                        isCollapsed && "hidden"
                      )} />
                    )}
                    
                    {/* Request Rows */}
                    {(isFlat || !isCollapsed) && group.requests.map(request => {
                      const startPct = dateToPercent(request.startDate);
                      const endPct = dateToPercent(request.endDate);
                      // Ensure minimum visible width
                      const width = Math.max(endPct - startPct, 1.5);
                      
                      
                      return (
                        <div
                          key={request.id}
                          onMouseEnter={(e) => showTooltip(e, request)}
                          onMouseMove={moveTooltip}
                          onMouseLeave={hideTooltip}
                          onClick={() => handleRowClick(request)}
                          className="h-14 border-b border-border bg-background relative hover:bg-muted cursor-pointer"
                        >
                          {/* Bar - using percentage positioning on fixed-width container */}
                          <div
                            className="absolute top-1/2 -translate-y-1/2 h-2 z-[5]"
                            style={{ left: `${startPct}%`, width: `${width}%`, minWidth: '10px' }}
                          >
                            {/* Track (status color) */}
                            <div
                              className="absolute inset-0 rounded-sm opacity-20"
                              style={{ backgroundColor: `var(--process-${(request.status || 'new_demand').replace(/_/g, '-')})` }}
                            />
                            {/* Progress (status color) */}
                            <div
                              className="absolute left-0 top-0 h-full rounded-sm"
                              style={{
                                width: `${request.progress}%`,
                                backgroundColor: `var(--process-${(request.status || 'new_demand').replace(/_/g, '-')})`,
                              }}
                            />
                          </div>
                          
                          {/* Milestones */}
                          {showMilestones && request.milestones.map((ms, i) => {
                            const msPct = dateToPercent(ms.date);
                            return (
                              <div
                                key={i}
                                className={cn(
                                  "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 border-2 z-[3]",
                                  ms.status === 'complete' && "bg-brand-primary border-brand-primary",
                                  ms.status === 'current' && "bg-background border-brand-gold",
                                  ms.status === 'pending' && "bg-background border-secondary-champagne",
                                  ms.status === 'overdue' && "bg-destructive border-destructive"
                                )}
                                style={{ left: `${msPct}%` }}
                              />
                            );
                          })}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Tooltip */}
      {tooltip.visible && tooltip.request && (
        <div
          className="fixed bg-background border border-border rounded-xl shadow-lg p-3.5 w-[300px] z-[1000] pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {/* Header */}
          <div className="mb-2.5 pb-2.5 border-b border-border">
            <div className="text-[11px] font-semibold text-brand-primary mb-0.5">
              {tooltip.request.key}
            </div>
            <div className="text-sm font-semibold text-foreground">
              {tooltip.request.title}
            </div>
          </div>
          
          {/* Details */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium text-foreground capitalize">
                {tooltip.request.status?.replace(/_/g, ' ') || 'New'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Dates</span>
              <span className="font-medium text-foreground">
                {formatDateRange(tooltip.request.startDate, tooltip.request.endDate)}
              </span>
            </div>
            {tooltip.request.hasDependencies && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Risks</span>
                <span className="font-medium text-destructive flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  Has dependencies
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Product</span>
              <span className="font-medium text-foreground">{tooltip.request.product || 'Unassigned'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">{tooltip.request.progress}%</span>
            </div>
          </div>
          
          {/* Linked Milestones */}
          <div className="mt-2.5 pt-2.5 border-t border-border">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Linked Milestones
            </div>
            {tooltip.request.milestones.length === 0 ? (
              <div className="text-[11px] text-muted-foreground italic">
                No milestones defined
              </div>
            ) : (
              <div className="max-h-[180px] overflow-auto pr-1.5 space-y-1">
                {tooltip.request.milestones.map((milestone, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                    <div className={cn(
                      "w-2 h-2 rotate-45 flex-shrink-0",
                      milestone.status === 'complete' && "bg-brand-primary",
                      milestone.status === 'current' && "border border-brand-gold bg-background",
                      milestone.status === 'pending' && "border border-secondary-champagne bg-background",
                      milestone.status === 'overdue' && "bg-destructive"
                    )} />
                    <span className="text-foreground truncate flex-1">{milestone.title}</span>
                    <span className="text-muted-foreground flex-shrink-0">{formatDate(milestone.date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Legend Panel */}
      {legendOpen && (
        <div className="fixed top-40 right-5 bg-background border border-border rounded-xl shadow-lg p-4 w-[220px] z-50">
          {/* Close button */}
          <button
            onClick={() => setLegendOpen(false)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          
          {/* Status Section - Process Steps */}
          <div className="mb-4">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
              Status
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ backgroundColor: 'var(--process-new-demand)' }} />
                <span className="text-foreground">New Demand</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ backgroundColor: 'var(--process-in-review)' }} />
                <span className="text-foreground">In Review</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ backgroundColor: 'var(--process-ea-review)' }} />
                <span className="text-foreground">EA Review</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ backgroundColor: 'var(--process-analyse)' }} />
                <span className="text-foreground">Analyse</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ backgroundColor: 'var(--process-approved)' }} />
                <span className="text-foreground">Approved</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ backgroundColor: 'var(--process-ready-to-implement)' }} />
                <span className="text-foreground">Ready to Implement</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ backgroundColor: 'var(--process-implement)' }} />
                <span className="text-foreground">Implement</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ backgroundColor: 'var(--process-closed)' }} />
                <span className="text-foreground">Closed</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ backgroundColor: 'var(--process-on-hold)' }} />
                <span className="text-foreground">On Hold</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ backgroundColor: 'var(--process-rejected)' }} />
                <span className="text-foreground">Rejected</span>
              </div>
            </div>
          </div>
          
          {/* Divider */}
          <div className="border-t border-border mb-4" />
          
          {/* Milestones Section */}
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
              Milestones
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-3 h-3 rotate-45 bg-brand-primary flex-shrink-0" />
                <span className="text-foreground">Completed</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-3 h-3 rotate-45 border-2 border-brand-gold bg-background flex-shrink-0" />
                <span className="text-foreground">Current</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-3 h-3 rotate-45 border-2 border-secondary-champagne bg-background flex-shrink-0" />
                <span className="text-foreground">Pending</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Filters Dialog */}
      <IndustryRoadmapFiltersDialog
        open={filtersDialogOpen}
        onOpenChange={setFiltersDialogOpen}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        owners={ownersData || []}
        products={productsData || []}
        processSteps={processStepsData || []}
      />
      
      {/* Business Request Detail Modal */}
      <BusinessRequestDetailModal
        requestId={selectedRequestId}
        isOpen={!!selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
      />
    </div>
  );
}
