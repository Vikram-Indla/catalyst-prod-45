/**
 * Industry Roadmap Page - Business Request Roadmap
 * Route: /industry/roadmaps-v1
 * 
 * Pixel-perfect clone of ProgramRoadmapPage.tsx
 * Swaps Programs → Business Requests from Supabase
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Layers, Filter, Info, ChevronDown, Check, X, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import GlobalPageHeader from '@/components/layout/GlobalPageHeader';
import { TimelineFilterPopover, TimelineFilterState, DEFAULT_TIMELINE_FILTER } from '@/components/roadmap/TimelineFilterPopover';
import { supabase } from '@/integrations/supabase/client';
import { BusinessRequestDrawer } from '@/components/business-requests/BusinessRequestDrawer';
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
  health: 'On Track' | 'At Risk' | 'Blocked';
  status: string;
  startDate: string;
  endDate: string;
  progress: number;
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

// ===== UTILITIES =====
const TODAY = new Date();

function generateQuarters(): Quarter[] {
  const quarters: Quarter[] = [];
  const currentYear = TODAY.getFullYear();
  
  for (let year = currentYear; year <= currentYear + 1; year++) {
    for (let q = 1; q <= 4; q++) {
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

const QUARTERS = generateQuarters();

function parseDate(str: string | null): Date {
  if (!str) return new Date();
  return new Date(str);
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function formatDateRange(start: string, end: string): string {
  return `${formatDate(start)} → ${formatDate(end)}`;
}

function getOwnerInitials(name: string): string {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getTimelineStart(): Date {
  return QUARTERS[0].start;
}

function getTimelineEnd(): Date {
  return QUARTERS[QUARTERS.length - 1].end;
}

function dateToPercent(date: Date | string): number {
  const d = typeof date === 'string' ? parseDate(date) : date;
  const start = getTimelineStart();
  const end = getTimelineEnd();
  const total = end.getTime() - start.getTime();
  const offset = d.getTime() - start.getTime();
  return Math.max(0, Math.min(100, (offset / total) * 100));
}

function getTodayPercent(): number {
  return dateToPercent(TODAY);
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
  const [groupBy, setGroupBy] = useState<'product' | 'owner' | 'health'>('product');
  const [showMilestones, setShowMilestones] = useState(true);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilterState>(DEFAULT_TIMELINE_FILTER);
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
  
  // Refs for scroll sync
  const listBodyRef = useRef<HTMLDivElement>(null);
  const timelineBodyRef = useRef<HTMLDivElement>(null);
  
  // Fetch business requests
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['industry-roadmap-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
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
          rank,
          progress,
          created_at,
          products (
            id,
            name
          ),
          business_owners (
            id,
            name
          )
        `)
        .is('deleted_at', null)
        .order('rank', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data || [];
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
      const { data, error } = await supabase
        .from('business_owners')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
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
    return (requestsData || []).map((req: any) => {
      const startDate = req.impl_start_date || req.start_date || req.created_at;
      const endDate = req.impl_target_end_date || req.end_date || null;
      
      // Default end date if missing (3 months from start)
      const actualEndDate = endDate || (() => {
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + 3);
        return d.toISOString().split('T')[0];
      })();
      
      return {
        id: req.id,
        key: req.request_key || `BR-${req.id.slice(0, 4).toUpperCase()}`,
        title: req.title,
        owner: req.business_owners?.name || req.business_owner || 'Unassigned',
        ownerId: req.business_owner_id,
        product: req.products?.name || 'No Product',
        productId: req.product_id,
        health: mapHealthFromStatus(req.process_step, req.health),
        status: req.process_step || 'new',
        startDate: startDate,
        endDate: actualEndDate,
        progress: req.progress || 0,
        milestones: [], // Could be enhanced to show linked features as milestones
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
    const groups: Record<string, BusinessRequestItem[]> = {};
    
    filteredRequests.forEach(request => {
      let key: string;
      if (groupBy === 'product') key = request.product;
      else if (groupBy === 'owner') key = request.owner;
      else if (groupBy === 'health') key = request.health;
      else key = 'All';
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(request);
    });
    
    return Object.entries(groups).map(([key, requests]) => ({ key, requests }));
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
  
  const todayPercent = getTodayPercent();
  
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
                      { value: 'product', label: 'Product' },
                      { value: 'owner', label: 'Business Owner' },
                      { value: 'health', label: 'Health' }
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
                onChange={setTimelineFilter}
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
                
                return (
                  <React.Fragment key={group.key}>
                    {/* Group Header */}
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
                    
                    {/* Request Rows */}
                    {!isCollapsed && group.requests.map(request => (
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
                            {request.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {formatDateRange(request.startDate, request.endDate)}
                          </div>
                        </div>
                        
                        {/* Owner */}
                        <div className="w-6 h-6 rounded-full bg-secondary-champagne flex items-center justify-center text-[10px] font-semibold text-secondary-bronze flex-shrink-0">
                          {getOwnerInitials(request.owner)}
                        </div>
                        
                        {/* Status */}
                        <div className={cn(
                          "px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wide flex-shrink-0",
                          request.health === 'On Track' && "bg-brand-primary text-white",
                          request.health === 'At Risk' && "bg-secondary-bronze text-white",
                          request.health === 'Blocked' && "bg-destructive text-white"
                        )}>
                          {request.health.toUpperCase().replace(' ', '')}
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
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Timeline Header */}
          <div className="h-10 flex border-b border-border bg-background relative">
            {QUARTERS.slice(0, 6).map((q, i) => {
              const qStart = dateToPercent(q.start);
              const qEnd = dateToPercent(q.end);
              const showBadge = todayPercent >= qStart && todayPercent < qEnd;
              const badgePos = ((todayPercent - qStart) / (qEnd - qStart)) * 100;
              
              return (
                <div
                  key={q.label}
                  className={cn(
                    "flex-1 min-w-[120px] flex items-center justify-center text-xs font-medium text-muted-foreground relative",
                    i < 5 && "border-r border-border"
                  )}
                >
                  {q.label}
                  {showBadge && (
                    <div
                      className="absolute top-1.5 bg-secondary-bronze text-white text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider z-10"
                      style={{ left: `${badgePos}%` }}
                    >
                      TODAY
                    </div>
                  )}
                </div>
              );
            })}
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
            
            <div className="min-w-full relative">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex pointer-events-none">
                {QUARTERS.slice(0, 6).map((q, i) => (
                  <div
                    key={q.label}
                    className={cn(
                      "flex-1 min-w-[120px]",
                      i < 5 && "border-r border-border"
                    )}
                  />
                ))}
              </div>
              
              {/* Today Line */}
              <div
                className="absolute top-0 w-0.5 bg-secondary-bronze z-10 pointer-events-none"
                style={{
                  left: `${todayPercent}%`,
                  height: `${groupedRequests.reduce((acc, g) => {
                    const collapsed = collapsedGroups.has(g.key);
                    return acc + 44 + (collapsed ? 0 : g.requests.length * 56);
                  }, 0)}px`
                }}
              />
              
              {/* Rows */}
              {groupedRequests.map(group => {
                const isCollapsed = collapsedGroups.has(group.key);
                
                return (
                  <React.Fragment key={group.key}>
                    {/* Group Row */}
                    <div className={cn(
                      "h-11 border-b border-border bg-muted/50",
                      isCollapsed && "hidden"
                    )} />
                    
                    {/* Request Rows */}
                    {!isCollapsed && group.requests.map(request => {
                      const startPct = dateToPercent(request.startDate);
                      const endPct = dateToPercent(request.endDate);
                      const width = Math.max(endPct - startPct, 1);
                      
                      return (
                        <div
                          key={request.id}
                          onMouseEnter={(e) => showTooltip(e, request)}
                          onMouseMove={moveTooltip}
                          onMouseLeave={hideTooltip}
                          onClick={() => handleRowClick(request)}
                          className="h-14 border-b border-border bg-background relative hover:bg-muted cursor-pointer"
                        >
                          {/* Bar */}
                          <div
                            className="absolute top-1/2 -translate-y-1/2 h-1.5"
                            style={{ left: `${startPct}%`, width: `${width}%` }}
                          >
                            {/* Track */}
                            <div className="absolute inset-0 bg-brand-primary/20 rounded-sm" />
                            {/* Progress */}
                            <div
                              className="absolute left-0 top-0 h-full bg-brand-primary rounded-sm"
                              style={{ width: `${request.progress}%` }}
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
              <span className="text-muted-foreground">Dates</span>
              <span className="font-medium text-foreground">
                {formatDateRange(tooltip.request.startDate, tooltip.request.endDate)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Health</span>
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <div className={cn(
                  "w-3 h-3 rounded",
                  tooltip.request.health === 'On Track' && "bg-brand-primary",
                  tooltip.request.health === 'At Risk' && "bg-secondary-bronze",
                  tooltip.request.health === 'Blocked' && "bg-destructive"
                )} />
                {tooltip.request.health}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Owner</span>
              <span className="font-medium text-foreground">{tooltip.request.owner}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Product</span>
              <span className="font-medium text-foreground">{tooltip.request.product}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">{tooltip.request.progress}%</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Legend Panel */}
      {legendOpen && (
        <div className="fixed top-40 right-5 bg-background border border-border rounded-xl shadow-lg p-4 w-[200px] z-50">
          {/* Close button */}
          <button
            onClick={() => setLegendOpen(false)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          
          {/* Request Health Section */}
          <div className="mb-4">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
              Request Health
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-3.5 h-3.5 rounded-full bg-brand-primary flex-shrink-0" />
                <span className="text-foreground">On Track</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-3.5 h-3.5 rounded-full bg-secondary-bronze flex-shrink-0" />
                <span className="text-foreground">At Risk</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-3.5 h-3.5 rounded-full bg-destructive flex-shrink-0" />
                <span className="text-foreground">Blocked</span>
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
      
      {/* Business Request Drawer */}
      <BusinessRequestDrawer
        requestId={selectedRequestId}
        isOpen={!!selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
      />
    </div>
  );
}
