// src/components/ja/home/HomeContentV2.tsx
// V2 Home Implementation - Full dynamic, domain-driven architecture
// This is the target state for the migration

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ChevronDown, ChevronUp, Star, MoreHorizontal, ExternalLink, 
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
  operations: [], // Operations has no tabs - filter-driven
  delivery: [
    { value: 'worked-on', label: 'Worked on' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'starred', label: 'Starred' },
  ],
  planner: [
    { value: 'planned', label: 'Planned' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'pending-review', label: 'Pending review' },
  ],
};

const DEFAULT_TABS: Record<HomeRoleMode, string> = {
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
// DATA GRID - V2: Strict mode isolation
// ============================================
function ModeAwareDataGridV2({ 
  items, 
  mode,
  visibleCount,
  onLoadMore,
  searchQuery,
  selectedTab,
  activeFilter,
  density,
}: { 
  items: HomeWorkItem[];
  mode: HomeRoleMode;
  visibleCount: number;
  onLoadMore: () => void;
  searchQuery: string;
  selectedTab: string;
  activeFilter: ActiveFilter;
  density: 'compact' | 'comfortable';
}) {
  const groupedItems = groupItemsByTimePeriod(items);
  const hasMore = items.length >= visibleCount;
  
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

  return (
    <div 
      className={cn(
        "border rounded-lg overflow-hidden mt-2",
        "bg-[var(--surface-1)] border-[var(--border-color)]"
      )}
    >
      {groupedItems.map((group, groupIndex) => {
        const itemsToShow = group.items.slice(0, Math.max(0, visibleCount - groupedItems
          .slice(0, groupIndex)
          .reduce((acc, g) => acc + g.items.length, 0)));
        
        if (itemsToShow.length === 0) return null;
        
        return (
          <div key={groupIndex}>
            <div 
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wider py-1 px-3",
                groupIndex > 0 ? 'mt-2' : 'mt-1'
              )} 
              style={{ color: 'var(--text-3)' }}
            >
              {group.label}
            </div>
            {itemsToShow.map((item, index) => (
              <ModeAwareGridRow 
                key={`${group.label}-${index}`} 
                item={item}
                mode={mode}
                density={density}
              />
            ))}
          </div>
        );
      })}
      
      {hasMore && (
        <div className="flex justify-center mt-3 pb-3">
          <button 
            onClick={onLoadMore}
            className="px-3 py-1.5 text-sm font-medium rounded-md border transition-colors bg-[var(--surface-2)] border-[var(--border-color)] text-[var(--text-2)] hover:bg-[var(--surface-3)]"
          >
            Load more
          </button>
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
  
  // Local state
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
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
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const handleTabChange = (tab: string) => {
    updateUrlState({ tab, filter: null });
    setVisibleCount(ITEMS_PER_PAGE);
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
    page: 1,
    pageSize: visibleCount,
  });

  // Delivery mode
  const deliverySummary = useHomeDeliverySummary();
  const deliveryItems = useHomeDeliveryItems({
    scope: selectedTab === 'assigned' ? 'assigned' : selectedTab === 'starred' ? 'starred' : 'worked-on',
    search: searchQuery || undefined,
    sort: sortBy === 'priority' ? 'priority' : sortBy === 'due-date' ? 'due-date' : 'updated',
    page: 1,
    pageSize: visibleCount,
  });

  // Planner mode
  const plannerSummary = useHomePlannerSummary();
  const plannerItems = useHomePlannerItems({
    category: selectedTab === 'upcoming' ? 'upcoming' : 
              selectedTab === 'pending-review' ? 'pending-review' : 'planned',
    search: searchQuery || undefined,
    sort: sortBy === 'priority' ? 'priority' : 'planned-date',
    page: 1,
    pageSize: visibleCount,
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
          starred: deliveryItems.data?.counts.starred || 0,
        };
    }
  }, [roleMode, operationsItems.data, deliveryItems.data, plannerItems.data]);

  const getTabCount = (tabValue: string): number => {
    return (tabCounts as Record<string, number>)[tabValue] ?? 0;
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

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
            <FocusWidget 
              title="Starred"
              icon={Star}
              primaryCount={getTabCount('starred')}
              subtitle="Quick access"
              onClick={() => handleTabChange('starred')}
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
              visibleCount={visibleCount}
              onLoadMore={handleLoadMore}
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
