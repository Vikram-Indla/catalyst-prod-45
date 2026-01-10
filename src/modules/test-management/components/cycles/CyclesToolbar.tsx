/**
 * CyclesToolbar - Toolbar with filters, search, and view toggle for test cycles
 * Based on Catalyst V5 Phase 5 spec
 */

import React, { useState } from 'react';
import { 
  ChevronDown, 
  Calendar, 
  User, 
  X, 
  Search, 
  List, 
  LayoutGrid, 
  CalendarDays,
  Plus,
  Download,
  Upload
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export type CycleViewMode = 'list' | 'grid' | 'calendar';
export type CycleStatusFilter = 'all' | 'not_started' | 'in_progress' | 'completed' | 'blocked';

interface Owner {
  id: string;
  name: string;
  initials: string;
}

interface ActiveFilter {
  type: string;
  value: string;
  key: string;
}

interface CyclesToolbarProps {
  viewMode: CycleViewMode;
  onViewModeChange: (mode: CycleViewMode) => void;
  statusFilter: CycleStatusFilter;
  onStatusFilterChange: (status: CycleStatusFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  dateRange?: { from?: Date; to?: Date };
  onDateRangeChange?: (range: { from?: Date; to?: Date }) => void;
  ownerFilter?: string;
  onOwnerFilterChange?: (ownerId: string) => void;
  owners?: Owner[];
  onCreateCycle?: () => void;
  selectedCount?: number;
  onBulkAction?: (action: string) => void;
}

export function CyclesToolbar({
  viewMode,
  onViewModeChange,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
  dateRange = {},
  onDateRangeChange,
  ownerFilter,
  onOwnerFilterChange,
  owners = [],
  onCreateCycle,
  selectedCount = 0,
  onBulkAction,
}: CyclesToolbarProps) {
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'not_started', label: 'Not Started' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'blocked', label: 'Blocked' },
  ];

  // Build active filters
  const activeFilters: ActiveFilter[] = [];
  if (statusFilter !== 'all') {
    const status = statusOptions.find(s => s.value === statusFilter);
    if (status) {
      activeFilters.push({ type: 'Status', value: status.label, key: 'status' });
    }
  }
  if (dateRange.from) {
    activeFilters.push({ 
      type: 'Date', 
      value: dateRange.to 
        ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`
        : format(dateRange.from, 'MMM d, yyyy'),
      key: 'date'
    });
  }
  if (ownerFilter && ownerFilter !== 'all') {
    const owner = owners.find(o => o.id === ownerFilter);
    if (owner) {
      activeFilters.push({ type: 'Owner', value: owner.name, key: 'owner' });
    }
  }

  const removeFilter = (key: string) => {
    if (key === 'status') {
      onStatusFilterChange('all');
    } else if (key === 'date') {
      onDateRangeChange?.({});
    } else if (key === 'owner') {
      onOwnerFilterChange?.('all');
    }
  };

  return (
    <div className="bg-card border-b border-border px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Filters */}
        <div className="flex items-center gap-3 flex-1">
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as CycleStatusFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Date Range Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "gap-2 w-[160px] justify-start",
                  (dateRange.from || dateRange.to) && "border-primary text-primary"
                )}
              >
                <Calendar className="h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`
                  ) : (
                    format(dateRange.from, 'MMM d, yyyy')
                  )
                ) : (
                  'Date Range'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => onDateRangeChange?.({ from: range?.from, to: range?.to })}
                numberOfMonths={2}
                initialFocus
              />
              {(dateRange.from || dateRange.to) && (
                <div className="border-t p-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full"
                    onClick={() => onDateRangeChange?.({})}
                  >
                    Clear dates
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          
          {/* Owner Filter */}
          {owners.length > 0 && (
            <Select value={ownerFilter || 'all'} onValueChange={(v) => onOwnerFilterChange?.(v)}>
              <SelectTrigger className="w-[140px]">
                <User className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                {owners.map((owner) => (
                  <SelectItem key={owner.id} value={owner.id}>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                        {owner.initials}
                      </span>
                      {owner.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Active Filter Pills */}
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2 ml-2">
              {activeFilters.map((filter) => (
                <Badge
                  key={filter.key}
                  variant="secondary"
                  className="px-2.5 py-1 gap-1 bg-primary/10 text-primary hover:bg-primary/20"
                >
                  {filter.type}: {filter.value}
                  <button
                    onClick={() => removeFilter(filter.key)}
                    className="ml-1 hover:text-primary/80 transition-colors"
                    aria-label={`Remove ${filter.type} filter`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
        
        {/* Right: Search + View Toggle + Create */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search cycles..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          
          {/* View Toggle */}
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(v) => v && onViewModeChange(v as CycleViewMode)}
            className="border rounded-lg"
          >
            <ToggleGroupItem 
              value="list" 
              aria-label="List view"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <List className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="grid" 
              aria-label="Grid view"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <LayoutGrid className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="calendar" 
              aria-label="Calendar view"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <CalendarDays className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Create Button */}
          {onCreateCycle && (
            <Button onClick={onCreateCycle} className="gap-2">
              <Plus className="w-4 h-4" />
              New Cycle
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-4">
          <span className="text-sm font-medium">
            {selectedCount} cycle{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onBulkAction?.('archive')}>
              Archive
            </Button>
            <Button variant="outline" size="sm" onClick={() => onBulkAction?.('export')}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => onBulkAction?.('delete')}>
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CyclesToolbar;
