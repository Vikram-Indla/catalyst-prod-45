// src/components/ja/home/HomeUnifiedFilterDrawer.tsx
// Unified filter drawer for all Home modes

import React from 'react';
import { X, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  HomeFilters,
  HomeRoleMode,
  MODE_STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  UPDATED_RANGE_OPTIONS,
} from '@/hooks/home/useHomeFilters';

interface HomeUnifiedFilterDrawerProps {
  mode: HomeRoleMode;
  filters: HomeFilters;
  onFiltersChange: (filters: Partial<HomeFilters>) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function HomeUnifiedFilterDrawer({
  mode,
  filters,
  onFiltersChange,
  onClear,
  hasActiveFilters,
}: HomeUnifiedFilterDrawerProps) {
  const statusOptions = MODE_STATUS_OPTIONS[mode];

  const handleStatusToggle = (status: string) => {
    const current = filters.status;
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    onFiltersChange({ status: updated });
  };

  const handlePriorityToggle = (priority: string) => {
    const current = filters.priority;
    const updated = current.includes(priority)
      ? current.filter(p => p !== priority)
      : [...current, priority];
    onFiltersChange({ priority: updated });
  };

  const handleUpdatedRangeChange = (range: HomeFilters['updatedRange']) => {
    onFiltersChange({ updatedRange: range });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--text-1)]">Filters</span>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-7 text-xs text-[var(--text-2)] hover:text-[var(--text-1)]"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Status Filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-[var(--text-2)]">Status</Label>
        <div className="flex flex-wrap gap-1.5">
          {statusOptions.map((option) => {
            const isSelected = filters.status.includes(option.value);
            return (
              <button
                key={option.value}
                onClick={() => handleStatusToggle(option.value)}
                className={cn(
                  "px-2 py-1 text-xs rounded-md border transition-colors",
                  isSelected
                    ? "bg-[var(--brand-primary)] text-[var(--text-inverse)] border-[var(--brand-primary)]"
                    : "bg-transparent text-[var(--text-2)] border-[var(--border-color)] hover:border-[var(--brand-primary)]"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Priority Filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-[var(--text-2)]">Priority</Label>
        <div className="flex flex-wrap gap-1.5">
          {PRIORITY_OPTIONS.map((option) => {
            const isSelected = filters.priority.includes(option.value);
            return (
              <button
                key={option.value}
                onClick={() => handlePriorityToggle(option.value)}
                className={cn(
                  "px-2 py-1 text-xs rounded-md border transition-colors",
                  isSelected
                    ? "bg-[var(--brand-primary)] text-[var(--text-inverse)] border-[var(--brand-primary)]"
                    : "bg-transparent text-[var(--text-2)] border-[var(--border-color)] hover:border-[var(--brand-primary)]"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Updated Range Filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-[var(--text-2)]">Updated</Label>
        <div className="flex flex-wrap gap-1.5">
          {UPDATED_RANGE_OPTIONS.map((option) => {
            const isSelected = filters.updatedRange === option.value;
            return (
              <button
                key={option.value}
                onClick={() => handleUpdatedRangeChange(option.value as HomeFilters['updatedRange'])}
                className={cn(
                  "px-2 py-1 text-xs rounded-md border transition-colors",
                  isSelected
                    ? "bg-[var(--brand-primary)] text-[var(--text-inverse)] border-[var(--brand-primary)]"
                    : "bg-transparent text-[var(--text-2)] border-[var(--border-color)] hover:border-[var(--brand-primary)]"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Planner-specific filters */}
      {mode === 'planner' && (
        <>
          {/* Decision Required */}
          <div className="flex items-center justify-between py-2">
            <Label className="text-xs font-medium text-[var(--text-2)]">
              Decision required
            </Label>
            <Switch
              checked={filters.decisionRequired === true}
              onCheckedChange={(checked) => 
                onFiltersChange({ decisionRequired: checked ? true : null })
              }
            />
          </div>

          {/* Ready for Sprint */}
          <div className="flex items-center justify-between py-2">
            <Label className="text-xs font-medium text-[var(--text-2)]">
              Ready for sprint
            </Label>
            <Switch
              checked={filters.readyForSprint === true}
              onCheckedChange={(checked) => 
                onFiltersChange({ readyForSprint: checked ? true : null })
              }
            />
          </div>

          {/* Planned Date Range */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-[var(--text-2)]">
              Planned date range
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  type="date"
                  value={filters.plannedDateFrom || ''}
                  onChange={(e) => onFiltersChange({ plannedDateFrom: e.target.value || null })}
                  className="h-8 text-xs bg-[var(--surface-2)] border-[var(--border-color)]"
                  placeholder="From"
                />
              </div>
              <span className="text-xs text-[var(--text-3)]">to</span>
              <div className="flex-1">
                <Input
                  type="date"
                  value={filters.plannedDateTo || ''}
                  onChange={(e) => onFiltersChange({ plannedDateTo: e.target.value || null })}
                  className="h-8 text-xs bg-[var(--surface-2)] border-[var(--border-color)]"
                  placeholder="To"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
