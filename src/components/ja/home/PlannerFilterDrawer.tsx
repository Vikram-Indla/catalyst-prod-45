// src/components/ja/home/PlannerFilterDrawer.tsx
// Real filter controls for Planner mode - replaces placeholder

import React from 'react';
import { X, Calendar, Filter, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { PlannerFilters } from '@/hooks/home/useHomePlannerData';

// Work Manager task statuses
const TASK_STATUSES = [
  { value: 'Backlog', label: 'Backlog' },
  { value: 'Planned', label: 'Planned' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'On Hold', label: 'On Hold' },
];

interface PlannerFilterDrawerProps {
  filters: PlannerFilters;
  onFiltersChange: (filters: PlannerFilters) => void;
  onApply: () => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function PlannerFilterDrawer({
  filters,
  onFiltersChange,
  onApply,
  onClear,
  hasActiveFilters,
}: PlannerFilterDrawerProps) {
  const handleStatusToggle = (status: string) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatuses });
  };

  const handleDecisionRequiredChange = (checked: boolean | 'indeterminate') => {
    if (checked === 'indeterminate') {
      onFiltersChange({ ...filters, decisionRequired: null });
    } else {
      onFiltersChange({ ...filters, decisionRequired: checked ? true : null });
    }
  };

  const handleReadyForSprintChange = (checked: boolean | 'indeterminate') => {
    if (checked === 'indeterminate') {
      onFiltersChange({ ...filters, readyForSprint: null });
    } else {
      onFiltersChange({ ...filters, readyForSprint: checked ? true : null });
    }
  };

  const handleDateChange = (field: 'plannedDateFrom' | 'plannedDateTo', value: string) => {
    onFiltersChange({ ...filters, [field]: value || null });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--icon-muted)]" />
          <span className="text-sm font-medium text-[var(--text-1)]">Filter by</span>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-7 px-2 text-xs text-[var(--text-3)] hover:text-[var(--text-1)]"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      <Separator className="bg-[var(--divider)]" />

      {/* Status Filter */}
      <div className="space-y-3">
        <Label className="text-xs font-medium uppercase tracking-wider text-[var(--text-3)]">
          Status
        </Label>
        <div className="space-y-2">
          {TASK_STATUSES.map(status => (
            <div key={status.value} className="flex items-center gap-2">
              <Checkbox
                id={`status-${status.value}`}
                checked={filters.status.includes(status.value)}
                onCheckedChange={() => handleStatusToggle(status.value)}
                className="border-[var(--border-color)] data-[state=checked]:bg-[var(--brand-primary)] data-[state=checked]:border-[var(--brand-primary)]"
              />
              <Label
                htmlFor={`status-${status.value}`}
                className="text-sm text-[var(--text-2)] cursor-pointer"
              >
                {status.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator className="bg-[var(--divider)]" />

      {/* Decision Required Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm text-[var(--text-1)]">Decision required</Label>
          <p className="text-xs text-[var(--text-3)]">Tasks needing approval</p>
        </div>
        <Switch
          checked={filters.decisionRequired === true}
          onCheckedChange={(checked) => handleDecisionRequiredChange(checked)}
          className="data-[state=checked]:bg-[var(--brand-primary)]"
        />
      </div>

      {/* Ready for Sprint Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm text-[var(--text-1)]">Ready for sprint</Label>
          <p className="text-xs text-[var(--text-3)]">Tasks ready to start</p>
        </div>
        <Switch
          checked={filters.readyForSprint === true}
          onCheckedChange={(checked) => handleReadyForSprintChange(checked)}
          className="data-[state=checked]:bg-[var(--brand-primary)]"
        />
      </div>

      <Separator className="bg-[var(--divider)]" />

      {/* Planned Date Range */}
      <div className="space-y-3">
        <Label className="text-xs font-medium uppercase tracking-wider text-[var(--text-3)]">
          Planned date range
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="plannedDateFrom" className="text-xs text-[var(--text-3)]">
              From
            </Label>
            <input
              type="date"
              id="plannedDateFrom"
              value={filters.plannedDateFrom || ''}
              onChange={(e) => handleDateChange('plannedDateFrom', e.target.value)}
              className={cn(
                "w-full h-9 px-3 rounded-md text-sm",
                "bg-[var(--surface-2)] border border-[var(--border-color)]",
                "text-[var(--text-1)] placeholder:text-[var(--text-3)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plannedDateTo" className="text-xs text-[var(--text-3)]">
              To
            </Label>
            <input
              type="date"
              id="plannedDateTo"
              value={filters.plannedDateTo || ''}
              onChange={(e) => handleDateChange('plannedDateTo', e.target.value)}
              className={cn(
                "w-full h-9 px-3 rounded-md text-sm",
                "bg-[var(--surface-2)] border border-[var(--border-color)]",
                "text-[var(--text-1)] placeholder:text-[var(--text-3)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              )}
            />
          </div>
        </div>
      </div>

      <Separator className="bg-[var(--divider)]" />

      {/* Apply Button */}
      <Button
        onClick={onApply}
        className="w-full bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)]"
      >
        Apply filters
      </Button>
    </div>
  );
}
