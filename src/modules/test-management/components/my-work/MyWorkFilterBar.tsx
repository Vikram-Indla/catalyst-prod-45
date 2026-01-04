/**
 * My Work Filter Bar
 * Filters for status, cycle, and urgency
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';
import type { MyWorkFilters } from '../MyWorkDashboard';

interface MyWorkFilterBarProps {
  filters: MyWorkFilters;
  onFiltersChange: (filters: MyWorkFilters) => void;
  availableCycles: string[];
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

const URGENCY_OPTIONS = [
  { value: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' },
  { value: 'due_today', label: 'Due Today', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400' },
  { value: 'on_track', label: 'On Track', color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' },
];

export function MyWorkFilterBar({
  filters,
  onFiltersChange,
  availableCycles,
  onExpandAll,
  onCollapseAll,
}: MyWorkFilterBarProps) {
  const hasActiveFilters =
    filters.status.length > 0 || filters.cycleId || filters.urgency;

  const handleClearFilters = () => {
    onFiltersChange({
      status: [],
      cycleId: null,
      urgency: null,
    });
  };

  const handleCycleChange = (value: string) => {
    onFiltersChange({
      ...filters,
      cycleId: value === 'all' ? null : value,
    });
  };

  const handleUrgencyChange = (value: string) => {
    onFiltersChange({
      ...filters,
      urgency: value === 'all' ? null : value,
    });
  };

  const handleRemoveStatus = (status: string) => {
    onFiltersChange({
      ...filters,
      status: filters.status.filter((s) => s !== status),
    });
  };

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/30">
      <div className="flex items-center gap-3">
        {/* Cycle Filter */}
        <Select
          value={filters.cycleId || 'all'}
          onValueChange={handleCycleChange}
        >
          <SelectTrigger className="w-[180px] h-8 text-sm">
            <SelectValue placeholder="All Cycles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cycles</SelectItem>
            {availableCycles.map((cycle) => (
              <SelectItem key={cycle} value={cycle}>
                {cycle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Urgency Filter */}
        <Select
          value={filters.urgency || 'all'}
          onValueChange={handleUrgencyChange}
        >
          <SelectTrigger className="w-[150px] h-8 text-sm">
            <SelectValue placeholder="All Urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Urgency</SelectItem>
            {URGENCY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      option.value === 'overdue'
                        ? 'bg-red-500'
                        : option.value === 'due_today'
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                  />
                  {option.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Active Status Filters */}
        {filters.status.length > 0 && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            {filters.status.map((status) => (
              <Badge
                key={status}
                variant="secondary"
                className="text-xs h-6 gap-1 cursor-pointer hover:bg-destructive/10"
                onClick={() => handleRemoveStatus(status)}
              >
                {status.replace('_', ' ')}
                <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-xs h-7 text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Expand/Collapse All */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onExpandAll}
          className="text-xs h-7 gap-1"
        >
          <ChevronsUpDown className="h-3.5 w-3.5" />
          Expand All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCollapseAll}
          className="text-xs h-7 gap-1"
        >
          <ChevronsDownUp className="h-3.5 w-3.5" />
          Collapse All
        </Button>
      </div>
    </div>
  );
}
