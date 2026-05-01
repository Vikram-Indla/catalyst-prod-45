/**
 * Filter Bar Component
 * Filters and search for releases
 */

import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ReleasesFilter, ReleaseStatus } from '../types';
import { HealthLevel } from '../utils/healthScore';

interface FilterBarProps {
  filter: ReleasesFilter;
  onStatusChange: (status: ReleaseStatus[]) => void;
  onHealthChange: (health: HealthLevel[]) => void;
  onQuarterChange: (quarter: string) => void;
  onSearchChange: (search: string) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

const STATUS_OPTIONS: { value: ReleaseStatus; label: string }[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'testing', label: 'Testing' },
  { value: 'staging', label: 'Staging' },
  { value: 'released', label: 'Released' },
  { value: 'cancelled', label: 'Cancelled' },
];

const HEALTH_OPTIONS: { value: HealthLevel; label: string; dotColor: string }[] = [
  { value: 'healthy', label: 'Healthy', dotColor: 'bg-green-500' },
  { value: 'attention', label: 'Attention', dotColor: 'bg-yellow-500' },
  { value: 'at_risk', label: 'At Risk', dotColor: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', dotColor: 'bg-red-500' },
];

const QUARTER_OPTIONS = [
  { value: 'all', label: 'All Quarters' },
  { value: 'Q1 2026', label: 'Q1 2026' },
  { value: 'Q2 2026', label: 'Q2 2026' },
  { value: 'Q3 2026', label: 'Q3 2026' },
  { value: 'Q4 2026', label: 'Q4 2026' },
];

export function FilterBar({
  filter,
  onStatusChange,
  onHealthChange,
  onQuarterChange,
  onSearchChange,
  onClearFilters,
  activeFilterCount,
}: FilterBarProps) {
  const toggleStatus = (status: ReleaseStatus) => {
    const newStatuses = filter.status.includes(status)
      ? filter.status.filter(s => s !== status)
      : [...filter.status, status];
    onStatusChange(newStatuses);
  };

  const toggleHealth = (health: HealthLevel) => {
    const newHealth = filter.health.includes(health)
      ? filter.health.filter(h => h !== health)
      : [...filter.health, health];
    onHealthChange(newHealth);
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-[300px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-[var(--ds-text-subtlest,#878787)]" />
        <Input
          id="release-search"
          placeholder="Search releases..."
          value={filter.search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)]"
        />
      </div>

      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={cn(
            "bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)]",
            filter.status.length > 0 && "border-primary text-primary"
          )}>
            Status
            {filter.status.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-white text-xs rounded-full">
                {filter.status.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {STATUS_OPTIONS.map(({ value, label }) => (
            <DropdownMenuCheckboxItem
              key={value}
              checked={filter.status.includes(value)}
              onCheckedChange={() => toggleStatus(value)}
            >
              {label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Health Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={cn(
            "bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)]",
            filter.health.length > 0 && "border-primary text-primary"
          )}>
            Health
            {filter.health.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-white text-xs rounded-full">
                {filter.health.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Filter by Health</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {HEALTH_OPTIONS.map(({ value, label, dotColor }) => (
            <DropdownMenuCheckboxItem
              key={value}
              checked={filter.health.includes(value)}
              onCheckedChange={() => toggleHealth(value)}
            >
              <span className={cn("w-2 h-2 rounded-full mr-2", dotColor)} />
              {label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Quarter Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={cn(
            "bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)]",
            filter.quarter !== 'all' && "border-primary text-primary"
          )}>
            {filter.quarter === 'all' ? 'Quarter' : filter.quarter}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Filter by Quarter</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {QUARTER_OPTIONS.map(({ value, label }) => (
            <DropdownMenuCheckboxItem
              key={value}
              checked={filter.quarter === value}
              onCheckedChange={() => onQuarterChange(value)}
            >
              {label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-slate-500 hover:text-slate-700 dark:text-[var(--ds-text-subtlest,#A1A1A1)] dark:hover:text-[var(--ds-text,#EDEDED)]"
        >
          <X className="w-4 h-4 mr-1" />
          Clear ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}
