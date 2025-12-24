// src/components/ja/home/HomeContentV2.tsx
// V2 Home Implementation - Full dynamic, domain-driven architecture
// This is the target state for the migration

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Star, MoreHorizontal, ExternalLink, 
  Clock, Pin, AlertTriangle, Briefcase, Calendar, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SegmentedTabs, SegmentedTab } from '@/components/ui/segmented-tabs';
import { UnifiedToolbar } from '@/components/ui/unified-toolbar';
import { CriticalStrip, ActiveFilter } from './CriticalStrip';
import { HomeRoleModeSelector, HomeRoleMode } from './HomeRoleModeSelector';
import { ModeAwareGridRow } from './WorkGridRow';
import { ModeAwareEmptyState } from './EmptyStates';
import { useMigrationMetrics } from '@/hooks/home/useMigrationMetrics';

// V2 specific hooks with enhanced tracking
import {
  useHomeOperationsSummary,
  useHomeOperationsItems,
  OperationsWorkItem,
} from '@/hooks/home/useHomeOperationsData';
import {
  useHomeDeliverySummary,
  useHomeDeliveryItems,
  DeliveryWorkItem,
} from '@/hooks/home/useHomeDeliveryData';
import {
  useHomePlannerSummary,
  useHomePlannerItems,
  PlannerWorkItem,
} from '@/hooks/home/useHomePlannerData';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ITEMS_PER_PAGE = 20;
const STORAGE_KEY_PINNED = 'catalyst_home_pinned_projects';

type HomeWorkItem = OperationsWorkItem | DeliveryWorkItem | PlannerWorkItem;

interface HomeProject {
  id: string;
  key: string;
  name: string;
  color: string;
  openCount: number;
  doneCount: number;
  hasUrgency: boolean;
}

// Tab configurations per mode - V2: Strict domain separation
const MODE_TABS: Record<HomeRoleMode, { value: string; label: string }[]> = {
  all: [
    { value: 'worked-on', label: 'Worked on' },
    { value: 'assigned', label: 'Assigned' },
  ],
  operations: [], // Operations has no tabs - filter-driven
  delivery: [
    { value: 'worked-on', label: 'Worked on' },
    { value: 'assigned', label: 'Assigned' },
  ],
  planner: [
    { value: 'planned', label: 'Planned' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'pending-review', label: 'Pending review' },
  ],
};

const DEFAULT_TABS: Record<HomeRoleMode, string> = {
  all: 'worked-on',
  operations: 'all',
  delivery: 'worked-on',
  planner: 'planned',
};

