/**
 * Scope Filter Bar
 * Filters, search, grouping controls for test list
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, List, Layers, Bug } from 'lucide-react';
import type { TestScopeFilters } from '../types';

interface FilterOption {
  id: string;
  name: string;
}

interface ScopeFilterBarProps {
  filters: TestScopeFilters;
  onFiltersChange: (filters: TestScopeFilters) => void;
  cycles?: FilterOption[];
  releases?: FilterOption[];
}

export function ScopeFilterBar({ filters, onFiltersChange, cycles = [], releases = [] }: ScopeFilterBarProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleStatusChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ ...filters, status: [] });
    } else {
      onFiltersChange({ ...filters, status: [value] });
    }
  };

  const handlePriorityChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ ...filters, priority: [] });
    } else {
      onFiltersChange({ ...filters, priority: [value] });
    }
  };

  const handleReleaseChange = (value: string) => {
    onFiltersChange({ ...filters, releaseId: value, cycleId: 'all' });
  };

  const handleCycleChange = (value: string) => {
    onFiltersChange({ ...filters, cycleId: value });
  };

  const handleGroupByChange = (value: TestScopeFilters['groupBy']) => {
    onFiltersChange({ ...filters, groupBy: value });
  };

  const handleSortChange = (value: TestScopeFilters['sortBy']) => {
    onFiltersChange({ ...filters, sortBy: value, sortOrder: 'desc' });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-border bg-muted/30">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tests..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Release Filter */}
      {releases.length > 0 && (
        <Select
          value={filters.releaseId}
          onValueChange={handleReleaseChange}
        >
          <SelectTrigger className="w-[170px] h-9">
            <SelectValue placeholder="Release" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Releases</SelectItem>
            {releases.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Cycle Filter */}
      {cycles.length > 0 && (
        <Select
          value={filters.cycleId}
          onValueChange={handleCycleChange}
        >
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Cycle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cycles</SelectItem>
            {cycles.map((cycle) => (
              <SelectItem key={cycle.id} value={cycle.id}>
                {cycle.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Status Filter */}
      <Select
        value={filters.status[0] || 'all'}
        onValueChange={handleStatusChange}
      >
        <SelectTrigger className="w-[130px] h-9">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="not_run">Not Run</SelectItem>
          <SelectItem value="passed">Passed</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
          <SelectItem value="blocked">Blocked</SelectItem>
        </SelectContent>
      </Select>

      {/* Priority Filter */}
      <Select
        value={filters.priority[0] || 'all'}
        onValueChange={handlePriorityChange}
      >
        <SelectTrigger className="w-[130px] h-9">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priority</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select
        value={filters.sortBy}
        onValueChange={handleSortChange}
      >
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="score">Sort: Score</SelectItem>
          <SelectItem value="dueDate">Sort: Due Date</SelectItem>
          <SelectItem value="status">Sort: Status</SelectItem>
          <SelectItem value="priority">Sort: Priority</SelectItem>
        </SelectContent>
      </Select>

      {/* Divider */}
      <div className="h-6 w-px bg-border" />

      {/* Group By */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground mr-1">Group:</span>
        <Button
          variant={filters.groupBy === 'none' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => handleGroupByChange('none')}
          className="h-8 px-2"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant={filters.groupBy === 'feature' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => handleGroupByChange('feature')}
          className="h-8 px-2"
        >
          <Layers className="h-4 w-4" />
        </Button>
        <Button
          variant={filters.groupBy === 'defect' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => handleGroupByChange('defect')}
          className="h-8 px-2"
        >
          <Bug className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
