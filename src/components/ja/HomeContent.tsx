import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronDown, ChevronUp, Star, MoreHorizontal, ExternalLink, CheckCircle, 
  Clock, Pin, Settings, Kanban, List, AlertTriangle, Briefcase, Calendar, FileText
} from 'lucide-react';
import { WorkItemTypeIcon } from './icons/WorkItemTypeIcon';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { HomeScopeTabs, HomeScopeValue } from './home/HomeScopeTabs';
import { UnifiedToolbar } from '@/components/ui/unified-toolbar';
import { CriticalStrip, ActiveFilter } from './home/CriticalStrip';
import { HomeRoleModeSelector } from './home/HomeRoleModeSelector';
import { ModeAwareGridRow } from './home/WorkGridRow';
import { ModeAwareEmptyState } from './home/EmptyStates';
import { HomeUnifiedFilterDrawer } from './home/HomeUnifiedFilterDrawer';
import {
  useHomeFilters,
  HomeRoleMode,
  countActiveHomeFilters,
  hasActiveHomeFilters,
} from '@/hooks/home/useHomeFilters';
import {
  useUnifiedHomeSummary,
  useUnifiedHomeItems,
  UnifiedWorkItem,
} from '@/hooks/home/useUnifiedHomeData';
import {
  useStarredItemIds,
  useStarredDeliveryItems,
  useToggleStar,
  useStarredItemsCount,
} from '@/hooks/home/useStarredItems';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const STORAGE_KEY_PINNED = 'catalyst_home_pinned_projects';

// Project type for display
interface HomeProject {
  id: string;
  key: string;
  name: string;
  color: string;
  openCount: number;
  doneCount: number;
  hasUrgency: boolean;
}

// Tab scope type imported from HomeScopeTabs
// Using unified HomeScopeTabs component for all modes

// ============================================
// UTILITY: Group items by time period
// ============================================
function groupItemsByTimePeriod(items: UnifiedWorkItem[]): { label: string; items: UnifiedWorkItem[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups: { label: string; items: UnifiedWorkItem[] }[] = [
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
// MODE-SPECIFIC FOCUS WIDGETS
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
// PROJECT CARD COMPONENT
// ============================================
function ProjectCard({ 
  project, 
  isPinned,
  onPin,
  hasUrgency = false,
}: { 
  project: HomeProject; 
  isPinned: boolean;
  onPin: () => void;
  hasUrgency?: boolean;
}) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  
  const handleCardClick = () => {
    navigate(`/project/${project.key.toLowerCase()}`);
  };

  return (
    <div 
      className={cn(
        "rounded-lg overflow-hidden transition-all cursor-pointer group",
        "border-2 bg-[var(--surface-1)] shadow-sm",
        isPinned 
          ? "border-[var(--brand-gold)]/60" 
          : "border-[var(--border-color)]",
        "hover:border-[var(--brand-primary)]/40 hover:shadow-md"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <div className="h-0.5" style={{ backgroundColor: project.color }} />
      
      <div className="p-2 relative">
        <div 
          className={cn(
            "absolute top-1 right-1 flex items-center gap-0.5 transition-opacity z-10",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        >
          <button 
            className={cn(
              "w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--surface-3)]",
              isPinned ? "text-[var(--brand-gold)]" : "text-[var(--icon-muted)]"
            )}
            onClick={(e) => { e.stopPropagation(); onPin(); }}
            title={isPinned ? "Unpin" : "Pin"}
          >
            <Pin className={cn("w-3 h-3", isPinned && "fill-current")} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--surface-3)] text-[var(--icon-muted)]"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end"
              className="bg-[var(--surface-1)] border-[var(--border-color)] z-[300]"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem 
                onClick={() => navigate(`/project/${project.key.toLowerCase()}`)}
                className="text-[var(--text-1)] cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open project
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onPin()}
                className="text-[var(--text-1)] cursor-pointer"
              >
                <Pin className="w-4 h-4 mr-2" />
                {isPinned ? 'Unpin' : 'Pin'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => navigate(`/project/${project.key.toLowerCase()}/backlog`)}
                className="text-[var(--text-1)] cursor-pointer"
              >
                <List className="w-4 h-4 mr-2" />
                Open backlog
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate(`/release/incidents?project=${project.key}`)}
                className="text-[var(--text-1)] cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Open incidents
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate(`/project/${project.key.toLowerCase()}/kanban`)}
                className="text-[var(--text-1)] cursor-pointer"
              >
                <Kanban className="w-4 h-4 mr-2" />
                Open kanban
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => navigate(`/project/${project.key.toLowerCase()}/settings`)}
                className="text-[var(--text-1)] cursor-pointer"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isPinned && !isHovered && (
          <div className="absolute top-1 right-1">
            <Pin className="w-2.5 h-2.5 text-[var(--brand-gold)] fill-current" />
          </div>
        )}

        <div className="flex items-center gap-2">
          <div 
            className="w-6 h-6 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0"
            style={{ backgroundColor: project.color }}
          >
            {project.key.slice(0, 2)}
          </div>
          <div className="min-w-0 pr-8 flex-1">
            <div className="text-sm font-medium leading-tight truncate text-[var(--text-1)]">
              {project.name}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-1">
            <span className="text-[10px] tabular-nums text-[var(--text-2)]">
              <span className="font-medium text-[var(--brand-primary)]">{project.openCount}</span> open
            </span>
            <span className="text-[var(--text-3)]">·</span>
            <span className="text-[10px] tabular-nums text-[var(--text-3)]">
              {project.doneCount} done
            </span>
          </div>
          <div className="flex items-center gap-1">
            {(hasUrgency || project.hasUrgency) && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-gold)]" title="Has incidents" />
            )}
            <span className="text-[9px] text-[var(--text-3)]">2h ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// UNIFIED DATA GRID COMPONENT