// ============================================
// UTILITY: Group items by time period
// ============================================
function groupItemsByTimePeriod(items: HomeWorkItem[]): { label: string; items: HomeWorkItem[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups: { label: string; items: HomeWorkItem[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'This week', items: [] },
    { label: 'Older', items: [] },
  ];

  items.forEach(item => {
    const itemDate = new Date(item.activityDate);
    if (itemDate >= today) {
      groups[0].items.push(item);
    } else if (itemDate >= yesterday) {
      groups[1].items.push(item);
    } else if (itemDate >= lastWeek) {
      groups[2].items.push(item);
    } else {
      groups[3].items.push(item);
    }
  });

  return groups.filter(g => g.items.length > 0);
}

// ============================================
// FOCUS WIDGET - V2: Mode-aware
// ============================================
function FocusWidget({ 
  title, 
  icon: Icon, 
  primaryCount, 
  secondaryLabel,
  secondaryCount,
  subtitle,
  onClick,
}: { 
  title: string; 
  icon: React.ElementType; 
  primaryCount: number; 
  secondaryLabel?: string;
  secondaryCount?: number;
  subtitle?: string;
  onClick?: () => void;
}) {
  return (
    <button 
      className={cn(
        "w-full p-2.5 rounded-md transition-all text-left",
        "bg-transparent border border-transparent",
        "hover:bg-[var(--surface-2)] hover:border-[var(--border-color)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <Icon className="w-4 h-4 shrink-0 text-[var(--icon-muted)] mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-[var(--text-1)]">{title}</div>
            {(subtitle || (secondaryLabel && secondaryCount !== undefined)) && (
              <div className="text-[10px] text-[var(--text-3)] mt-0.5">
                {secondaryLabel && secondaryCount !== undefined 
                  ? `${secondaryCount} ${secondaryLabel.toLowerCase()}`
                  : subtitle
                }
              </div>
            )}
          </div>
        </div>
        <span className="text-sm font-semibold tabular-nums text-[var(--brand-primary)] shrink-0">
          {primaryCount}
        </span>
      </div>
    </button>
  );
}

// ============================================
// DATA GRID - V2: Strict mode isolation with pagination
// ============================================
function ModeAwareDataGridV2({ 
  items, 
  mode,
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  searchQuery,
  selectedTab,
  activeFilter,
  density,
}: { 
  items: HomeWorkItem[];
  mode: HomeRoleMode;
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  searchQuery: string;
  selectedTab: string;
  activeFilter: ActiveFilter;
  density: 'compact' | 'comfortable';
}) {
  const groupedItems = groupItemsByTimePeriod(items);
  
  if (items.length === 0) {
    return (
      <ModeAwareEmptyState 
        mode={mode} 
        tab={selectedTab}
        searchQuery={searchQuery}
        filter={activeFilter}
      />
    );
  }

  const totalPages = Math.ceil(totalItems / pageSize);
  const startRow = currentPage * pageSize + 1;
  const endRow = Math.min((currentPage + 1) * pageSize, totalItems);
  const canGoPrevious = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  // Generate page numbers with ellipsis
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i);
    }
    
    pages.push(0);
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(totalPages - 2, currentPage + 1);
    
    if (start > 1) pages.push('ellipsis');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 2) pages.push('ellipsis');
    if (totalPages > 1) pages.push(totalPages - 1);
    
    return pages;
  };

  return (
    <div className="mt-2 rounded-xl border border-[var(--border-color)] overflow-hidden bg-[var(--card-bg)] shadow-sm dark:shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
      {/* Sticky Header */}
      <div 
        className="grid items-center py-2.5 px-4 text-[11px] font-semibold uppercase tracking-[0.08em] sticky top-0 z-10"
        style={{ 
          gridTemplateColumns: '100px 1fr 160px 100px 80px 80px',
          color: 'var(--text-3)',
          backgroundColor: 'var(--table-header-bg)',
          borderBottom: '1px solid var(--divider)',
        }}
      >
        <div>Key</div>
        <div>Summary</div>
        <div>Project</div>
        <div>Updated</div>
        <div>Assignee</div>
        <div></div>
      </div>

      {groupedItems.map((group, groupIndex) => (
        <div key={groupIndex}>
          {/* Section header row */}
          <div 
            className="text-[11px] font-bold uppercase tracking-[0.1em] py-2.5 px-4"
            style={{ 
              color: 'var(--text-3)',
              backgroundColor: 'var(--table-section-bg)',
              borderTop: groupIndex > 0 ? '1px solid var(--divider)' : 'none',
              borderBottom: '1px solid var(--divider)',
            }}
          >
            {group.label}
          </div>
          {group.items.map((item, index) => (
            <ModeAwareGridRow 
              key={`${group.label}-${index}`} 
              item={item}
              mode={mode}
              density={density}
            />
          ))}
        </div>
      ))}
      
      {/* Enterprise Pagination Footer */}
      {totalItems > 0 && (
        <div 
          className="flex items-center justify-between px-4 py-3"
          style={{ 
            borderTop: '1px solid var(--divider)',
            backgroundColor: 'var(--table-header-bg)',
          }}
        >
          {/* Left: Row count and page size */}
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: 'var(--text-3)' }}>
              Showing <span className="font-medium" style={{ color: 'var(--text-1)' }}>{startRow}</span>
              {" – "}
              <span className="font-medium" style={{ color: 'var(--text-1)' }}>{endRow}</span>
              {" of "}
              <span className="font-medium" style={{ color: 'var(--text-1)' }}>{totalItems}</span>
            </span>
            
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--text-3)' }}>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="h-8 px-2 text-sm rounded-md border bg-[var(--surface-2)] border-[var(--border-color)] text-[var(--text-1)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Right: Navigation */}
          <div className="flex items-center gap-1">
            {/* First page */}
            <button
              onClick={() => onPageChange(0)}
              disabled={!canGoPrevious}
              className="h-8 w-8 flex items-center justify-center rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-3)] text-[var(--text-2)]"
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            
            {/* Previous */}
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!canGoPrevious}
              className="h-8 w-8 flex items-center justify-center rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-3)] text-[var(--text-2)]"
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            {/* Page numbers */}
            <div className="flex items-center gap-1 mx-2">
              {getPageNumbers().map((page, index) => 
                page === 'ellipsis' ? (
                  <span key={`ellipsis-${index}`} className="px-2" style={{ color: 'var(--text-3)' }}>…</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={cn(
                      "h-8 w-8 text-sm rounded-md transition-colors",
                      currentPage === page 
                        ? "bg-[var(--brand-primary)] text-white font-medium"
                        : "text-[var(--text-2)] hover:bg-[var(--surface-3)]"
                    )}
                  >
                    {page + 1}
                  </button>
                )
              )}
            </div>
            
            {/* Next */}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!canGoNext}
              className="h-8 w-8 flex items-center justify-center rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-3)] text-[var(--text-2)]"
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            
            {/* Last page */}
            <button
              onClick={() => onPageChange(totalPages - 1)}
              disabled={!canGoNext}
              className="h-8 w-8 flex items-center justify-center rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-3)] text-[var(--text-2)]"
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// V2 MAIN COMPONENT
// ============================================
interface HomeContentV2Props {
  metrics?: ReturnType<typeof useMigrationMetrics>;
}

