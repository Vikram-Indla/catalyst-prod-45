import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { projects, activityItems, Project, ActivityItem, groupItemsByTimePeriod } from '@/data/homePageData';
import { WorkItemTypeIcon } from './icons/WorkItemTypeIcon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const ITEMS_PER_PAGE = 10;

function RecentProjectCard({ project }: { project: Project }) {
  return (
    <div 
      className="w-[200px] min-w-[200px] rounded overflow-hidden"
      style={{ 
        border: '1px solid var(--border)',
        backgroundColor: 'var(--surface-2)'
      }}
    >
      {/* Header accent bar */}
      <div className="h-2" style={{ backgroundColor: project.color }} />
      
      {/* Card content */}
      <div className="p-3 pb-2">
        {/* Project info row */}
        <div className="flex items-start gap-2 mb-3">
          <div 
            className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0"
            style={{ backgroundColor: project.color }}
          >
            {project.key.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-5 truncate" style={{ color: 'var(--text-1)' }}>
              {project.name}
            </div>
            <div className="text-xs leading-4" style={{ color: 'var(--text-3)' }}>
              {project.type}
            </div>
          </div>
        </div>

        {/* Quick links label */}
        <div className="text-[11px] mb-1 leading-[14px]" style={{ color: 'var(--text-3)' }}>
          Quick links
        </div>
        
        {/* Quick link items */}
        <div className="flex flex-col">
          <a href="#" className="flex items-center justify-between text-sm no-underline py-1.5 leading-5" style={{ color: 'var(--text-1)' }}>
            <span>My open work items</span>
            {project.openCount > 0 && (
              <span 
                className="rounded px-1.5 text-xs font-semibold min-w-[20px] h-5 leading-5 inline-flex items-center justify-center"
                style={{ backgroundColor: 'var(--surface-3)', color: 'var(--text-2)' }}
              >
                {project.openCount}
              </span>
            )}
          </a>
          <a href="#" className="flex items-center justify-between text-sm no-underline py-1.5 leading-5" style={{ color: 'var(--text-1)' }}>
            <span>Done work items</span>
          </a>
        </div>
      </div>

      {/* Boards footer */}
      <div className="px-3 py-2" style={{ borderTop: '1px solid var(--border)' }}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={project.boardsCount === 0}>
            <button
              className="flex items-center gap-0.5 text-sm bg-transparent border-none cursor-pointer p-0 leading-5"
              style={{ color: project.boardsCount > 0 ? 'var(--text-1)' : 'var(--text-3)' }}
              disabled={project.boardsCount === 0}
            >
              {project.boardsCount} {project.boardsCount === 1 ? 'board' : 'boards'}
              {project.boardsCount > 0 && <ChevronDown className="w-4 h-4" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Board 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <div className="grid grid-cols-[24px_1fr_60px_72px] items-center py-2.5 gap-3">
      {/* Icon column */}
      <div className="flex items-center justify-center" style={{ color: 'var(--icon-default)' }}>
        <WorkItemTypeIcon type={item.type} size={16} />
      </div>

      {/* Main content */}
      <div className="min-w-0">
        <div className="text-sm leading-5 truncate" style={{ color: 'var(--text-1)' }}>
          {item.key} — {item.summary}
        </div>
        <div className="text-xs leading-4 mt-0.5" style={{ color: 'var(--text-3)' }}>
          {item.id} · {item.project}
        </div>
      </div>

      {/* Activity type label */}
      <div className="text-xs leading-4" style={{ color: 'var(--text-3)' }}>
        {item.activityType}
      </div>

      {/* Avatar stack */}
      <div className="flex justify-end">
        <div className="flex">
          <Avatar className="w-6 h-6">
            <AvatarFallback className="text-[10px]">{item.assignee.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <Avatar className="w-6 h-6 -ml-2">
            <AvatarFallback className="text-[10px]">AA</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
}

function GroupedActivityList({ items, visibleCount, onLoadMore }: { 
  items: ActivityItem[]; 
  visibleCount: number;
  onLoadMore: () => void;
}) {
  const groupedItems = groupItemsByTimePeriod(items);
  let displayedCount = 0;
  const hasMore = visibleCount < items.length;

  return (
    <div className="mt-5">
      {groupedItems.map((group, groupIndex) => {
        const remainingSlots = visibleCount - displayedCount;
        if (remainingSlots <= 0) return null;
        
        const itemsToShow = group.items.slice(0, remainingSlots);
        displayedCount += itemsToShow.length;

        return (
          <div key={groupIndex}>
            <div className={`text-[11px] font-bold uppercase mb-1 leading-4 ${groupIndex > 0 ? 'mt-4' : ''}`} style={{ color: 'var(--text-3)' }}>
              {group.label}
            </div>
            {itemsToShow.map((item, index) => (
              <ActivityRow key={`${group.label}-${index}`} item={item} />
            ))}
          </div>
        );
      })}
      
      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center mt-6 pb-4">
          <Button variant="outline" onClick={onLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

export function HomeContent() {
  const [selectedTab, setSelectedTab] = useState('worked-on');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const totalAssigned = activityItems.filter(item => 
    item.status !== 'In Production' && item.status !== 'Done'
  ).length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  return (
    <div className="p-6 px-10 min-h-screen font-sans" style={{ backgroundColor: 'var(--surface-1)' }}>
      {/* Page title */}
      <h1 className="text-2xl font-semibold leading-7 tracking-tight m-0" style={{ color: 'var(--text-1)' }}>
        For you
      </h1>

      {/* Divider */}
      <div className="h-px mt-6 mb-5" style={{ backgroundColor: 'var(--divider)' }} />

      {/* Recent Projects Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <div className="text-sm leading-5" style={{ color: 'var(--text-1)' }}>
            Recent projects
          </div>
          <a href="#" className="text-sm no-underline leading-5" style={{ color: 'var(--accent-color)' }}>
            View all projects
          </a>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {projects.map((project) => (
            <RecentProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="bg-transparent rounded-none p-0 h-auto gap-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <TabsTrigger 
            value="worked-on"
            className="text-sm px-0 mr-6 pb-3 pt-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-none bg-transparent"
          >
            Worked on
          </TabsTrigger>
          <TabsTrigger 
            value="viewed"
            className="text-sm px-0 mr-6 pb-3 pt-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-none bg-transparent"
          >
            Viewed
          </TabsTrigger>
          <TabsTrigger 
            value="assigned"
            className="text-sm px-0 mr-6 pb-3 pt-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-none bg-transparent"
          >
            <span className="flex items-center gap-2">
              Assigned to me
              <span className="bg-muted rounded px-1.5 text-xs font-semibold text-foreground h-4 leading-4 inline-flex items-center">
                {totalAssigned > 99 ? '99+' : totalAssigned}
              </span>
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="starred"
            className="text-sm px-0 mr-6 pb-3 pt-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-none bg-transparent"
          >
            Starred
          </TabsTrigger>
          <TabsTrigger 
            value="boards"
            className="text-sm px-0 mr-6 pb-3 pt-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-none bg-transparent"
          >
            Boards
          </TabsTrigger>
        </TabsList>
        <TabsContent value="worked-on">
          <GroupedActivityList 
            items={activityItems} 
            visibleCount={visibleCount}
            onLoadMore={handleLoadMore}
          />
        </TabsContent>
        <TabsContent value="viewed">
          <div className="py-10 text-center text-muted-foreground text-sm leading-5">
            No recently viewed items
          </div>
        </TabsContent>
        <TabsContent value="assigned">
          <GroupedActivityList 
            items={activityItems.filter(item => item.status !== 'In Production' && item.status !== 'Done')} 
            visibleCount={visibleCount}
            onLoadMore={handleLoadMore}
          />
        </TabsContent>
        <TabsContent value="starred">
          <div className="py-10 text-center text-muted-foreground text-sm leading-5">
            No starred items
          </div>
        </TabsContent>
        <TabsContent value="boards">
          <div className="py-10 text-center text-muted-foreground text-sm leading-5">
            No boards available
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}