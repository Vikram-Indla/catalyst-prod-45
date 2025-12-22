// =====================================================
// BOARD TOOLBAR COMPONENT
// Filters and controls for Board View
// =====================================================

import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BoardFilters } from '@/services/boardService';
import { WorkflowStatus } from '@/types/views';
import { cn } from '@/lib/utils';

interface BoardToolbarProps {
  filters: BoardFilters;
  onFiltersChange: (filters: BoardFilters) => void;
  releases: Array<{ id: string; version: string; name: string }>;
  stats: {
    total: number;
    byStatus: Record<WorkflowStatus, number>;
    blocked: number;
  } | undefined;
}

export function BoardToolbar({
  filters,
  onFiltersChange,
  releases,
  stats
}: BoardToolbarProps) {
  const quickFilters = [
    { key: 'all', label: 'All', active: !filters.onlyMine && !filters.onlyBlocked && !filters.priorities?.length },
    { key: 'mine', label: 'My Items', active: filters.onlyMine },
    { key: 'blocked', label: 'Blocked', active: filters.onlyBlocked },
    { key: 'critical', label: 'Critical', active: filters.priorities?.includes('critical') },
  ];

  const handleQuickFilter = (key: string) => {
    const newFilters = { ...filters };
    
    switch (key) {
      case 'all':
        delete newFilters.onlyMine;
        delete newFilters.onlyBlocked;
        delete newFilters.priorities;
        break;
      case 'mine':
        newFilters.onlyMine = !filters.onlyMine;
        delete newFilters.onlyBlocked;
        delete newFilters.priorities;
        break;
      case 'blocked':
        newFilters.onlyBlocked = !filters.onlyBlocked;
        delete newFilters.onlyMine;
        delete newFilters.priorities;
        break;
      case 'critical':
        if (filters.priorities?.includes('critical')) {
          delete newFilters.priorities;
        } else {
          newFilters.priorities = ['critical'];
        }
        delete newFilters.onlyMine;
        delete newFilters.onlyBlocked;
        break;
    }
    
    onFiltersChange(newFilters);
  };

  const doneCount = (stats?.byStatus?.ready_for_prod || 0) + 
                    (stats?.byStatus?.in_production || 0);
  const inProgressCount = (stats?.byStatus?.in_development || 0) +
                          (stats?.byStatus?.qa_testing || 0) +
                          (stats?.byStatus?.uat_testing || 0);
  const backlogCount = stats?.byStatus?.backlog || 0;

  return (
    <div className="px-6 py-2 border-t bg-gray-50 dark:bg-gray-900 flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Group By */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Group:</span>
          <Select defaultValue="status">
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">By Status</SelectItem>
              <SelectItem value="release">By Release</SelectItem>
              <SelectItem value="assignee">By Assignee</SelectItem>
              <SelectItem value="priority">By Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filter:</span>
          {quickFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => handleQuickFilter(filter.key)}
              className={cn(
                'px-2 py-1 text-xs rounded transition-colors',
                filter.active
                  ? 'bg-[#c69c6d] text-white'
                  : 'bg-white dark:bg-gray-800 border text-foreground hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Release Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Release:</span>
          <Select
            value={filters.releases?.[0] || 'all'}
            onValueChange={(value) => {
              onFiltersChange({
                ...filters,
                releases: value === 'all' ? undefined : [value]
              });
            }}
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="All Releases" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Releases</SelectItem>
              {releases.map((release) => (
                <SelectItem key={release.id} value={release.id}>
                  {release.version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-8 h-8 w-48 text-xs"
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
            Done: {doneCount}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#c69c6d]" />
            In Progress: {inProgressCount}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#c8ccd0]" />
            Backlog: {backlogCount}
          </span>
        </div>
      </div>
    </div>
  );
}
