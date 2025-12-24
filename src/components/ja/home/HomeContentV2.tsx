// src/components/ja/home/HomeContentV2.tsx
// V2 Home Implementation - Full enterprise-grade architecture
// Single source of truth via useHomeWorkItems hook

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  AlertTriangle, Briefcase, Clock, Calendar, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UnifiedToolbar } from '@/components/ui/unified-toolbar';
import { CriticalStrip, ActiveFilter } from './CriticalStrip';
import { HomeRoleModeSelector, HomeRoleMode } from './HomeRoleModeSelector';
import { HomeScopeTabs, HomeScopeValue, HomeScopeTabsCounts } from './HomeScopeTabs';
import { ModeAwareGridRow } from './WorkGridRow';
import { ModeAwareEmptyState } from './EmptyStates';
import { HomeUnifiedFilterDrawer } from './HomeUnifiedFilterDrawer';
import { 
  useHomeWorkItems, 
  HomeWorkItem, 
  HomeDomain, 
  HomeScope, 
  HomeSort,
  HomeFiltersState 
} from '@/hooks/home/useHomeWorkItems';
import { useDebounce } from '@/hooks/useDebounce';

const DEFAULT_PAGE_SIZE = 20;

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
    const itemDate = item.activityDate;
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
// FOCUS WIDGET
// ============================================
function FocusWidget({ 
  title, 
  icon: Icon, 
  primaryCount, 
  subtitle,
  onClick,
}: { 
  title: string; 
  icon: React.ElementType; 
  primaryCount: number; 
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
            {subtitle && (
              <div className="text-[10px] text-[var(--text-3)] mt-0.5">{subtitle}</div>
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
// DATA GRID WITH ENTERPRISE PAGINATION
// ============================================
function WorkItemsDataGrid({ 
  items, 
  mode,
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  searchQuery,
  activeScope,
  density,
  isLoading,
}: { 
  items: HomeWorkItem[];
  mode: HomeRoleMode;
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  searchQuery: string;
  activeScope: HomeScope;
  density: 'compact' | 'comfortable';
  isLoading: boolean;
}) {
  const groupedItems = groupItemsByTimePeriod(items);
  
  if (!isLoading && items.length === 0) {
    return (
      <ModeAwareEmptyState 
        mode={mode} 
        tab={activeScope}
        searchQuery={searchQuery}
        filter="all"
      />
    );
  }

  const totalPages = Math.ceil(totalItems / pageSize);
  const startRow = currentPage * pageSize + 1;
  const endRow = Math.min((currentPage + 1) * pageSize, totalItems);
  const canGoPrevious = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

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
        <div>Level</div>
        <div>Updated</div>
        <div>Assignee</div>
        <div></div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-[var(--text-3)]">Loading...</div>
      ) : (
        groupedItems.map((group, groupIndex) => (
          <div key={groupIndex}>
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
        ))
      )}
      
      {/* Enterprise Pagination Footer */}
      {totalItems > 0 && (
        <div 
          className="flex items-center justify-between px-4 py-3"
          style={{ 
            borderTop: '1px solid var(--divider)',
            backgroundColor: 'var(--table-header-bg)',
          }}
        >
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
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(0)}
              disabled={!canGoPrevious}
              className="h-8 w-8 flex items-center justify-center rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-3)] text-[var(--text-2)]"
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!canGoPrevious}
              className="h-8 w-8 flex items-center justify-center rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-3)] text-[var(--text-2)]"
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
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
            
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!canGoNext}
              className="h-8 w-8 flex items-center justify-center rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-3)] text-[var(--text-2)]"
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            
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
// MAIN COMPONENT
// ============================================
export function HomeContentV2() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // URL-driven state
  const domain = (searchParams.get('mode') as HomeDomain) || 'delivery';
  const scope = (searchParams.get('scope') as HomeScope) || 'worked-on';
  const activeFilter = (searchParams.get('filter') as ActiveFilter) || 'all';
  
  // Local UI state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState<HomeSort>('updated');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [filters, setFilters] = useState<HomeFiltersState>({
    status: [],
    priority: [],
    updatedRange: 'any',
    projectIds: [],
    assignee: [],
    level: [],
    decisionRequired: null,
    readyForSprint: null,
    plannedDateFrom: null,
    plannedDateTo: null,
  });

  // Debounced search for API
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Unified data hook - single source of truth
  const { data, isLoading, isFetching, refetch } = useHomeWorkItems({
    domain,
    scope,
    search: debouncedSearch,
    filters,
    sort: sortBy,
    page: currentPage + 1, // API is 1-indexed
    pageSize,
  });

  const workItems = data?.items || [];
  const counts = data?.counts || { workedOn: 0, assigned: 0, starred: 0, total: 0 };
  const totalItems = data?.pagination?.total || 0;

  // URL state management
  const updateUrlState = useCallback((updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Domain change - reset page + refetch
  const handleModeChange = useCallback((newMode: HomeRoleMode) => {
    const newParams = new URLSearchParams();
    newParams.set('mode', newMode);
    setSearchParams(newParams, { replace: true });
    setCurrentPage(0);
    setFilters({
      status: [],
      priority: [],
      updatedRange: 'any',
      projectIds: [],
      assignee: [],
      level: [],
      decisionRequired: null,
      readyForSprint: null,
      plannedDateFrom: null,
      plannedDateTo: null,
    });
  }, [setSearchParams]);

  // Scope change - reset page + refetch
  const handleScopeChange = useCallback((newScope: HomeScopeValue) => {
    updateUrlState({ scope: newScope === 'worked-on' ? null : newScope });
    setCurrentPage(0);
  }, [updateUrlState]);

  // Filter change - reset page + refetch
  const handleFiltersChange = useCallback((newFilters: Partial<HomeFiltersState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(0);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      status: [],
      priority: [],
      updatedRange: 'any',
      projectIds: [],
      assignee: [],
      level: [],
      decisionRequired: null,
      readyForSprint: null,
      plannedDateFrom: null,
      plannedDateTo: null,
    });
    setCurrentPage(0);
  }, []);

  const handleFilterChange = useCallback((filter: ActiveFilter) => {
    updateUrlState({ filter: filter === 'all' ? null : filter });
  }, [updateUrlState]);

  // Page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Page size change - reset page
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(0);
  }, []);

  // Search change
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(0);
  }, []);

  // Sort change
  const handleSortChange = useCallback((value: string) => {
    setSortBy(value as HomeSort);
    setCurrentPage(0);
  }, []);

  // Scope counts for tabs
  const scopeCounts: HomeScopeTabsCounts = useMemo(() => ({
    workedOn: counts.workedOn,
    assigned: counts.assigned,
    starred: counts.starred,
  }), [counts]);

  // Check if filters are active
  const hasActiveFilters = useMemo(() => {
    return filters.status.length > 0 ||
      filters.priority.length > 0 ||
      filters.updatedRange !== 'any' ||
      filters.projectIds.length > 0 ||
      filters.assignee.length > 0 ||
      filters.level.length > 0 ||
      filters.decisionRequired !== null ||
      filters.readyForSprint !== null ||
      filters.plannedDateFrom !== null ||
      filters.plannedDateTo !== null;
  }, [filters]);

  // Sort options - include Key, Level, Assignee for all modes
  const sortOptions = useMemo(() => {
    const base = [
      { value: 'updated', label: 'Recently updated' },
      { value: 'key', label: 'Key' },
      { value: 'level', label: 'Level' },
      { value: 'assignee', label: 'Assignee' },
    ];
    if (domain === 'operations') {
      return [...base, { value: 'priority', label: 'Priority' }];
    }
    if (domain === 'planner') {
      return [...base, { value: 'planned-date', label: 'Planned date' }];
    }
    return [...base, { value: 'priority', label: 'Priority' }];
  }, [domain]);

  // Focus widgets based on mode
  const renderFocusWidgets = () => {
    switch (domain) {
      case 'operations':
        return (
          <>
            <FocusWidget 
              title="All incidents"
              icon={AlertTriangle}
              primaryCount={counts.total}
              subtitle="Total active"
              onClick={() => handleScopeChange('worked-on')}
            />
            <FocusWidget 
              title="Assigned to me"
              icon={Briefcase}
              primaryCount={counts.assigned}
              subtitle="My workload"
              onClick={() => handleScopeChange('assigned')}
            />
          </>
        );
      case 'planner':
        return (
          <>
            <FocusWidget 
              title="Planned"
              icon={Calendar}
              primaryCount={counts.workedOn}
              subtitle="In progress or ready"
              onClick={() => handleScopeChange('worked-on')}
            />
            <FocusWidget 
              title="Upcoming"
              icon={Clock}
              primaryCount={counts.assigned}
              subtitle="Backlog items"
              onClick={() => handleScopeChange('assigned')}
            />
            <FocusWidget 
              title="Pending review"
              icon={FileText}
              primaryCount={counts.starred}
              subtitle="Needs decision"
              onClick={() => handleScopeChange('starred')}
            />
          </>
        );
      case 'delivery':
      case 'all':
      default:
        return (
          <>
            <FocusWidget 
              title="Worked on"
              icon={Clock}
              primaryCount={counts.workedOn}
              subtitle="Recent activity"
              onClick={() => handleScopeChange('worked-on')}
            />
            <FocusWidget 
              title="Assigned to me"
              icon={Briefcase}
              primaryCount={counts.assigned}
              subtitle="My workload"
              onClick={() => handleScopeChange('assigned')}
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
      {/* Sticky header pane */}
      <div 
        className="sticky top-0 z-20 border-b border-[var(--border-color)]"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <div className="w-full max-w-[1680px] 2xl:max-w-[1920px] mx-auto px-6 xl:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-semibold leading-7 tracking-tight m-0 text-[var(--text-1)]">
              For you
            </h1>
            <HomeRoleModeSelector value={domain} onChange={handleModeChange} />
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1680px] 2xl:max-w-[1920px] mx-auto px-6 xl:px-8 py-3">
        {/* Critical Strip - Operations only */}
        {domain === 'operations' && (
          <div className="mb-3">
            <CriticalStrip
              majorIncidents={{ open: 0, breached: 0, atRisk: 0 }}
              slaAtRisk={0}
              awaitingMe={0}
              blocked={0}
              activeFilter={activeFilter}
              currentMode={domain}
              onFilterChange={handleFilterChange}
              onModeChange={handleModeChange}
            />
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_240px] gap-4">
          {/* Left Column */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-[var(--text-1)]">
                Your work
              </span>
              {(isFetching || isLoading) && (
                <span className="text-xs text-[var(--text-3)]">Loading...</span>
              )}
            </div>

            {/* Scope Tabs - Identical across all modes */}
            <HomeScopeTabs
              value={scope}
              onChange={handleScopeChange}
              counts={scopeCounts}
              className="mb-2"
            />

            {/* Toolbar */}
            <UnifiedToolbar
              searchValue={searchQuery}
              onSearchChange={handleSearchChange}
              searchPlaceholder="Search in your work list…"
              sortOptions={sortOptions}
              sortValue={sortBy}
              onSortChange={handleSortChange}
              density={density}
              onDensityChange={setDensity}
              filterContent={
                <HomeUnifiedFilterDrawer
                  mode={domain}
                  filters={{
                    search: searchQuery,
                    scope,
                    domain,
                    ...filters,
                    types: [],
                  }}
                  onFiltersChange={handleFiltersChange}
                  onClear={handleClearFilters}
                  hasActiveFilters={hasActiveFilters}
                />
              }
            />

            {/* Data Grid */}
            <WorkItemsDataGrid 
              items={workItems} 
              mode={domain}
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              searchQuery={searchQuery}
              activeScope={scope}
              density={density}
              isLoading={isLoading}
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
