import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronDown, ChevronUp, Star, MoreHorizontal, ExternalLink, CheckCircle, 
  Clock, Pin, Settings, Kanban, List, AlertTriangle, Briefcase
} from 'lucide-react';
import { projects, activityItems, Project, ActivityItem, groupItemsByTimePeriod } from '@/data/homePageData';
import { WorkItemTypeIcon } from './icons/WorkItemTypeIcon';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { SegmentedTabs, SegmentedTab } from '@/components/ui/segmented-tabs';
import { UnifiedToolbar } from '@/components/ui/unified-toolbar';
import { CriticalStrip } from './home/CriticalStrip';
import { HomeRoleModeSelector, HomeRoleMode } from './home/HomeRoleModeSelector';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ITEMS_PER_PAGE = 10;
const STORAGE_KEY_MODE = 'catalyst_home_mode';
const STORAGE_KEY_PINNED = 'catalyst_home_pinned_projects';

// ============================================
// MOCK INCIDENT DATA (wire to real data source)
// ============================================
const mockIncidentData = {
  majorIncidents: { open: 2, breached: 1, atRisk: 1 },
  slaAtRisk: 5,
  awaitingMe: 3,
  blocked: 1,
  myWorkload: { incidents: 4, workItems: 12 },
};

// ============================================
// FOCUS WIDGET COMPONENT (Brand-aligned)
// ============================================
// Calmer, restrained focus widget - triage panel style
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
            {/* Secondary info below title */}
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
// Sleeker project card with optional urgency indicator
function ProjectCard({ 
  project, 
  isPinned,
  onPin,
  hasUrgency = false, // subtle urgency indicator
}: { 
  project: Project; 
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
      {/* Header accent bar - thinner */}
      <div className="h-0.5" style={{ backgroundColor: project.color }} />
      
      {/* Card content - sleeker, reduced padding */}
      <div className="p-2 relative">
        {/* Quick actions - visible on hover */}
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

        {/* Pinned indicator - subtle */}
        {isPinned && !isHovered && (
          <div className="absolute top-1 right-1">
            <Pin className="w-2.5 h-2.5 text-[var(--brand-gold)] fill-current" />
          </div>
        )}

        {/* Project info row */}
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

        {/* Stats row - more compact */}
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
            {/* Subtle urgency indicator */}
            {hasUrgency && (
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
// DATA GRID ROW COMPONENT (NO CHECKBOXES)
// ============================================
const GRID_COLS = '100px 1fr 160px 100px 80px 80px';

function DataGridRow({ 
  item, 
  density = 'comfortable'
}: { 
  item: ActivityItem; 
  density?: 'compact' | 'comfortable';
}) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const timeAgo = formatDistanceToNow(item.activityDate, { addSuffix: false });
  
  const rowHeight = density === 'compact' ? 'py-1' : 'py-2';

  return (
    <div 
      className={cn(
        "grid items-center px-3 transition-colors cursor-pointer",
        rowHeight,
        isHovered && "bg-[var(--row-hover)]"
      )}
      style={{ 
        gridTemplateColumns: GRID_COLS,
        borderBottom: '1px solid var(--divider)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => navigate(`/work-item/${item.id}`)}
    >
      {/* Key */}
      <div className="flex items-center gap-2">
        <WorkItemTypeIcon type={item.type} size={14} />
        <span className="text-xs font-medium text-[var(--text-2)]">{item.id}</span>
      </div>

      {/* Summary */}
      <div className="min-w-0 pr-4">
        <div className="text-sm leading-5 text-[var(--text-1)] truncate">
          {item.summary}
        </div>
      </div>

      {/* Project */}
      <div className="text-xs truncate text-[var(--text-2)]">
        {item.project}
      </div>

      {/* Updated */}
      <div className="text-xs tabular-nums text-[var(--text-2)]">
        {timeAgo} ago
      </div>

      {/* Assignee */}
      <div className="flex justify-start">
        {item.assignee ? (
          <Avatar className="w-5 h-5">
            <AvatarFallback className="text-[9px] font-medium bg-[var(--surface-3)] text-[var(--text-2)]">
              {item.assignee.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <span className="text-[var(--text-3)]">—</span>
        )}
      </div>

      {/* Quick actions */}
      <div className={cn("flex items-center justify-end gap-0.5 transition-opacity", isHovered ? "opacity-100" : "opacity-0")}>
        <button 
          className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--nav-hover-bg)] text-[var(--icon-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          onClick={(e) => e.stopPropagation()}
          title="Star"
        >
          <Star className="w-3 h-3" />
        </button>
        <button 
          className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--nav-hover-bg)] text-[var(--icon-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          onClick={(e) => e.stopPropagation()}
          title="Open in new tab"
        >
          <ExternalLink className="w-3 h-3" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--nav-hover-bg)] text-[var(--icon-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              onClick={(e) => e.stopPropagation()}
              title="More actions"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="bg-[var(--surface-1)] border-[var(--border-color)] z-[300]"
          >
            <DropdownMenuItem className="text-[var(--text-1)]">View details</DropdownMenuItem>
            <DropdownMenuItem className="text-[var(--text-1)]">Assign to me</DropdownMenuItem>
            <DropdownMenuItem className="text-[var(--text-1)]">Change status</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ============================================
// DATA GRID COMPONENT (NO CHECKBOXES)
// ============================================
function DataGrid({ 
  items, 
  visibleCount, 
  onLoadMore,
  searchQuery,
  density = 'comfortable'
}: { 
  items: ActivityItem[]; 
  visibleCount: number;
  onLoadMore: () => void;
  searchQuery: string;
  density?: 'compact' | 'comfortable';
}) {
  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item.id.toLowerCase().includes(query) ||
      item.summary.toLowerCase().includes(query) ||
      item.project.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const groupedItems = groupItemsByTimePeriod(filteredItems);
  let displayedCount = 0;
  const hasMore = visibleCount < filteredItems.length;

  return (
    <div className="mt-2 rounded-lg border-2 border-[var(--border-color)] overflow-hidden bg-[var(--surface-1)] shadow-sm">
      {/* Sticky Header (NO checkbox column) - stronger light mode visibility */}
      <div 
        className="grid items-center py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wide sticky top-0 z-10"
        style={{ 
          gridTemplateColumns: GRID_COLS,
          color: 'var(--text-2)',
          backgroundColor: 'var(--surface-2)',
          borderBottom: '2px solid var(--divider)',
        }}
      >
        <div>Key</div>
        <div>Summary</div>
        <div>Project</div>
        <div>Updated</div>
        <div>Assignee</div>
        <div></div>
      </div>

      {/* Loading / Empty States */}
      {filteredItems.length === 0 ? (
        <div className="py-8 text-center">
          <div className="text-sm text-[var(--text-3)]">
            {searchQuery ? `No results for "${searchQuery}"` : 'No items to show'}
          </div>
        </div>
      ) : (
        <>
          {groupedItems.map((group, groupIndex) => {
            const remainingSlots = visibleCount - displayedCount;
            if (remainingSlots <= 0) return null;
            
            const itemsToShow = group.items.slice(0, remainingSlots);
            displayedCount += itemsToShow.length;

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
                  <DataGridRow 
                    key={`${group.label}-${index}`} 
                    item={item}
                    density={density}
                  />
                ))}
              </div>
            );
          })}
          
          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center mt-3 pb-3">
              <button 
                onClick={onLoadMore}
                className="px-3 py-1.5 text-sm font-medium rounded-md border transition-colors bg-[var(--surface-2)] border-[var(--border-color)] text-[var(--text-2)] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
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
// ACTIVE FILTER TYPE
// ============================================
type ActiveFilter = 'all' | 'major-incidents' | 'sla-at-risk' | 'awaiting-me' | 'blocked';

// ============================================
// MAIN HOME CONTENT
// ============================================
export function HomeContent() {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState('worked-on');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recently-updated');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [pinnedProjects, setPinnedProjects] = useState<string[]>([]);
  const [isProjectsCollapsed, setIsProjectsCollapsed] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  
  // Role mode with localStorage persistence
  const [roleMode, setRoleMode] = useState<HomeRoleMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MODE);
    return (saved as HomeRoleMode) || 'delivery';
  });

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

  // Save role mode to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MODE, roleMode);
  }, [roleMode]);

  // Save pinned projects to localStorage
  const togglePinProject = (projectId: string) => {
    setPinnedProjects(prev => {
      const newPinned = prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId].slice(0, 3); // Max 3 pinned
      localStorage.setItem(STORAGE_KEY_PINNED, JSON.stringify(newPinned));
      return newPinned;
    });
  };

  // Sort projects: pinned first, then recent
  const sortedProjects = useMemo(() => {
    const pinned = projects.filter(p => pinnedProjects.includes(p.id));
    const unpinned = projects.filter(p => !pinnedProjects.includes(p.id));
    return [...pinned, ...unpinned];
  }, [pinnedProjects]);

  // Calculate counts
  const workedOnCount = activityItems.length;
  const assignedCount = activityItems.filter(item => item.assignee).length;
  const starredCount = 0;
  
  // Focus widget data
  const recentlyUpdatedCount = activityItems.filter(item => {
    const daysDiff = (Date.now() - item.activityDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  }).length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  // Handle chip click - set filter and switch to appropriate tab
  const handleChipFilter = (filter: ActiveFilter) => {
    setActiveFilter(filter);
    setSelectedTab('worked-on');
    // In a real implementation, this would filter the work list
    // For now, it sets the filter state which can be used to filter data
  };

  // Get items for current tab (with filter applied)
  const getTabItems = () => {
    let items = activityItems;
    
    // Apply chip filter (mock implementation - would filter real data)
    if (activeFilter !== 'all') {
      // In real implementation, filter by incident type, SLA status, etc.
      // For now, just return all items as placeholder
      items = activityItems;
    }
    
    switch (selectedTab) {
      case 'assigned':
        return items.filter(item => item.assignee);
      case 'starred':
        return [];
      default:
        return items;
    }
  };

  const sortOptions = [
    { label: 'Recently updated', value: 'recently-updated' },
    { label: 'Recently viewed', value: 'recently-viewed' },
    { label: 'Priority', value: 'priority' },
    { label: 'Due date', value: 'due-date' },
  ];

  // Clear filter when tab changes
  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
    if (activeFilter !== 'all') {
      setActiveFilter('all');
    }
  };

  return (
    <div 
      className="min-h-screen font-sans"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {/* Responsive container - wider on laptop/desktop */}
      <div className="w-full max-w-[1680px] 2xl:max-w-[1920px] mx-auto px-6 xl:px-8 py-3">
        {/* Page header row */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold leading-7 tracking-tight m-0 text-[var(--text-1)]">
            For you
          </h1>
          <HomeRoleModeSelector value={roleMode} onChange={setRoleMode} />
        </div>

        {/* Critical Strip - actionable chips */}
        <div className="mt-3">
          <CriticalStrip
            majorIncidents={mockIncidentData.majorIncidents}
            slaAtRisk={mockIncidentData.slaAtRisk}
            awaitingMe={mockIncidentData.awaitingMe}
            blocked={mockIncidentData.blocked}
            activeFilter={activeFilter}
            onFilterChange={handleChipFilter}
          />
        </div>

        {/* Divider - stronger for light mode visibility */}
        <div className="h-px mt-3 mb-3 bg-[var(--border-color)]" />

        {/* Recent Projects Section */}
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

          {/* Project cards grid - 4 columns at xl */}
          {!isProjectsCollapsed && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {sortedProjects.map((project, index) => (
                <ProjectCard 
                  key={project.id} 
                  project={project}
                  isPinned={pinnedProjects.includes(project.id)}
                  onPin={() => togglePinProject(project.id)}
                  hasUrgency={index === 0} // Mock: first project has urgency
                />
              ))}
            </div>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_240px] gap-4">
          {/* Left Column - Your Work */}
          <div>
            {/* Section title with active filter indicator - stronger hierarchy */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-[var(--text-1)]">
                Your work
              </span>
              {activeFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                  {activeFilter.replace('-', ' ')}
                  <button 
                    onClick={() => setActiveFilter('all')}
                    className="ml-0.5 hover:text-[var(--text-1)]"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>

            {/* Segmented Tabs - reduced: Worked on, Assigned, Starred */}
            <SegmentedTabs value={selectedTab} onValueChange={handleTabChange}>
              <SegmentedTab value="worked-on" count={workedOnCount}>Worked on</SegmentedTab>
              <SegmentedTab value="assigned" count={assignedCount}>Assigned</SegmentedTab>
              <SegmentedTab value="starred" count={starredCount}>Starred</SegmentedTab>
            </SegmentedTabs>

            {/* Unified Toolbar - visually secondary */}
            <div className="mt-2">
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

            {/* Data Grid or Exec collapsed state */}
            {roleMode === 'exec' && selectedTab === 'worked-on' ? (
              <div className="mt-3 p-3 rounded-lg border border-[var(--border-color)] bg-[var(--surface-2)]">
                <button 
                  onClick={() => setRoleMode('delivery')}
                  className="text-sm text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] rounded"
                >
                  View work items →
                </button>
              </div>
            ) : selectedTab === 'starred' ? (
              <div className="py-8 text-center text-sm text-[var(--text-3)]">
                No starred items
              </div>
            ) : (
              <DataGrid 
                items={getTabItems()} 
                visibleCount={visibleCount}
                onLoadMore={handleLoadMore}
                searchQuery={searchQuery}
                density={density}
              />
            )}
          </div>

          {/* Right Column - My Focus (sticky triage panel) - strongly contained card */}
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
                {/* My workload */}
                <FocusWidget 
                  title="My workload"
                  icon={Briefcase}
                  primaryCount={mockIncidentData.myWorkload.incidents + mockIncidentData.myWorkload.workItems}
                  secondaryLabel="incidents"
                  secondaryCount={mockIncidentData.myWorkload.incidents}
                  onClick={() => handleTabChange('worked-on')}
                />
                
                {/* Recently updated */}
                <FocusWidget 
                  title="Recently updated"
                  icon={Clock}
                  primaryCount={recentlyUpdatedCount}
                  subtitle="Last 7 days"
                  onClick={() => handleTabChange('worked-on')}
                />
                
                {/* Starred */}
                <FocusWidget 
                  title="Starred"
                  icon={Star}
                  primaryCount={starredCount}
                  subtitle="Quick access"
                  onClick={() => handleTabChange('starred')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
