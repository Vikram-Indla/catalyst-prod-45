import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronDown, Star, MoreHorizontal, ExternalLink, CheckCircle, 
  Clock, Sparkles, Pin, Settings, Kanban, List
} from 'lucide-react';
import { projects, activityItems, Project, ActivityItem, groupItemsByTimePeriod } from '@/data/homePageData';
import { WorkItemTypeIcon } from './icons/WorkItemTypeIcon';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { SegmentedTabs, SegmentedTab } from '@/components/ui/segmented-tabs';
import { UnifiedToolbar } from '@/components/ui/unified-toolbar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ITEMS_PER_PAGE = 10;

// ============================================
// FOCUS WIDGET COMPONENT
// ============================================
function FocusWidget({ 
  title, 
  icon: Icon, 
  primaryCount, 
  secondaryLabel,
  secondaryCount,
  subtitle,
  accent = false,
  onClick,
}: { 
  title: string; 
  icon: React.ElementType; 
  primaryCount: number; 
  secondaryLabel?: string;
  secondaryCount?: number;
  subtitle?: string;
  accent?: boolean;
  onClick?: () => void;
}) {
  return (
    <div 
      className={cn(
        "p-3 rounded-lg transition-all cursor-pointer group",
        "bg-[var(--surface-2)] border border-[var(--border-color)]",
        "hover:bg-[var(--surface-3)] hover:border-[var(--border-accent)]"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div 
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              accent ? "bg-[var(--accent-muted)]" : "bg-[var(--surface-3)]"
            )}
          >
            <Icon className="w-4 h-4" style={{ color: accent ? 'var(--accent-color)' : 'var(--icon-default)' }} />
          </div>
          <div>
            <div className="text-sm font-medium text-[var(--text-1)]">{title}</div>
            {subtitle && (
              <div className="text-xs mt-0.5 text-[var(--text-3)]">{subtitle}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {secondaryLabel && secondaryCount !== undefined && (
            <div className="text-right">
              <div className="text-base font-semibold tabular-nums leading-tight text-[var(--text-1)]">
                {secondaryCount}
              </div>
              <div className="text-[10px] uppercase tracking-wider font-medium mt-0.5 text-[var(--text-3)]">
                {secondaryLabel}
              </div>
            </div>
          )}
          <div className="text-right">
            <div 
              className={cn(
                "text-xl font-bold tabular-nums leading-tight",
                accent ? "text-[var(--accent-color)]" : "text-[var(--text-1)]"
              )}
            >
              {primaryCount}
            </div>
            <div className="text-[10px] uppercase tracking-wider font-medium mt-0.5 text-[var(--text-3)]">
              Open
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PROJECT CARD COMPONENT
// ============================================
function ProjectCard({ project, onPin }: { project: Project; onPin?: () => void }) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  
  const handleCardClick = () => {
    navigate(`/project/${project.key.toLowerCase()}`);
  };

  return (
    <div 
      className={cn(
        "rounded-lg overflow-hidden transition-all cursor-pointer group",
        "border border-[var(--border-color)] bg-[var(--surface-2)]",
        "hover:border-[var(--border-accent)] hover:shadow-[var(--shadow-card-hover)]"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Header accent bar */}
      <div className="h-1" style={{ backgroundColor: project.color }} />
      
      {/* Card content */}
      <div className="p-3 relative">
        {/* Quick actions - visible on hover */}
        <div 
          className={cn(
            "absolute top-2 right-2 flex items-center gap-0.5 transition-opacity z-10",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        >
          <button 
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-[var(--surface-3)] text-[var(--icon-muted)]"
            onClick={(e) => { e.stopPropagation(); onPin?.(); }}
            title="Pin"
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="w-7 h-7 rounded flex items-center justify-center hover:bg-[var(--surface-3)] text-[var(--icon-muted)]"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
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
                onClick={() => onPin?.()}
                className="text-[var(--text-1)] cursor-pointer"
              >
                <Pin className="w-4 h-4 mr-2" />
                Pin / Unpin
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => navigate(`/project/${project.key.toLowerCase()}/backlog`)}
                className="text-[var(--text-1)] cursor-pointer"
              >
                <List className="w-4 h-4 mr-2" />
                View Backlog
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate(`/project/${project.key.toLowerCase()}/kanban`)}
                className="text-[var(--text-1)] cursor-pointer"
              >
                <Kanban className="w-4 h-4 mr-2" />
                View Kanban
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

        {/* Project info */}
        <div className="flex items-start gap-2.5 mb-2.5">
          <div 
            className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: project.color }}
          >
            {project.key.slice(0, 2)}
          </div>
          <div className="min-w-0 pr-12">
            <div className="text-sm font-semibold leading-5 truncate text-[var(--text-1)]">
              {project.name}
            </div>
            <div className="text-xs leading-4 mt-0.5 text-[var(--text-3)]">
              {project.type}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-2">
          <span 
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-[var(--accent-muted)] text-[var(--text-1)]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)]" />
            {project.openCount} open
          </span>
          <span 
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-[var(--nav-active-bg)] text-[var(--text-1)]"
          >
            <CheckCircle className="w-3 h-3 text-[var(--brand-active)]" />
            {project.doneCount} done
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-[var(--divider)] flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={project.boardsCount === 0}>
            <button
              className={cn(
                "flex items-center gap-1 text-xs bg-transparent border-none cursor-pointer p-0",
                project.boardsCount > 0 ? "text-[var(--text-2)]" : "text-[var(--text-3)]"
              )}
              disabled={project.boardsCount === 0}
              onClick={(e) => e.stopPropagation()}
            >
              Boards ({project.boardsCount})
              {project.boardsCount > 0 && <ChevronDown className="w-3 h-3" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            className="bg-[var(--surface-1)] border-[var(--border-color)] z-[300]"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem className="text-[var(--text-1)]">Team Board</DropdownMenuItem>
            <DropdownMenuItem className="text-[var(--text-1)]">Sprint Board</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="text-[11px] text-[var(--text-3)]">2h ago</span>
      </div>
    </div>
  );
}

// ============================================
// DATA GRID ROW COMPONENT
// ============================================
const GRID_COLS = '40px 100px 1fr 160px 100px 80px 80px';

function DataGridRow({ 
  item, 
  isSelected, 
  onSelect,
  density = 'comfortable'
}: { 
  item: ActivityItem; 
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  density?: 'compact' | 'comfortable';
}) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const timeAgo = formatDistanceToNow(item.activityDate, { addSuffix: false });
  
  const rowHeight = density === 'compact' ? 'py-1.5' : 'py-2.5';

  return (
    <div 
      className={cn(
        "grid items-center px-3 transition-colors cursor-pointer",
        rowHeight,
        isHovered && "bg-[var(--row-hover)]",
        isSelected && "bg-[var(--row-selected)]"
      )}
      style={{ 
        gridTemplateColumns: GRID_COLS,
        borderBottom: '1px solid var(--divider)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => navigate(`/work-item/${item.id}`)}
    >
      {/* Checkbox */}
      <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <Checkbox 
          checked={isSelected}
          onCheckedChange={onSelect}
          className="border-[var(--border-color)] data-[state=checked]:bg-[var(--accent-color)] data-[state=checked]:border-[var(--accent-color)]"
        />
      </div>

      {/* Key */}
      <div className="flex items-center gap-2">
        <WorkItemTypeIcon type={item.type} size={14} />
        <span className="text-xs font-medium text-[var(--text-2)]">{item.id}</span>
      </div>

      {/* Summary */}
      <div className="min-w-0 pr-4">
        <div 
          className="text-sm leading-5 text-[var(--text-1)] truncate"
        >
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
          <Avatar className="w-6 h-6">
            <AvatarFallback 
              className="text-[10px] font-medium bg-[var(--surface-3)] text-[var(--text-2)]"
            >
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
          className="w-6 h-6 rounded flex items-center justify-center hover:bg-[var(--nav-hover-bg)] text-[var(--icon-muted)]"
          onClick={(e) => e.stopPropagation()}
          title="Star"
        >
          <Star className="w-3.5 h-3.5" />
        </button>
        <button 
          className="w-6 h-6 rounded flex items-center justify-center hover:bg-[var(--nav-hover-bg)] text-[var(--icon-muted)]"
          onClick={(e) => e.stopPropagation()}
          title="Open in new tab"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-[var(--nav-hover-bg)] text-[var(--icon-muted)]"
              onClick={(e) => e.stopPropagation()}
              title="More actions"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
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
// DATA GRID COMPONENT
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredItems.slice(0, visibleCount).map(item => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (id: string, selected: boolean) => {
    const newSelected = new Set(selectedIds);
    if (selected) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const allSelected = filteredItems.length > 0 && selectedIds.size === Math.min(visibleCount, filteredItems.length);
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="mt-3">
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-[var(--accent-muted)] border border-[var(--border-accent)]">
          <span className="text-sm font-medium text-[var(--text-1)]">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-1">
            <button className="px-2.5 py-1 rounded text-xs font-medium text-[var(--text-2)] hover:bg-[var(--surface-3)]">
              Star
            </button>
            <button className="px-2.5 py-1 rounded text-xs font-medium text-[var(--text-2)] hover:bg-[var(--surface-3)]">
              Assign
            </button>
            <button className="px-2.5 py-1 rounded text-xs font-medium text-[var(--text-2)] hover:bg-[var(--surface-3)]">
              Move
            </button>
          </div>
          <button 
            className="ml-auto text-xs text-[var(--text-3)] hover:text-[var(--text-2)]"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Sticky Header */}
      <div 
        className="grid items-center py-2 px-3 text-[11px] font-semibold uppercase tracking-wide sticky top-0 z-10 rounded-t-lg"
        style={{ 
          gridTemplateColumns: GRID_COLS,
          color: 'var(--text-2)',
          backgroundColor: 'var(--surface-2)',
          borderBottom: '1px solid var(--divider)',
        }}
      >
        <div className="flex items-center justify-center">
          <Checkbox 
            checked={allSelected}
            onCheckedChange={handleSelectAll}
            className={cn(
              "border-[var(--border-color)]",
              someSelected && "data-[state=indeterminate]:bg-[var(--accent-color)]"
            )}
          />
        </div>
        <div>Key</div>
        <div>Summary</div>
        <div>Project</div>
        <div>Updated</div>
        <div>Assignee</div>
        <div></div>
      </div>

      {/* Loading / Empty States */}
      {filteredItems.length === 0 ? (
        <div className="py-12 text-center">
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
                    "text-[11px] font-semibold uppercase tracking-wider py-1.5 px-3",
                    groupIndex > 0 ? 'mt-3' : 'mt-1'
                  )} 
                  style={{ color: 'var(--text-3)' }}
                >
                  {group.label}
                </div>
                {itemsToShow.map((item, index) => (
                  <DataGridRow 
                    key={`${group.label}-${index}`} 
                    item={item}
                    isSelected={selectedIds.has(item.id)}
                    onSelect={(selected) => handleSelectItem(item.id, selected)}
                    density={density}
                  />
                ))}
              </div>
            );
          })}
          
          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center mt-4 pb-4">
              <button 
                onClick={onLoadMore}
                className="px-4 py-2 text-sm font-medium rounded-md border transition-colors bg-[var(--surface-2)] border-[var(--border-color)] text-[var(--text-2)] hover:bg-[var(--surface-3)]"
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
  const [selectedTab, setSelectedTab] = useState('worked-on');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recently-updated');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');

  // Calculate counts
  const workedOnCount = activityItems.length;
  const viewedCount = 0;
  const assignedCount = activityItems.filter(item => 
    item.status !== 'In Production' && item.status !== 'Done'
  ).length;
  const starredCount = 0;
  const boardsCount = projects.reduce((acc, p) => acc + p.boardsCount, 0);
  
  // Focus widget data
  const dueSoonCount = Math.floor(assignedCount * 0.3);
  const recentlyUpdatedCount = activityItems.filter(item => {
    const daysDiff = (Date.now() - item.activityDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  }).length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  // Get items for current tab
  const getTabItems = () => {
    switch (selectedTab) {
      case 'assigned':
        return activityItems.filter(item => item.status !== 'In Production' && item.status !== 'Done');
      case 'viewed':
      case 'starred':
      case 'boards':
        return [];
      default:
        return activityItems;
    }
  };

  const sortOptions = [
    { label: 'Recently updated', value: 'recently-updated' },
    { label: 'Recently viewed', value: 'recently-viewed' },
    { label: 'Priority', value: 'priority' },
    { label: 'Due date', value: 'due-date' },
  ];

  return (
    <div 
      className="min-h-screen font-sans"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {/* Constrained container - tighter padding for enterprise density */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4">
        {/* Page title */}
        <h1 className="text-xl font-semibold leading-7 tracking-tight m-0 text-[var(--text-1)]">
          For you
        </h1>

        {/* Divider - tighter spacing */}
        <div className="h-px mt-3 mb-4 bg-[var(--divider)]" />

        {/* Recent Projects Section */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-medium text-[var(--text-1)]">
              Recent projects
            </div>
            <button 
              onClick={() => navigate('/projects')}
              className="text-sm no-underline transition-colors text-[var(--text-2)] hover:text-[var(--text-1)]"
            >
              View all projects →
            </button>
          </div>

          {/* Project cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>

        {/* Two Column Layout - tighter gap */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-4">
          {/* Left Column - Activity Feed */}
          <div>
            {/* Segmented Tabs */}
            <SegmentedTabs value={selectedTab} onValueChange={setSelectedTab}>
              <SegmentedTab value="worked-on" count={workedOnCount}>Worked on</SegmentedTab>
              <SegmentedTab value="viewed" count={viewedCount}>Viewed</SegmentedTab>
              <SegmentedTab value="assigned" count={assignedCount}>Assigned to me</SegmentedTab>
              <SegmentedTab value="starred" count={starredCount}>Starred</SegmentedTab>
              <SegmentedTab value="boards" count={boardsCount}>Boards</SegmentedTab>
            </SegmentedTabs>

            {/* Unified Toolbar - Search + Filter + Sort + View in ONE row */}
            <div className="mt-3">
              <UnifiedToolbar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search items..."
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
            {selectedTab === 'boards' ? (
              <div className="py-12 text-center text-sm text-[var(--text-3)]">
                No boards available
              </div>
            ) : selectedTab === 'viewed' || selectedTab === 'starred' ? (
              <div className="py-12 text-center text-sm text-[var(--text-3)]">
                {selectedTab === 'viewed' ? 'No recently viewed items' : 'No starred items'}
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

          {/* Right Column - Focus Widgets */}
          <div className="space-y-2">
            <div className="text-sm font-medium mb-2 text-[var(--text-1)]">
              My focus
            </div>
            
            <FocusWidget 
              title="Assigned to me"
              icon={Clock}
              primaryCount={assignedCount}
              secondaryLabel="Due soon"
              secondaryCount={dueSoonCount}
              accent
              onClick={() => setSelectedTab('assigned')}
            />
            
            <FocusWidget 
              title="Recently updated"
              icon={Sparkles}
              primaryCount={recentlyUpdatedCount}
              subtitle="Last 7 days"
              onClick={() => setSelectedTab('worked-on')}
            />
            
            <FocusWidget 
              title="Starred"
              icon={Star}
              primaryCount={starredCount}
              subtitle="Quick access"
              onClick={() => setSelectedTab('starred')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
