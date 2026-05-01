// src/pages/StarredPage.tsx
// Page displaying all user's starred items

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Eye, FileText, MoreHorizontal, ExternalLink, Trash2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, Tooltip } from '@/components/ads';
import { WorkItemIcon } from '@/components/ja/icons/WorkItemIcon';
import type { WorkItemType } from '@/components/ja/icons/WorkItemTypeIcon';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useStarredDeliveryItems, useToggleStar, StarredItemType } from '@/hooks/home/useStarredItems';
import { Skeleton } from '@/components/ui/skeleton';
import { getValidatedWorkItemRoute } from '@/lib/workItemRoutes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

// Grid columns
const GRID_COLS = '40px 100px 1fr 160px 100px 80px 100px';

// Extended type to include epic
type ExtendedWorkItemType = WorkItemType | 'epic' | 'incident';

interface StarredItem {
  id: string;
  key: string;
  summary: string;
  project: string;
  projectKey: string;
  status: string;
  type: ExtendedWorkItemType;
  assignee?: string | null;
  activityDate: Date;
  activityType: string;
  starredAt?: string;
}

function StarredItemRow({ 
  item, 
  isSelected,
  onSelect,
  onUnstar,
}: { 
  item: StarredItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUnstar: () => void;
}) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const timeAgo = formatDistanceToNow(item.activityDate, { addSuffix: false });
  
  const handleRowClick = () => {
    // Navigate based on type with defensive check
    const route = getItemRoute(item.type, item.id, item.key);
    if (route) {
      navigate(route);
    }
  };

  const handleOpenNewTab = (e: React.MouseEvent) => {
    e.stopPropagation();
    const route = getItemRoute(item.type, item.id, item.key);
    if (route) {
      window.open(route, '_blank');
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleRowClick();
  };

  return (
    <div 
      className={cn(
        "grid items-center px-4 py-2 transition-colors cursor-pointer group",
        isHovered && "bg-[var(--row-hover)]"
      )}
      style={{ 
        gridTemplateColumns: GRID_COLS,
        borderBottom: '1px solid var(--divider)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleRowClick}
    >
      {/* Checkbox */}
      <div className="flex items-center justify-center">
        <Checkbox 
          checked={isSelected}
          onClick={(e) => { e.stopPropagation(); onSelect(item.id); }}
          className="border-[var(--border-color)]"
        />
      </div>

      {/* Key - bronze/gold color */}
      <div className="flex items-center gap-2.5">
        {/* Only render icon for valid WorkItemType */}
        {['story', 'feature', 'task', 'defect', 'epic'].includes(item.type) && (
          <WorkItemIcon type={item.type as WorkItemType} size={14} />
        )}
        <span className="text-[13px] font-mono font-medium text-[var(--ds-text-brand,#2563eb)] dark:text-[var(--ds-text-brand,#60a5fa)]">{item.key}</span>
      </div>

      {/* Summary - hover changes to olive */}
      <div className="min-w-0 pr-4">
        <div className="text-sm font-medium leading-5 text-[var(--text-1)] truncate group-hover:text-[var(--ds-text-brand,#2563eb)] dark:group-hover:text-[var(--ds-text-brand,#60a5fa)] transition-colors">
          {item.summary}
        </div>
      </div>

      {/* Project - brighter in dark mode */}
      <div className="text-sm truncate text-gray-600 dark:text-gray-300">
        {item.project}
      </div>

      {/* Updated */}
      <div className="text-sm tabular-nums text-gray-500 dark:text-gray-400">
        {timeAgo} ago
      </div>

      {/* Assignee - visible dash in dark mode */}
      <div className="flex justify-start">
        {item.assignee ? (
          <Avatar name={item.assignee} size="xsmall" />
        ) : (
          <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
        )}
      </div>

      {/* Quick actions - View, Open in new tab, More */}
      <div className={cn("flex items-center justify-end gap-0.5 transition-opacity", isHovered ? "opacity-100" : "opacity-0")}>
        <Tooltip content="View details">
          <button
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--nav-hover-bg)] text-[var(--icon-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            onClick={handleViewDetails}
            title="View details"
          >
            <Eye className="w-3 h-3" />
          </button>
        </Tooltip>

        <Tooltip content="Open in new tab">
          <button
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--nav-hover-bg)] text-[var(--icon-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            onClick={handleOpenNewTab}
            title="Open in new tab"
          >
            <FileText className="w-3 h-3" />
          </button>
        </Tooltip>

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
            <DropdownMenuItem 
              onClick={handleViewDetails}
              className="text-[var(--text-1)] cursor-pointer"
            >
              <Eye className="w-4 h-4 mr-2" />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleOpenNewTab}
              className="text-[var(--text-1)] cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in new tab
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onUnstar(); }}
              className="text-[var(--text-1)] cursor-pointer"
            >
              <Star className="w-4 h-4 mr-2" />
              Unstar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function getItemRoute(type: ExtendedWorkItemType, id: string, key?: string): string | null {
  // Use centralized route utility for consistency
  return getValidatedWorkItemRoute({ id, key, type: type as string });
}

function groupItemsByTimePeriod(items: StarredItem[]): { label: string; items: StarredItem[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups: { label: string; items: StarredItem[] }[] = [
    { label: 'TODAY', items: [] },
    { label: 'YESTERDAY', items: [] },
    { label: 'THIS WEEK', items: [] },
    { label: 'OLDER', items: [] },
  ];

  items.forEach(item => {
    const itemDate = item.starredAt ? new Date(item.starredAt) : item.activityDate;
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

export default function StarredPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  const { data, isLoading } = useStarredDeliveryItems();
  const toggleStar = useToggleStar();
  
  const items = useMemo(() => {
    return (data?.items || []) as StarredItem[];
  }, [data]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item.key.toLowerCase().includes(query) ||
      item.summary.toLowerCase().includes(query) ||
      item.project.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const groupedItems = useMemo(() => groupItemsByTimePeriod(filteredItems), [filteredItems]);

  const handleSelect = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleUnstar = (item: StarredItem) => {
    toggleStar.mutate({
      itemId: item.id,
      itemType: item.type as StarredItemType,
      isCurrentlyStarred: true,
    }, {
      onSuccess: () => {
        toast.success(`Removed ${item.key} from starred`);
      },
    });
  };

  const handleUnstarSelected = () => {
    selectedItems.forEach(id => {
      const item = items.find(i => i.id === id);
      if (item) {
        toggleStar.mutate({
          itemId: item.id,
          itemType: item.type as StarredItemType,
          isCurrentlyStarred: true,
        });
      }
    });
    setSelectedItems(new Set());
    toast.success(`Removed ${selectedItems.size} items from starred`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-1)]">Starred</h1>
          <p className="text-sm text-[var(--text-3)]">
            {items.length} {items.length === 1 ? 'item' : 'items'} starred
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {selectedItems.size > 0 && (
            <button 
              onClick={handleUnstarSelected}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-[var(--border-color)] bg-[var(--surface-1)] text-[var(--text-1)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Unstar {selectedItems.size} selected
            </button>
          )}
          
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--icon-muted)]" />
            <Input
              type="text"
              placeholder="Search starred items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[var(--surface-1)] border-[var(--border-color)]"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-5 h-5 rounded" />
                <Skeleton className="w-16 h-4" />
                <Skeleton className="flex-1 h-4" />
                <Skeleton className="w-32 h-4" />
                <Skeleton className="w-20 h-4" />
                <Skeleton className="w-6 h-6 rounded-full" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Star className="w-12 h-12 text-[var(--icon-muted)] mb-4" />
            <h2 className="text-lg font-medium text-[var(--text-1)]">No starred items</h2>
            <p className="text-sm text-[var(--text-3)] mt-1">
              Click the star icon on any work item to add it here for quick access
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border-color)] m-4 overflow-hidden bg-[var(--card-bg)]">
            {/* Header row */}
            <div 
              className="grid items-center py-2.5 px-4 text-[11px] font-semibold uppercase tracking-[0.08em] sticky top-0 z-10"
              style={{ 
                gridTemplateColumns: GRID_COLS,
                color: 'var(--text-3)',
                backgroundColor: 'var(--table-header-bg)',
                borderBottom: '1px solid var(--divider)',
              }}
            >
              <div className="flex items-center justify-center">
                <Checkbox 
                  checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                  onClick={() => {
                    if (selectedItems.size === filteredItems.length) {
                      setSelectedItems(new Set());
                    } else {
                      setSelectedItems(new Set(filteredItems.map(i => i.id)));
                    }
                  }}
                  className="border-[var(--border-color)]"
                />
              </div>
              <div>Key</div>
              <div>Summary</div>
              <div>Project</div>
              <div>Updated</div>
              <div>Assignee</div>
              <div></div>
            </div>

            {/* Grouped items */}
            {groupedItems.map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* Section header */}
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
                
                {/* Items */}
                {group.items.map((item) => (
                  <StarredItemRow 
                    key={item.id}
                    item={item}
                    isSelected={selectedItems.has(item.id)}
                    onSelect={handleSelect}
                    onUnstar={() => handleUnstar(item)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
