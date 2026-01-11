/**
 * FilterBar — Quick filters for work items list
 * Chips: All, My Work, In Progress, Release dropdown, Feature dropdown
 */

import React from 'react';
import { User, CircleDot, ChevronDown, X } from 'lucide-react';
import { WorkItemFilters, WorkItemType, WorkItemStatus } from '@/types/work-items';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  filters: WorkItemFilters;
  onFilterChange: (filters: Partial<WorkItemFilters>) => void;
  totalCount: number;
  filteredCount: number;
  releases?: Array<{ id: string; name: string }>;
  features?: Array<{ id: string; name: string }>;
}

interface FilterChipProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}

function FilterChip({ label, isActive, onClick, icon }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-[50ms]',
        isActive
          ? 'bg-brand-primary text-white'
          : 'bg-surface-2 text-text-2 hover:bg-surface-3'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export function FilterBar({
  filters,
  onFilterChange,
  totalCount,
  filteredCount,
  releases = [],
  features = [],
}: FilterBarProps) {
  const isAllActive = 
    filters.type === 'all' && 
    filters.status === 'all' && 
    filters.assignee_id === 'all';

  const isMyWorkActive = filters.assignee_id === 'me';
  const isInProgressActive = filters.status === 'in_progress';

  const activeRelease = releases.find(r => r.id === filters.fixed_version_id);
  const activeFeature = features.find(f => f.id === filters.feature_id);

  const clearFilters = () => {
    onFilterChange({
      type: 'all',
      status: 'all',
      assignee_id: 'all',
      fixed_version_id: 'all',
      feature_id: 'all',
    });
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-surface-1">
      {/* Filter Chips */}
      <div className="flex items-center gap-2">
        <FilterChip
          label="All"
          isActive={isAllActive}
          onClick={clearFilters}
        />
        
        <FilterChip
          label="My Work"
          isActive={isMyWorkActive}
          onClick={() => onFilterChange({ 
            assignee_id: isMyWorkActive ? 'all' : 'me' 
          })}
          icon={<User className="w-3.5 h-3.5" />}
        />
        
        <FilterChip
          label="In Progress"
          isActive={isInProgressActive}
          onClick={() => onFilterChange({ 
            status: isInProgressActive ? 'all' : 'in_progress' 
          })}
          icon={<CircleDot className="w-3.5 h-3.5" />}
        />

        {/* Release Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'h-8 px-3 text-sm font-medium rounded-full',
                activeRelease ? 'bg-brand-primary text-white' : 'bg-surface-2 text-text-2'
              )}
            >
              {activeRelease?.name || 'Release'}
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[160px]">
            <DropdownMenuItem onClick={() => onFilterChange({ fixed_version_id: 'all' })}>
              All Releases
            </DropdownMenuItem>
            {releases.map((release) => (
              <DropdownMenuItem
                key={release.id}
                onClick={() => onFilterChange({ fixed_version_id: release.id })}
              >
                {release.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Feature Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'h-8 px-3 text-sm font-medium rounded-full',
                activeFeature ? 'bg-brand-primary text-white' : 'bg-surface-2 text-text-2'
              )}
            >
              {activeFeature?.name || 'Feature'}
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px] max-h-[300px] overflow-y-auto">
            <DropdownMenuItem onClick={() => onFilterChange({ feature_id: 'all' })}>
              All Features
            </DropdownMenuItem>
            {features.map((feature) => (
              <DropdownMenuItem
                key={feature.id}
                onClick={() => onFilterChange({ feature_id: feature.id })}
              >
                {feature.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Filters */}
        {!isAllActive && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-text-3 hover:text-text-1"
            onClick={clearFilters}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Item Count */}
      <div className="text-sm text-text-3">
        {filteredCount === totalCount ? (
          <span>{totalCount} items</span>
        ) : (
          <span>{filteredCount} of {totalCount} items</span>
        )}
      </div>
    </div>
  );
}

export default FilterBar;
