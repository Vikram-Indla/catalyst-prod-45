import React, { useState } from 'react';
import { ChevronDown, Star, MoreHorizontal, ExternalLink, Filter, ArrowUpDown, Clock, CheckCircle, Sparkles } from 'lucide-react';
import { projects, activityItems, Project, ActivityItem, groupItemsByTimePeriod } from '@/data/homePageData';
import { WorkItemTypeIcon } from './icons/WorkItemTypeIcon';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const ITEMS_PER_PAGE = 10;

// ============================================
// FOCUS WIDGET COMPONENT
// ============================================
function FocusWidget({ 
  title, 
  icon: Icon, 
  count, 
  subtitle, 
  accent = false 
}: { 
  title: string; 
  icon: React.ElementType; 
  count: number; 
  subtitle: string;
  accent?: boolean;
}) {
  return (
    <div 
      className="p-4 rounded-lg transition-colors cursor-pointer hover:bg-[var(--surface-3)]"
      style={{ 
        backgroundColor: 'var(--surface-2)',
        border: '1px solid var(--border-color)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div 
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              accent ? "bg-[var(--accent-muted)]" : "bg-[var(--surface-3)]"
            )}
          >
            <Icon className="w-5 h-5" style={{ color: accent ? 'var(--accent-color)' : 'var(--icon-default)' }} />
          </div>
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{title}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{subtitle}</div>
          </div>
        </div>
        <div 
          className="text-2xl font-semibold tabular-nums"
          style={{ color: accent ? 'var(--accent-color)' : 'var(--text-1)' }}
        >
          {count}
        </div>
      </div>
    </div>
  );
}

// ============================================
// PROJECT TILE COMPONENT
// ============================================
function ProjectTile({ project }: { project: Project }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className="flex-shrink-0 w-[220px] rounded-lg overflow-hidden transition-all cursor-pointer group"
      style={{ 
        border: isHovered ? '1px solid var(--border-strong)' : '1px solid var(--border-color)',
        backgroundColor: isHovered ? 'var(--surface-3)' : 'var(--surface-2)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header accent bar */}
      <div className="h-1.5" style={{ backgroundColor: project.color }} />
      
      {/* Card content */}
      <div className="p-3.5 relative">
        {/* Quick actions - visible on hover */}
        <div 
          className={cn(
            "absolute top-2 right-2 flex items-center gap-1 transition-opacity",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        >
          <button 
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-[var(--surface-3)]"
            style={{ color: 'var(--icon-muted)' }}
            onClick={(e) => { e.stopPropagation(); }}
          >
            <Star className="w-4 h-4" />
          </button>
          <button 
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-[var(--surface-3)]"
            style={{ color: 'var(--icon-muted)' }}
            onClick={(e) => { e.stopPropagation(); }}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Project info row */}
        <div className="flex items-start gap-2.5 mb-3">
          <div 
            className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: project.color }}
          >
            {project.key.slice(0, 2)}
          </div>
          <div className="min-w-0 pr-12">
            <div className="text-sm font-semibold leading-5 truncate" style={{ color: 'var(--text-1)' }}>
              {project.name}
            </div>
            <div className="text-xs leading-4 mt-0.5" style={{ color: 'var(--text-3)' }}>
              {project.type}
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-3)' }}>
          <span>Last opened: 2h ago</span>
        </div>
        
        {/* Stats row */}
        <div className="flex items-center gap-2 mt-3">
          <span 
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
            style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--accent-color)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--accent-color)' }} />
            {project.openCount} open
          </span>
          <span 
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
            style={{ backgroundColor: 'var(--nav-active-bg)', color: 'var(--brand-active)' }}
          >
            <CheckCircle className="w-3 h-3" />
            {project.doneCount} done
          </span>
        </div>
      </div>

      {/* Boards footer */}
      <div className="px-3.5 py-2.5" style={{ borderTop: '1px solid var(--divider)' }}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={project.boardsCount === 0}>
            <button
              className="flex items-center gap-1 text-sm bg-transparent border-none cursor-pointer p-0 leading-5"
              style={{ color: project.boardsCount > 0 ? 'var(--text-2)' : 'var(--text-3)' }}
              disabled={project.boardsCount === 0}
            >
              {project.boardsCount} {project.boardsCount === 1 ? 'board' : 'boards'}
              {project.boardsCount > 0 && <ChevronDown className="w-4 h-4" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--border-color)' }}
            className="z-50"
          >
            <DropdownMenuItem style={{ color: 'var(--text-1)' }}>Board 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ============================================