// ============================================
const GRID_COLS = '100px 1fr 160px 100px 80px 80px';

function UnifiedDataGrid({ 
  items, 
  mode,
  onLoadMore,
  searchQuery,
  selectedTab,
  density = 'comfortable',
  starredItemIds,
  onToggleStar,
  hasMore,
  isLoadingMore,
}: { 
  items: UnifiedWorkItem[]; 
  mode: HomeRoleMode;
  onLoadMore: () => void;
  searchQuery: string;
  selectedTab: string;
  density?: 'compact' | 'comfortable';
  starredItemIds?: Set<string>;
  onToggleStar?: (itemId: string, itemType: string) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
}) {
  // NO client-side filtering - server handles everything
  const groupedItems = groupItemsByTimePeriod(items);

  return (
    <div className="mt-2 rounded-xl border border-[var(--border-color)] overflow-hidden bg-[var(--card-bg)] shadow-sm dark:shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
      {/* Sticky Header */}
      <div 
        className="grid items-center py-2.5 px-4 text-[11px] font-semibold uppercase tracking-[0.08em] sticky top-0 z-10"
        style={{ 
          gridTemplateColumns: GRID_COLS,
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

      {/* Empty State or Content */}
      {items.length === 0 ? (
        <ModeAwareEmptyState 
          mode={mode}
          tab={selectedTab}
          searchQuery={searchQuery}
          filter=""
        />
      ) : (
        <>
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
              {/* Data rows */}
              {group.items.map((item, index) => (
                <ModeAwareGridRow 
                  key={`${group.label}-${index}`} 
                  item={item as any}
                  mode={mode}
                  density={density}
                  isStarred={starredItemIds?.has(item.id)}
                  onToggleStar={onToggleStar ? () => onToggleStar(item.id, item.type) : undefined}
                />
              ))}
            </div>
          ))}
          
          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center py-4" style={{ borderTop: '1px solid var(--divider)' }}>
              <button 
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors bg-[var(--surface-2)] border-[var(--border-color)] text-[var(--text-2)] hover:bg-[var(--surface-3)] hover:border-[var(--brand-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:opacity-50"
              >
                {isLoadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================
// MAIN HOME CONTENT
// ============================================
export function HomeContent() {
  const navigate = useNavigate();
  
  // Unified filter state from URL
  const {
    mode,
    filters,
    debouncedSearch,
    sort,
    page,
    pageSize,
    activeFilterCount,
    hasFilters,
    setMode,
    setScope,
    setSearch,
    setSort,
    setFilters,
    clearFilters,
    setPage,
  } = useHomeFilters();
  
  // Local UI state
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [pinnedProjects, setPinnedProjects] = useState<string[]>([]);
  const [isProjectsCollapsed, setIsProjectsCollapsed] = useState(false);
  const [accumulatedItems, setAccumulatedItems] = useState<UnifiedWorkItem[]>([]);
  
  // Starred items
  const starredItemIds = useStarredItemIds();
  const starredItems = useStarredDeliveryItems();
  const starredCount = useStarredItemsCount();
  const toggleStarMutation = useToggleStar();

  // Unified data hooks with real-time updates
  const summary = useUnifiedHomeSummary(mode);
  const itemsQuery = useUnifiedHomeItems({
    mode,
    filters,
    search: debouncedSearch,
    sort,
    page,
    pageSize,
  });

  // Accumulate items for pagination
  useEffect(() => {
    if (itemsQuery.data?.items) {
      if (page === 1) {
        setAccumulatedItems(itemsQuery.data.items);
      } else {
        setAccumulatedItems(prev => {
          const existingIds = new Set(prev.map(i => i.id));
          const newItems = itemsQuery.data.items.filter(i => !existingIds.has(i.id));
          return [...prev, ...newItems];
        });
      }
    }
  }, [itemsQuery.data?.items, page]);

  // Reset accumulated items when filters/search/mode change
  useEffect(() => {
    setAccumulatedItems([]);
    setPage(1);
  }, [mode, filters.scope, filters.status, filters.priority, filters.updatedRange, debouncedSearch, setPage]);

  // Get work items based on tab
  const workItems = useMemo(() => {
    if (filters.scope === 'starred') {
      return starredItems.data?.items || [];
    }
    return accumulatedItems;
  }, [filters.scope, starredItems.data, accumulatedItems]);

  // Tab counts from backend
  const tabCounts = useMemo(() => {
    const data = itemsQuery.data?.counts || summary.data;
    return {
      workedOn: data?.workedOn || 0,
      assigned: data?.assigned || 0,
      starred: starredCount.data || data?.starred || 0,
    };
  }, [itemsQuery.data?.counts, summary.data, starredCount.data]);

  const isLoading = summary.isLoading || itemsQuery.isLoading;
  const hasMore = itemsQuery.data?.pagination?.hasMore || false;

  // Load pinned projects from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PINNED);
    if (saved) {
      try {
        setPinnedProjects(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse pinned projects');
      }
    }
  }, []);

  // Save pinned projects to localStorage
  const togglePinProject = (projectId: string) => {
    setPinnedProjects(prev => {
      const newPinned = prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId].slice(0, 3);
      localStorage.setItem(STORAGE_KEY_PINNED, JSON.stringify(newPinned));
      return newPinned;
    });
  };

  const handleLoadMore = () => {
    if (hasMore && !itemsQuery.isFetching) {
      setPage(page + 1);
    }
  };

  const handleModeChange = (newMode: HomeRoleMode) => {
    setAccumulatedItems([]);
    setMode(newMode);
  };

  const handleTabChange = (tab: string) => {
    setAccumulatedItems([]);
    setScope(tab as any);
  };

  const sortOptions = [
    { label: 'Recently updated', value: 'updated' },
    { label: 'Priority', value: 'priority' },
    { label: 'Status', value: 'status' },
    ...(mode === 'planner' ? [{ label: 'Planned date', value: 'planned-date' }] : []),
  ];

  // Mode-specific focus widgets
  const renderFocusWidgets = () => {
    switch (mode) {
      case 'operations':
        return (
          <>
            <FocusWidget 
              title="All incidents"
              icon={AlertTriangle}
              primaryCount={tabCounts.workedOn}
              subtitle="Total active"
              onClick={() => handleTabChange('worked-on')}
            />
            <FocusWidget 
              title="Assigned to me"
              icon={Briefcase}
              primaryCount={tabCounts.assigned}
              subtitle="My workload"
              onClick={() => handleTabChange('assigned')}
            />
            <FocusWidget 
              title="Starred"
              icon={Star}
              primaryCount={tabCounts.starred}
              subtitle="Quick access"
              onClick={() => handleTabChange('starred')}
            />
          </>
        );
      case 'planner':
        return (
          <>
            <FocusWidget 
              title="Active work"
              icon={Calendar}
              primaryCount={tabCounts.workedOn}
              subtitle="Planned & In Progress"
              onClick={() => handleTabChange('worked-on')}
            />
            <FocusWidget 
              title="Upcoming"
              icon={Clock}
              primaryCount={tabCounts.assigned}
              subtitle="Backlog & On Hold"
              onClick={() => handleTabChange('assigned')}
            />
            <FocusWidget 
              title="Needs review"
              icon={FileText}
              primaryCount={tabCounts.starred}
              subtitle="Decision required"
              onClick={() => handleTabChange('starred')}
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
              primaryCount={tabCounts.workedOn}
              subtitle="Active items"
              onClick={() => handleTabChange('worked-on')}
            />
            <FocusWidget 
              title="Assigned"
              icon={CheckCircle}
              primaryCount={tabCounts.assigned}
              subtitle="Assigned to me"
              onClick={() => handleTabChange('assigned')}
            />
            <FocusWidget 
              title="Starred"
              icon={Star}
              primaryCount={tabCounts.starred}
              subtitle="Quick access"
              onClick={() => handleTabChange('starred')}
            />
          </>
        );
    }
  };

  // Get mode-specific empty state label
  const getModeLabel = () => {
    switch (mode) {
      case 'operations': return 'operations';
      case 'planner': return 'planner';
      default: return 'delivery';
    }
  };

  return (
    <div 
      className="min-h-screen font-sans"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {/* Responsive container */}
      <div className="w-full max-w-[1680px] 2xl:max-w-[1920px] mx-auto px-6 xl:px-8 py-3">
        {/* Page header row */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold leading-7 tracking-tight m-0 text-[var(--text-1)]">
            For you
          </h1>
          <HomeRoleModeSelector value={mode} onChange={handleModeChange} />
        </div>

        {/* Critical Strip - only show in Operations mode */}
        {mode === 'operations' && (
          <div className="mt-3">
            <CriticalStrip
              majorIncidents={{ open: 0, breached: 0, atRisk: 0 }}
              slaAtRisk={0}
              awaitingMe={0}
              blocked={0}
              activeFilter="all"
              currentMode={mode}
              onFilterChange={() => {}}
              onModeChange={handleModeChange}
            />
          </div>
        )}

        {/* Divider */}
        <div className="h-px mt-3 mb-3 bg-[var(--border-color)]" />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_240px] gap-4">
          {/* Left Column - Your Work */}
          <div>
            {/* Section title with active filter indicator */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-[var(--text-1)]">
                Your work
              </span>
              {hasFilters && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                  {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
                  <button 
                    onClick={clearFilters}
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

            {/* UNIFIED HomeScopeTabs - identical for all modes */}
            <HomeScopeTabs
              value={filters.scope as HomeScopeValue}
              onChange={handleTabChange as (value: HomeScopeValue) => void}
              counts={tabCounts}
            />

            {/* Unified Toolbar with REAL filter drawer */}
            <div className="mt-2">
              <UnifiedToolbar
                searchValue={filters.search}
                onSearchChange={setSearch}
                searchPlaceholder="Search in your work list…"
                sortOptions={sortOptions}
                sortValue={sort}
                onSortChange={(val) => setSort(val as any)}
                density={density}
                onDensityChange={setDensity}
                activeFilters={activeFilterCount}
                filterContent={
                  <HomeUnifiedFilterDrawer
                    mode={mode}
                    filters={filters}
                    onFiltersChange={setFilters}
                    onClear={clearFilters}
                    hasActiveFilters={hasFilters}
                  />
                }
              />
            </div>

            {/* Unified Data Grid - NO local filtering */}
            <UnifiedDataGrid 
              items={workItems as UnifiedWorkItem[]}
              mode={mode}
              onLoadMore={handleLoadMore}
              searchQuery={filters.search}
              selectedTab={filters.scope}
              density={density}
              starredItemIds={starredItemIds.data}
              onToggleStar={(itemId, itemType) => {
                const isStarred = starredItemIds.data?.has(itemId) || false;
                toggleStarMutation.mutate({
                  itemId,
                  itemType: itemType as any,
                  isCurrentlyStarred: isStarred,
                });
              }}
              hasMore={hasMore}
              isLoadingMore={itemsQuery.isFetching && page > 1}
            />
          </div>

          {/* Right Column - My Focus (mode-specific) */}
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