export function HomeContentV2({ metrics }: HomeContentV2Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // URL state
  const roleMode = (searchParams.get('mode') as HomeRoleMode) || 'delivery';
  const selectedTab = searchParams.get('tab') || DEFAULT_TABS[roleMode];
  const activeFilter = (searchParams.get('filter') as ActiveFilter) || 'all';
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState('recently-updated');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [pinnedProjects, setPinnedProjects] = useState<string[]>([]);
  const [isProjectsCollapsed, setIsProjectsCollapsed] = useState(false);

  // Track page load for metrics
  useEffect(() => {
    const recordLoad = async () => {
      if (metrics) {
        await metrics.recordMetrics('v2');
      }
    };
    
    // Record after initial render
    const timeoutId = setTimeout(recordLoad, 100);
    return () => clearTimeout(timeoutId);
  }, [metrics]);

  // URL state management
  const updateUrlState = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === DEFAULT_TABS[roleMode]) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams, { replace: true });
  };

  const handleModeChange = (newMode: HomeRoleMode) => {
    const newParams = new URLSearchParams();
    newParams.set('mode', newMode);
    setSearchParams(newParams, { replace: true });
    setCurrentPage(0);
  };

  const handleTabChange = (tab: string) => {
    updateUrlState({ tab, filter: null });
    setCurrentPage(0);
  };

  const handleFilterChange = (filter: ActiveFilter) => {
    updateUrlState({ filter: filter === 'all' ? null : filter });
  };

  // ============================================
  // V2: DOMAIN-SEPARATED DATA FETCHING
  // ============================================
  
  // Operations mode
  const operationsSummary = useHomeOperationsSummary();
  const operationsItems = useHomeOperationsItems({
    filter: activeFilter === 'major-incidents' ? 'major' : 
            activeFilter === 'sla-at-risk' ? 'sla-at-risk' :
            activeFilter === 'awaiting-me' ? 'awaiting-me' :
            activeFilter === 'blocked' ? 'blocked' : undefined,
    search: searchQuery || undefined,
    sort: sortBy === 'priority' ? 'priority' : 'updated',
    page: currentPage + 1,
    pageSize: pageSize,
  });

  // Delivery mode
  const deliverySummary = useHomeDeliverySummary();
  const deliveryItems = useHomeDeliveryItems({
    scope: selectedTab === 'assigned' ? 'assigned' : selectedTab === 'starred' ? 'starred' : 'worked-on',
    search: searchQuery || undefined,
    sort: sortBy === 'priority' ? 'priority' : sortBy === 'due-date' ? 'due-date' : 'updated',
    page: currentPage + 1,
    pageSize: pageSize,
  });

  // Planner mode
  const plannerSummary = useHomePlannerSummary();
  const plannerItems = useHomePlannerItems({
    category: selectedTab === 'upcoming' ? 'upcoming' : 
              selectedTab === 'pending-review' ? 'pending-review' : 'planned',
    search: searchQuery || undefined,
    sort: sortBy === 'priority' ? 'priority' : 'planned-date',
    page: currentPage + 1,
    pageSize: pageSize,
  });

  // Increment query count for metrics
  useEffect(() => {
    if (metrics) {
      metrics.incrementQueryCount();
    }
  }, [operationsItems.dataUpdatedAt, deliveryItems.dataUpdatedAt, plannerItems.dataUpdatedAt]);

  // Track errors
  useEffect(() => {
    if (metrics) {
      if (operationsItems.error) metrics.incrementErrorCount();
      if (deliveryItems.error) metrics.incrementErrorCount();
      if (plannerItems.error) metrics.incrementErrorCount();
    }
  }, [operationsItems.error, deliveryItems.error, plannerItems.error]);

  // Get data based on current mode
  const { workItems, criticalCounts, isLoading } = useMemo(() => {
    switch (roleMode) {
      case 'operations':
        return {
          workItems: operationsItems.data?.items || [],
          criticalCounts: {
            majorIncidents: operationsSummary.data?.incidents.major || { open: 0, breached: 0, atRisk: 0 },
            slaAtRisk: operationsSummary.data?.incidents.slaAtRisk || 0,
            awaitingMe: operationsSummary.data?.incidents.awaitingMe || 0,
            blocked: operationsSummary.data?.incidents.blocked || 0,
            myWorkload: {
              incidents: operationsItems.data?.counts.total || 0,
              workItems: 0,
            },
          },
          isLoading: operationsSummary.isLoading || operationsItems.isLoading,
        };
      case 'planner':
        return {
          workItems: plannerItems.data?.items || [],
          criticalCounts: {
            majorIncidents: { open: 0, breached: 0, atRisk: 0 },
            slaAtRisk: 0,
            awaitingMe: plannerSummary.data?.pendingReview || 0,
            blocked: 0,
            myWorkload: {
              incidents: 0,
              workItems: plannerItems.data?.counts.planned || 0,
            },
          },
          isLoading: plannerSummary.isLoading || plannerItems.isLoading,
        };
      case 'delivery':
      default:
        return {
          workItems: deliveryItems.data?.items || [],
          criticalCounts: {
            majorIncidents: { open: 0, breached: 0, atRisk: 0 },
            slaAtRisk: 0,
            awaitingMe: 0,
            blocked: (deliveryItems.data?.items || []).filter(i => i.blocked).length,
            myWorkload: {
              incidents: 0,
              workItems: deliveryItems.data?.counts.total || 0,
            },
          },
          isLoading: deliverySummary.isLoading || deliveryItems.isLoading,
        };
    }
  }, [
    roleMode,
    operationsSummary.data, operationsItems.data, operationsSummary.isLoading, operationsItems.isLoading,
    deliverySummary.data, deliveryItems.data, deliverySummary.isLoading, deliveryItems.isLoading,
    plannerSummary.data, plannerItems.data, plannerSummary.isLoading, plannerItems.isLoading,
  ]);

  // Tab counts
  const tabCounts = useMemo(() => {
    switch (roleMode) {
      case 'operations':
        return { total: operationsItems.data?.counts.total || 0 };
      case 'planner':
        return {
          planned: plannerItems.data?.counts.planned || 0,
          upcoming: plannerItems.data?.counts.upcoming || 0,
          'pending-review': plannerItems.data?.counts.pendingReview || 0,
        };
      case 'delivery':
      default:
        return {
          'worked-on': deliveryItems.data?.counts.workedOn || 0,
          assigned: deliveryItems.data?.counts.assigned || 0,
        };
    }
  }, [roleMode, operationsItems.data, deliveryItems.data, plannerItems.data]);

  const getTabCount = (tabValue: string): number => {
    return (tabCounts as Record<string, number>)[tabValue] ?? 0;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(0); // Reset to first page when changing page size
  };

  // Get total items for pagination
  const totalItems = useMemo(() => {
    switch (roleMode) {
      case 'all': {
        const opsTotal = operationsItems.data?.counts.total || 0;
        const deliveryTotal = deliveryItems.data?.counts.total || 0;
        const plannerTotal = (plannerItems.data?.counts.planned || 0) + 
                            (plannerItems.data?.counts.upcoming || 0);
        return opsTotal + deliveryTotal + plannerTotal;
      }
      case 'operations':
        return operationsItems.data?.counts.total || 0;
      case 'delivery':
        return deliveryItems.data?.counts.total || 0;
      case 'planner':
        return (plannerItems.data?.counts.planned || 0) + 
               (plannerItems.data?.counts.upcoming || 0) + 
               (plannerItems.data?.counts.pendingReview || 0);
      default:
        return 0;
    }
  }, [roleMode, operationsItems.data, deliveryItems.data, plannerItems.data]);

  // Current mode config
  const currentModeTabs = MODE_TABS[roleMode];
  const hasTabs = currentModeTabs.length > 0;

  // Sort options - mode specific
  const sortOptions = useMemo(() => {
    const baseOptions = [
      { value: 'recently-updated', label: 'Recently updated' },
    ];
    
    if (roleMode === 'operations') {
      return [...baseOptions, { value: 'priority', label: 'Priority' }];
    }
    if (roleMode === 'planner') {
      return [...baseOptions, { value: 'planned-date', label: 'Planned date' }];
    }
    return [
      ...baseOptions,
      { value: 'priority', label: 'Priority' },
      { value: 'due-date', label: 'Due date' },
    ];
  }, [roleMode]);

  // Mode-specific focus widgets
  const renderFocusWidgets = () => {
    switch (roleMode) {
      case 'operations':
        return (
          <>
            <FocusWidget 
              title="Major incidents"
              icon={AlertTriangle}
              primaryCount={criticalCounts.majorIncidents.open}
              secondaryLabel="breached"
              secondaryCount={criticalCounts.majorIncidents.breached}
              onClick={() => handleFilterChange('major-incidents')}
            />
            <FocusWidget 
              title="SLA at risk"
              icon={Clock}
              primaryCount={criticalCounts.slaAtRisk}
              subtitle="Action needed"
              onClick={() => handleFilterChange('sla-at-risk')}
            />
            <FocusWidget 
              title="Awaiting action"
              icon={AlertTriangle}
              primaryCount={criticalCounts.awaitingMe}
              subtitle="Needs response"
              onClick={() => handleFilterChange('awaiting-me')}
            />
          </>
        );
      case 'planner':
        return (
          <>
            <FocusWidget 
              title="Planned items"
              icon={Calendar}
              primaryCount={getTabCount('planned')}
              subtitle="Ready for sprint"
              onClick={() => handleTabChange('planned')}
            />
            <FocusWidget 
              title="Upcoming work"
              icon={Clock}
              primaryCount={getTabCount('upcoming')}
              subtitle="Next sprints"
              onClick={() => handleTabChange('upcoming')}
            />
            <FocusWidget 
              title="Pending review"
              icon={FileText}
              primaryCount={getTabCount('pending-review')}
              subtitle="Needs attention"
              onClick={() => handleTabChange('pending-review')}
            />
          </>
        );
      case 'delivery':
      default:
        return (
          <>
            <FocusWidget 
              title="My workload"
              icon={Briefcase}
              primaryCount={criticalCounts.myWorkload.workItems}
              subtitle="Active items"
              onClick={() => handleTabChange('assigned')}
            />
            <FocusWidget 
              title="Recently updated"
              icon={Clock}
              primaryCount={deliverySummary.data?.recentlyUpdated || 0}
              subtitle="Last 7 days"
              onClick={() => handleTabChange('worked-on')}
            />
          </>
        );
    }
  };

  return (
    <div 
      className="min-h-screen font-sans"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <div className="w-full max-w-[1680px] 2xl:max-w-[1920px] mx-auto px-6 xl:px-8 py-3">
        {/* Page header */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold leading-7 tracking-tight m-0 text-[var(--text-1)]">
            For you
          </h1>
          <HomeRoleModeSelector value={roleMode} onChange={handleModeChange} />
        </div>

        {/* Critical Strip - Operations only */}
        {roleMode === 'operations' && (
          <div className="mt-3">
            <CriticalStrip
              majorIncidents={criticalCounts.majorIncidents}
              slaAtRisk={criticalCounts.slaAtRisk}
              awaitingMe={criticalCounts.awaitingMe}
              blocked={criticalCounts.blocked}
              activeFilter={activeFilter}
              currentMode={roleMode}
              onFilterChange={handleFilterChange}
              onModeChange={handleModeChange}
            />
          </div>
        )}

        <div className="h-px mt-3 mb-3 bg-[var(--border-color)]" />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_240px] gap-4">
          {/* Left Column */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-[var(--text-1)]">
                Your work
              </span>
              {activeFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                  {activeFilter.replace(/-/g, ' ')}
                  <button 
                    onClick={() => handleFilterChange('all')}
                    className="ml-0.5 hover:text-[var(--text-1)]"
                  >
                    ×
                  </button>
                </span>
              )}
              {isLoading && (
                <span className="text-xs text-[var(--text-3)]">Loading...</span>
              )}
            </div>

            {/* Mode-specific tabs */}
            {hasTabs && (
              <SegmentedTabs value={selectedTab} onValueChange={handleTabChange}>
                {currentModeTabs.map(tab => (
                  <SegmentedTab key={tab.value} value={tab.value} count={getTabCount(tab.value)}>
                    {tab.label}
                  </SegmentedTab>
                ))}
              </SegmentedTabs>
            )}

            {/* Toolbar */}
            <div className={cn(hasTabs ? "mt-2" : "")}>
              <UnifiedToolbar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search in your work list…"
                sortOptions={sortOptions}
                sortValue={sortBy}
                onSortChange={setSortBy}
                density={density}
                onDensityChange={setDensity}
                filterContent={
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-[var(--text-1)]">Filter by</div>
                    <div className="text-xs text-[var(--text-3)]">
                      Filter options coming soon...
                    </div>
                  </div>
                }
              />
            </div>

            {/* Data Grid */}
            <ModeAwareDataGridV2 
              items={workItems} 
              mode={roleMode}
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              searchQuery={searchQuery}
              selectedTab={selectedTab}
              activeFilter={activeFilter}
              density={density}
            />
          </div>

          {/* Right Column - Focus */}
          <div className="xl:sticky xl:top-20 xl:self-start">
            <div 
              className={cn(
                "rounded-xl border-2 shadow-md",
                "bg-[var(--surface-1)] border-[var(--border-color)]",
                "p-4"
              )}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider mb-3 text-[var(--text-2)] border-b border-[var(--divider)] pb-2">
                My focus
              </div>
              
              <div className="space-y-0.5">
                {renderFocusWidgets()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeContentV2;
