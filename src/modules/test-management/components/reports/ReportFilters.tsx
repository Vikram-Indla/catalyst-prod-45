/**
 * Report Filters Component
 * Global filters for all report tabs
 */

import React from 'react';
import { RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfQuarter } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';

export interface ReportFiltersState {
  projectId: string | null;
  cycleId: string | null;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  preset: string;
}

interface ReportFiltersProps {
  filters: ReportFiltersState;
  onFiltersChange: (filters: ReportFiltersState) => void;
  onRefresh: () => void;
  projects?: { id: string; name: string }[];
  cycles?: { id: string; name: string }[];
}

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'this-quarter', label: 'This Quarter' },
  { value: 'custom', label: 'Custom Range' },
];

export function ReportFilters({
  filters,
  onFiltersChange,
  onRefresh,
  projects = [],
  cycles = [],
}: ReportFiltersProps) {
  const handlePresetChange = (preset: string) => {
    const today = new Date();
    let from: Date | undefined;
    let to: Date | undefined = today;

    switch (preset) {
      case 'today':
        from = today;
        break;
      case '7days':
        from = subDays(today, 7);
        break;
      case '30days':
        from = subDays(today, 30);
        break;
      case 'this-month':
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case 'last-month':
        const lastMonth = subMonths(today, 1);
        from = startOfMonth(lastMonth);
        to = endOfMonth(lastMonth);
        break;
      case 'this-quarter':
        from = startOfQuarter(today);
        break;
      case 'custom':
        // Keep existing dates
        from = filters.dateRange.from;
        to = filters.dateRange.to;
        break;
    }

    onFiltersChange({
      ...filters,
      preset,
      dateRange: { from, to },
    });
  };

  const handleReset = () => {
    onFiltersChange({
      projectId: null,
      cycleId: null,
      dateRange: { from: subDays(new Date(), 30), to: new Date() },
      preset: '30days',
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-surface-2 rounded-lg border border-border-subtle">
      {/* Project Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Project:</span>
        <Select
          value={filters.projectId || 'all'}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, projectId: value === 'all' ? null : value })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cycle Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Cycle:</span>
        <Select
          value={filters.cycleId || 'all'}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, cycleId: value === 'all' ? null : value })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Cycles" />
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
      </div>

      {/* Date Range */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Date:</span>
        <Select value={filters.preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filters.preset === 'custom' && (
          <div className="flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-[120px] justify-start text-left font-normal',
                    !filters.dateRange.from && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.from
                    ? format(filters.dateRange.from, 'MMM d')
                    : 'From'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.from}
                  onSelect={(date) =>
                    onFiltersChange({
                      ...filters,
                      dateRange: { ...filters.dateRange, from: date },
                    })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground">-</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-[120px] justify-start text-left font-normal',
                    !filters.dateRange.to && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.to
                    ? format(filters.dateRange.to, 'MMM d')
                    : 'To'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.to}
                  onSelect={(date) =>
                    onFiltersChange({
                      ...filters,
                      dateRange: { ...filters.dateRange, to: date },
                    })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <Button variant="ghost" size="sm" onClick={handleReset}>
        <RotateCcw className="h-4 w-4 mr-1" />
        Reset
      </Button>
      <Button variant="outline" size="sm" onClick={onRefresh}>
        <RefreshCw className="h-4 w-4 mr-1" />
        Refresh
      </Button>
    </div>
  );
}
