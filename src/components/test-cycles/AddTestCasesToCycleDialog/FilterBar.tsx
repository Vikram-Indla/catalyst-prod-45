/**
 * Filter Bar Component
 * Collapsible filter controls for test case search
 */

import React, { useState } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { TMCasePriority, TMCaseType } from '@/types/test-management';
import type { TestCaseFilters } from './types';

interface FilterBarProps {
  filters: TestCaseFilters;
  onFiltersChange: (filters: TestCaseFilters) => void;
  priorities: TMCasePriority[];
  types: TMCaseType[];
}

export function FilterBar({
  filters,
  onFiltersChange,
  priorities,
  types,
}: FilterBarProps) {
  const activeFilterCount = 
    filters.priorities.length + 
    filters.types.length + 
    filters.statuses.length;

  const clearAllFilters = () => {
    onFiltersChange({
      ...filters,
      priorities: [],
      types: [],
      statuses: [],
      labels: [],
      isAutomated: null,
    });
  };

  const togglePriority = (id: string) => {
    const updated = filters.priorities.includes(id)
      ? filters.priorities.filter(p => p !== id)
      : [...filters.priorities, id];
    onFiltersChange({ ...filters, priorities: updated });
  };

  const toggleType = (id: string) => {
    const updated = filters.types.includes(id)
      ? filters.types.filter(t => t !== id)
      : [...filters.types, id];
    onFiltersChange({ ...filters, types: updated });
  };

  const toggleStatus = (status: string) => {
    const updated = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    onFiltersChange({ ...filters, statuses: updated });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Priority Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 text-xs',
              filters.priorities.length > 0 && 'border-primary text-primary'
            )}
          >
            Priority
            {filters.priorities.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                {filters.priorities.length}
              </Badge>
            )}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-1">
            {priorities.map(priority => (
              <label
                key={priority.id}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer"
              >
                <Checkbox
                  checked={filters.priorities.includes(priority.id)}
                  onCheckedChange={() => togglePriority(priority.id)}
                  className="h-3.5 w-3.5"
                />
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: priority.color }}
                />
                <span className="text-sm">{priority.name}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Type Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 text-xs',
              filters.types.length > 0 && 'border-primary text-primary'
            )}
          >
            Type
            {filters.types.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                {filters.types.length}
              </Badge>
            )}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-1">
            {types.map(type => (
              <label
                key={type.id}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer"
              >
                <Checkbox
                  checked={filters.types.includes(type.id)}
                  onCheckedChange={() => toggleType(type.id)}
                  className="h-3.5 w-3.5"
                />
                <span className="text-sm">{type.name}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Status Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 text-xs',
              filters.statuses.length > 0 && 'border-primary text-primary'
            )}
          >
            Status
            {filters.statuses.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                {filters.statuses.length}
              </Badge>
            )}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-1">
            {['draft', 'ready', 'approved'].map(status => (
              <label
                key={status}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer"
              >
                <Checkbox
                  checked={filters.statuses.includes(status)}
                  onCheckedChange={() => toggleStatus(status)}
                  className="h-3.5 w-3.5"
                />
                <span className="text-sm capitalize">{status}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-slate-500 hover:text-slate-700"
          onClick={clearAllFilters}
        >
          <X className="w-3 h-3 mr-1" />
          Clear ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}