// FEED ROW COMPONENT
// ============================================
function FeedRow({ item }: { item: ActivityItem }) {
  const [isHovered, setIsHovered] = useState(false);
  const timeAgo = formatDistanceToNow(item.activityDate, { addSuffix: false });
  
  return (
    <div 
      className="grid items-center py-2.5 px-3 rounded-md transition-colors cursor-pointer"
      style={{ 
        gridTemplateColumns: '80px 1fr 140px 90px 80px 32px',
        backgroundColor: isHovered ? 'var(--surface-3)' : 'transparent',
        borderBottom: '1px solid var(--divider)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Key */}
      <div className="flex items-center gap-2">
        <WorkItemTypeIcon type={item.type} size={14} />
        <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>{item.id}</span>
      </div>

      {/* Summary */}
      <div className="min-w-0 pr-4">
        <div className="text-sm leading-5 truncate" style={{ color: 'var(--text-1)' }}>
          {item.summary}
        </div>
      </div>

      {/* Project */}
      <div className="text-sm truncate" style={{ color: 'var(--text-2)' }}>
        {item.project}
      </div>

      {/* Updated */}
      <div className="text-sm tabular-nums" style={{ color: 'var(--text-3)' }}>
        {timeAgo} ago
      </div>

      {/* Assignee */}
      <div className="flex justify-start">
        {item.assignee ? (
          <Avatar className="w-6 h-6">
            <AvatarFallback 
              className="text-[10px] font-medium"
              style={{ backgroundColor: 'var(--surface-3)', color: 'var(--text-2)' }}
            >
              {item.assignee.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <span style={{ color: 'var(--text-3)' }}>—</span>
        )}
      </div>

      {/* Quick actions */}
      <div className={cn("flex items-center gap-1 transition-opacity", isHovered ? "opacity-100" : "opacity-0")}>
        <button 
          className="w-6 h-6 rounded flex items-center justify-center hover:bg-[var(--surface-3)]"
          style={{ color: 'var(--icon-muted)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <Star className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ============================================
// GROUPED ACTIVITY LIST
// ============================================
function GroupedActivityList({ items, visibleCount, onLoadMore }: { 
  items: ActivityItem[]; 
  visibleCount: number;
  onLoadMore: () => void;
}) {
  const groupedItems = groupItemsByTimePeriod(items);
  let displayedCount = 0;
  const hasMore = visibleCount < items.length;

  return (
    <div className="mt-4">
      {/* Column Headers */}
      <div 
        className="grid items-center py-2 px-3 text-xs font-medium uppercase tracking-wide"
        style={{ 
          gridTemplateColumns: '80px 1fr 140px 90px 80px 32px',
          color: 'var(--text-3)',
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

      {groupedItems.map((group, groupIndex) => {
        const remainingSlots = visibleCount - displayedCount;
        if (remainingSlots <= 0) return null;
        
        const itemsToShow = group.items.slice(0, remainingSlots);
        displayedCount += itemsToShow.length;

        return (
          <div key={groupIndex}>
            <div 
              className={cn(
                "text-[11px] font-semibold uppercase tracking-wider py-2 px-3",
                groupIndex > 0 ? 'mt-4' : 'mt-2'
              )} 
              style={{ color: 'var(--text-3)' }}
            >
              {group.label}
            </div>
            {itemsToShow.map((item, index) => (
              <FeedRow key={`${group.label}-${index}`} item={item} />
            ))}
          </div>
        );
      })}
      
      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center mt-6 pb-4">
          <Button 
            variant="outline" 
            onClick={onLoadMore}
            style={{ 
              borderColor: 'var(--border-color)',
              color: 'var(--text-2)',
              backgroundColor: 'var(--surface-2)',
            }}
            className="hover:bg-[var(--surface-3)]"
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================
// TAB COUNT BADGE
// ============================================
function TabCountBadge({ count }: { count: number }) {
  return (
    <span 
      className="ml-1.5 px-1.5 py-0.5 rounded text-[11px] font-medium tabular-nums"
      style={{ backgroundColor: 'var(--surface-3)', color: 'var(--text-2)' }}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

// ============================================
// MAIN HOME CONTENT
// ============================================
export function HomeContent() {
  const [selectedTab, setSelectedTab] = useState('worked-on');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [sortBy, setSortBy] = useState('recently-updated');

  // Calculate counts for tabs
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

  return (
    <div 
      className="min-h-screen font-sans"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {/* Constrained container */}
      <div className="max-w-[1360px] mx-auto px-6 py-6">
        {/* Page title */}
        <h1 
          className="text-2xl font-semibold leading-7 tracking-tight m-0"
          style={{ color: 'var(--text-1)' }}
        >
          For you
        </h1>

        {/* Divider */}
        <div className="h-px mt-5 mb-6" style={{ backgroundColor: 'var(--divider)' }} />

        {/* Recent Projects Section - Full Width */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
              Recent projects
            </div>
            <a 
              href="#" 
              className="text-sm no-underline hover:underline" 
              style={{ color: 'var(--text-2)' }}
            >
              View all projects
            </a>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 -mb-2 scrollbar-thin">
            {projects.map((project) => (
              <ProjectTile key={project.id} project={project} />
            ))}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          {/* Left Column - Activity Feed */}
          <div>
            {/* Tabs with Controls */}
            <div className="flex items-center justify-between mb-1">
              <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1">
                <div className="flex items-center justify-between">
                  <TabsList 
                    className="bg-transparent rounded-none p-0 h-auto gap-0 overflow-x-auto"
                    style={{ borderBottom: '1px solid var(--divider)' }}
                  >
                    <TabsTrigger 
                      value="worked-on"
                      className="text-sm px-0 mr-5 pb-2.5 pt-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-active)] data-[state=active]:text-[var(--text-1)] data-[state=active]:font-medium data-[state=active]:shadow-none bg-transparent"
                      style={{ color: 'var(--text-2)' }}
                    >
                      Worked on<TabCountBadge count={workedOnCount} />
                    </TabsTrigger>
                    <TabsTrigger 
                      value="viewed"
                      className="text-sm px-0 mr-5 pb-2.5 pt-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-active)] data-[state=active]:text-[var(--text-1)] data-[state=active]:font-medium data-[state=active]:shadow-none bg-transparent"
                      style={{ color: 'var(--text-2)' }}
                    >
                      Viewed<TabCountBadge count={viewedCount} />
                    </TabsTrigger>
                    <TabsTrigger 
                      value="assigned"
                      className="text-sm px-0 mr-5 pb-2.5 pt-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-active)] data-[state=active]:text-[var(--text-1)] data-[state=active]:font-medium data-[state=active]:shadow-none bg-transparent"
                      style={{ color: 'var(--text-2)' }}
                    >
                      Assigned to me<TabCountBadge count={assignedCount} />
                    </TabsTrigger>
                    <TabsTrigger 
                      value="starred"
                      className="text-sm px-0 mr-5 pb-2.5 pt-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-active)] data-[state=active]:text-[var(--text-1)] data-[state=active]:font-medium data-[state=active]:shadow-none bg-transparent"
                      style={{ color: 'var(--text-2)' }}
                    >
                      Starred<TabCountBadge count={starredCount} />
                    </TabsTrigger>
                    <TabsTrigger 
                      value="boards"
                      className="text-sm px-0 mr-5 pb-2.5 pt-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-active)] data-[state=active]:text-[var(--text-1)] data-[state=active]:font-medium data-[state=active]:shadow-none bg-transparent"
                      style={{ color: 'var(--text-2)' }}
                    >
                      Boards<TabCountBadge count={boardsCount} />
                    </TabsTrigger>
                  </TabsList>

                  {/* Controls */}
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 px-2.5 gap-1.5"
                          style={{ color: 'var(--text-2)' }}
                        >
                          <ArrowUpDown className="w-4 h-4" />
                          <span className="text-sm">Sort</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end"
                        style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--border-color)' }}
                        className="z-50"
                      >
                        <DropdownMenuItem 
                          onClick={() => setSortBy('recently-updated')}
                          style={{ color: 'var(--text-1)' }}
                        >
                          Recently updated
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setSortBy('recently-viewed')}
                          style={{ color: 'var(--text-1)' }}
                        >
                          Recently viewed
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setSortBy('priority')}
                          style={{ color: 'var(--text-1)' }}
                        >
                          Priority
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 px-2.5 gap-1.5"
                      style={{ color: 'var(--text-2)' }}
                    >
                      <Filter className="w-4 h-4" />
                      <span className="text-sm">Filter</span>
                    </Button>
                  </div>
                </div>

                <TabsContent value="worked-on" className="mt-0">
                  <GroupedActivityList 
                    items={activityItems} 
                    visibleCount={visibleCount}
                    onLoadMore={handleLoadMore}
                  />
                </TabsContent>
                <TabsContent value="viewed" className="mt-0">
                  <div className="py-12 text-center text-sm" style={{ color: 'var(--text-3)' }}>
                    No recently viewed items
                  </div>
                </TabsContent>
                <TabsContent value="assigned" className="mt-0">
                  <GroupedActivityList 
                    items={activityItems.filter(item => item.status !== 'In Production' && item.status !== 'Done')} 
                    visibleCount={visibleCount}
                    onLoadMore={handleLoadMore}
                  />
                </TabsContent>
                <TabsContent value="starred" className="mt-0">
                  <div className="py-12 text-center text-sm" style={{ color: 'var(--text-3)' }}>
                    No starred items
                  </div>
                </TabsContent>
                <TabsContent value="boards" className="mt-0">
                  <div className="py-12 text-center text-sm" style={{ color: 'var(--text-3)' }}>
                    No boards available
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Right Column - Focus Widgets */}
          <div className="space-y-3">
            <div className="text-sm font-medium mb-3" style={{ color: 'var(--text-1)' }}>
              My focus
            </div>
            
            <FocusWidget 
              title="Assigned to me"
              icon={Clock}
              count={assignedCount}
              subtitle={`${dueSoonCount} due soon`}
              accent
            />
            
            <FocusWidget 
              title="Recently updated"
              icon={Sparkles}
              count={recentlyUpdatedCount}
              subtitle="Last 7 days"
            />
            
            <FocusWidget 
              title="Starred"
              icon={Star}
              count={starredCount}
              subtitle="Quick access"
            />
          </div>
        </div>
      </div>
    </div>
  );
}