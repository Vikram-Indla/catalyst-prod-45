/**
 * Module 3B-2: Queue toolbar with search, filter, sort
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  SortAsc, 
  SortDesc,
  Filter,
  ArrowUpDown,
  X
} from 'lucide-react';
import type { QueueFilters, QueueSortField, PriorityLevel } from '../../types/queue-management';

interface QueueToolbarProps {
  filters: QueueFilters;
  onFilterChange: (updates: Partial<QueueFilters>) => void;
  onClearFilters: () => void;
  onSortByPriority: () => void;
  total: number;
  className?: string;
}

const priorityFilters: { value: PriorityLevel | null; label: string }[] = [
  { value: null, label: 'All Priorities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const sortOptions: { value: QueueSortField; label: string }[] = [
  { value: 'position', label: 'Position' },
  { value: 'priority', label: 'Priority' },
  { value: 'name', label: 'Name' },
  { value: 'time', label: 'Est. Time' },
];

export function QueueToolbar({
  filters,
  onFilterChange,
  onClearFilters,
  onSortByPriority,
  total,
  className,
}: QueueToolbarProps) {
  const hasActiveFilters = filters.priority || filters.search;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search test cases..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value || undefined })}
            className="pl-9"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => onFilterChange({ search: undefined })}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Priority Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              {filters.priority ? (
                <span className="capitalize">{filters.priority}</span>
              ) : (
                'Priority'
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {priorityFilters.map((pf) => (
              <DropdownMenuItem
                key={pf.value || 'all'}
                onClick={() => onFilterChange({ priority: pf.value })}
                className={cn(filters.priority === pf.value && 'bg-accent')}
              >
                {pf.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              {filters.sortOrder === 'asc' ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
              <span className="capitalize">{filters.sortBy}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sortOptions.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => onFilterChange({ 
                  sortBy: opt.value,
                  sortOrder: filters.sortBy === opt.value && filters.sortOrder === 'asc' 
                    ? 'desc' 
                    : 'asc'
                })}
                className={cn(
                  'flex items-center justify-between',
                  filters.sortBy === opt.value && 'bg-accent'
                )}
              >
                {opt.label}
                {filters.sortBy === opt.value && (
                  filters.sortOrder === 'asc' ? (
                    <SortAsc className="h-3 w-3" />
                  ) : (
                    <SortDesc className="h-3 w-3" />
                  )
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Auto-sort by Priority */}
        <Button 
          variant="outline" 
          onClick={onSortByPriority}
          className="gap-2"
        >
          <ArrowUpDown className="h-4 w-4" />
          Sort by Priority
        </Button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            onClick={onClearFilters}
            className="gap-2 text-muted-foreground"
          >
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        )}

        {/* Count */}
        <Badge variant="secondary" className="ml-auto">
          {total} items
        </Badge>
      </div>
    </div>
  );
}
