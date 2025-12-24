import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ChevronDown, ChevronUp, Star, MoreHorizontal, ExternalLink, CheckCircle, 
  Clock, Pin, Settings, Kanban, List, AlertTriangle, Briefcase, Calendar, FileText
} from 'lucide-react';
import { WorkItemTypeIcon } from './icons/WorkItemTypeIcon';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { SegmentedTabs, SegmentedTab } from '@/components/ui/segmented-tabs';
import { UnifiedToolbar } from '@/components/ui/unified-toolbar';
import { CriticalStrip, ActiveFilter } from './home/CriticalStrip';
import { HomeRoleModeSelector, HomeRoleMode } from './home/HomeRoleModeSelector';
import { ModeAwareGridRow } from './home/WorkGridRow';
import { ModeAwareEmptyState } from './home/EmptyStates';
// Domain-separated hooks - each mode has its own query hooks
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

const ITEMS_PER_PAGE = 20;
const STORAGE_KEY_PINNED = 'catalyst_home_pinned_projects';

// Unified work item type for display
type HomeWorkItem = OperationsWorkItem | DeliveryWorkItem | PlannerWorkItem;

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

// Tab configurations per mode
const MODE_TABS: Record<HomeRoleMode, { value: string; label: string }[]> = {
  operations: [], // Operations has no tabs - just a work grid
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

// Default tab per mode
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
// MODE-AWARE DATA GRID COMPONENT
// ============================================
const GRID_COLS = '100px 1fr 160px 100px 80px 80px';

function ModeAwareDataGrid({ 
  items, 
  mode,
  visibleCount, 
  onLoadMore,
  searchQuery,
  selectedTab,
  activeFilter,
  density = 'comfortable',
  starredItemIds,
  onToggleStar,
}: { 
  items: HomeWorkItem[]; 
  mode: HomeRoleMode;
  visibleCount: number;
  onLoadMore: () => void;
  searchQuery: string;
  selectedTab: string;
  activeFilter: string;
  density?: 'compact' | 'comfortable';
  starredItemIds?: Set<string>;
  onToggleStar?: (itemId: string, itemType: string) => void;
}) {
  // Filter items by search (client-side backup - server should handle this)
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item.key.toLowerCase().includes(query) ||
      item.summary.toLowerCase().includes(query) ||
      item.project.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const groupedItems = groupItemsByTimePeriod(filteredItems);
  let displayedCount = 0;
  const hasMore = visibleCount < filteredItems.length;

  return (
    <div className="mt-2 rounded-xl border border-[var(--border-color)] overflow-hidden bg-[var(--card-bg)] shadow-sm dark:shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
      {/* Sticky Header - olive tinted in dark mode */}
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
      {filteredItems.length === 0 ? (
        <ModeAwareEmptyState 
          mode={mode}
          tab={selectedTab}
          searchQuery={searchQuery}
          filter={activeFilter}
        />
      ) : (
        <>
          {groupedItems.map((group, groupIndex) => {
            const remainingSlots = visibleCount - displayedCount;
            if (remainingSlots <= 0) return null;
            
            const itemsToShow = group.items.slice(0, remainingSlots);
            displayedCount += itemsToShow.length;

            return (
              <div key={groupIndex}>
                {/* Section header row - TODAY / THIS WEEK / OLDER */}
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
                {/* Data rows with visible dividers */}
                {itemsToShow.map((item, index) => (
                  <ModeAwareGridRow 
                    key={`${group.label}-${index}`} 
                    item={item}
                    mode={mode}
                    density={density}
                    isStarred={starredItemIds?.has(item.id)}
                    onToggleStar={onToggleStar ? () => onToggleStar(item.id, item.type) : undefined}
                  />
                ))}
              </div>
            );
          })}
          
          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center py-4" style={{ borderTop: '1px solid var(--divider)' }}>
              <button 
                onClick={onLoadMore}
                className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors bg-[var(--surface-2)] border-[var(--border-color)] text-[var(--text-2)] hover:bg-[var(--surface-3)] hover:border-[var(--brand-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                Load more
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
  const [searchParams, setSearchParams] = useSearchParams();
  
  // URL state - mode, tab, filter
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

  // ============================================
  // URL STATE MANAGEMENT
  // ============================================
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
    // Reset tab to default for new mode, preserve filter if applicable
    const newParams = new URLSearchParams();
    newParams.set('mode', newMode);
    // Don't carry over filters between modes
    setSearchParams(newParams, { replace: true });
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const handleTabChange = (tab: string) => {
    updateUrlState({ tab, filter: null }); // Clear filter when changing tabs
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const handleFilterChange = (filter: ActiveFilter) => {
    updateUrlState({ filter: filter === 'all' ? null : filter });
  };

  // ============================================
  // DOMAIN-SEPARATED DATA FETCHING
  // Each mode queries different backend services
  // ============================================
  
  // Operations mode: Incident Management + Release Management
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

  // Delivery mode: Execution work items
  const deliverySummary = useHomeDeliverySummary();
  const deliveryItems = useHomeDeliveryItems({
    scope: selectedTab === 'assigned' ? 'assigned' : 'worked-on',
    search: searchQuery || undefined,
    sort: sortBy === 'priority' ? 'priority' : sortBy === 'due-date' ? 'due-date' : 'updated',
    page: 1,
    pageSize: visibleCount,
  });

  // Starred items - separate query for starred tab
  const starredItemIds = useStarredItemIds();
  const starredItems = useStarredDeliveryItems();
  const starredCount = useStarredItemsCount();
  const toggleStarMutation = useToggleStar();

  // Planner mode: Work Manager
  const plannerSummary = useHomePlannerSummary();
  const plannerItems = useHomePlannerItems({
    category: selectedTab === 'upcoming' ? 'upcoming' : 
              selectedTab === 'pending-review' ? 'pending-review' : 'planned',
    search: searchQuery || undefined,
    sort: sortBy === 'priority' ? 'priority' : 'planned-date',
    page: 1,
    pageSize: visibleCount,
  });

  // Get data based on current mode
  const { workItems, criticalCounts, isLoading, projects } = useMemo(() => {
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
          projects: [] as HomeProject[],
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
          projects: [] as HomeProject[],
        };
      case 'delivery':
      default:
        // If starred tab, use starred items; otherwise use regular delivery items
        const items = selectedTab === 'starred' 
          ? (starredItems.data?.items || [])
          : (deliveryItems.data?.items || []);
        return {
          workItems: items,
          criticalCounts: {
            majorIncidents: { open: 0, breached: 0, atRisk: 0 },
            slaAtRisk: 0,
            awaitingMe: 0,
            blocked: items.filter((i: any) => i.blocked).length,
            myWorkload: {
              incidents: 0,
              workItems: deliveryItems.data?.counts.total || 0,
            },
          },
          isLoading: selectedTab === 'starred' 
            ? starredItems.isLoading 
            : (deliverySummary.isLoading || deliveryItems.isLoading),
          projects: [] as HomeProject[],
        };
    }
  }, [
    roleMode,
    selectedTab,
    operationsSummary.data, operationsItems.data, operationsSummary.isLoading, operationsItems.isLoading,
    deliverySummary.data, deliveryItems.data, deliverySummary.isLoading, deliveryItems.isLoading,
    plannerSummary.data, plannerItems.data, plannerSummary.isLoading, plannerItems.isLoading,
    starredItems.data, starredItems.isLoading,
  ]);

  // Tab counts from backend - mode specific
  const tabCounts = useMemo(() => {
    switch (roleMode) {
      case 'operations':
        return {
          total: operationsItems.data?.counts.total || 0,
        };
      case 'planner':
        return {
          planned: plannerItems.data?.counts.planned || 0,
          upcoming: plannerItems.data?.counts.upcoming || 0,
          pendingReview: plannerItems.data?.counts.pendingReview || 0,
        };
      case 'delivery':
      default:
        return {
          workedOn: deliveryItems.data?.counts.workedOn || 0,
          assigned: deliveryItems.data?.counts.assigned || 0,
          starred: starredCount.data || 0,
        };
    }
  }, [roleMode, operationsItems.data, plannerItems.data, deliveryItems.data, starredCount.data]);

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

  // Sort projects: pinned first, then recent
  const sortedProjects = useMemo(() => {
    const pinned = projects.filter(p => pinnedProjects.includes(p.id));
    const unpinned = projects.filter(p => !pinnedProjects.includes(p.id));
    return [...pinned, ...unpinned];
  }, [projects, pinnedProjects]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  const sortOptions = [
    { label: 'Recently updated', value: 'recently-updated' },
    { label: 'Recently viewed', value: 'recently-viewed' },
    { label: 'Priority', value: 'priority' },
    { label: 'Due date', value: 'due-date' },
  ];

  // Get current mode tabs
  const currentModeTabs = MODE_TABS[roleMode];
  const hasTabs = currentModeTabs.length > 0;

  // Get tab count for display
  const getTabCount = (tabValue: string): number => {
    if (roleMode === 'delivery') {
      const counts = tabCounts as { workedOn: number; assigned: number; starred: number };
      switch (tabValue) {
        case 'worked-on': return counts.workedOn;
        case 'assigned': return counts.assigned;
        case 'starred': return counts.starred;
        default: return 0;
      }
    }
    if (roleMode === 'planner') {
      const counts = tabCounts as { planned: number; upcoming: number; pendingReview: number };
      switch (tabValue) {
        case 'planned': return counts.planned;
        case 'upcoming': return counts.upcoming;
        case 'pending-review': return counts.pendingReview;
        default: return 0;
      }
    }
    return 0;
  };

  // Mode-specific focus widgets
  const renderFocusWidgets = () => {
    switch (roleMode) {
      case 'operations':
        return (
          <>
            <FocusWidget 
              title="Active incidents"
              icon={AlertTriangle}
              primaryCount={criticalCounts.myWorkload.incidents}
              subtitle="Assigned to me"
              onClick={() => handleFilterChange('all')}
            />
            <FocusWidget 
              title="SLA at risk"
              icon={Clock}
              primaryCount={criticalCounts.slaAtRisk}
              subtitle="Approaching breach"
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
              onClick={() => handleTabChange('worked-on')}
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
      {/* Responsive container */}
      <div className="w-full max-w-[1680px] 2xl:max-w-[1920px] mx-auto px-6 xl:px-8 py-3">
        {/* Page header row */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold leading-7 tracking-tight m-0 text-[var(--text-1)]">
            For you
          </h1>
          <HomeRoleModeSelector value={roleMode} onChange={handleModeChange} />
        </div>

        {/* Critical Strip - only show in Operations mode */}
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

        {/* Divider */}
        <div className="h-px mt-3 mb-3 bg-[var(--border-color)]" />

        {/* Recent Projects Section - only show if projects exist */}
        {projects.length > 0 && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <button 
                onClick={() => pinnedProjects.length > 0 && setIsProjectsCollapsed(!isProjectsCollapsed)}
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium text-[var(--text-1)]",
                  pinnedProjects.length > 0 && "cursor-pointer hover:text-[var(--text-2)]"
                )}
              >
                Recent projects
                {pinnedProjects.length > 0 && (
                  isProjectsCollapsed 
                    ? <ChevronDown className="w-3.5 h-3.5" />
                    : <ChevronUp className="w-3.5 h-3.5" />
                )}
                {pinnedProjects.length > 0 && (
                  <span className="text-xs text-[var(--text-3)] ml-1">
                    ({pinnedProjects.length} pinned)
                  </span>
                )}
              </button>
              <button 
                onClick={() => navigate('/projects')}
                className="text-xs no-underline transition-colors text-[var(--text-2)] hover:text-[var(--text-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] rounded px-1"
              >
                View all projects →
              </button>
            </div>

            {!isProjectsCollapsed && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {sortedProjects.map((project) => (
                  <ProjectCard 
                    key={project.id} 
                    project={project}
                    isPinned={pinnedProjects.includes(project.id)}
                    onPin={() => togglePinProject(project.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_240px] gap-4">
          {/* Left Column - Your Work */}
          <div>
            {/* Section title with active filter indicator */}
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

            {/* Mode-specific tabs - only show if mode has tabs */}
            {hasTabs && (
              <SegmentedTabs value={selectedTab} onValueChange={handleTabChange}>
                {currentModeTabs.map(tab => (
                  <SegmentedTab key={tab.value} value={tab.value} count={getTabCount(tab.value)}>
                    {tab.label}
                  </SegmentedTab>
                ))}
              </SegmentedTabs>
            )}

            {/* Unified Toolbar */}
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

            {/* Mode-Aware Data Grid */}
            <ModeAwareDataGrid 
              items={workItems} 
              mode={roleMode}
              visibleCount={visibleCount}
              onLoadMore={handleLoadMore}
              searchQuery={searchQuery}
              selectedTab={selectedTab}
              activeFilter={activeFilter}
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
