import React from 'react';
import { Filter, X, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Lozenge } from '@/components/ads';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import type { CalendarFilters, CalendarEventStatus } from '@/types/calendar.types';

interface CalendarToolbarProps {
  filters: CalendarFilters;
  onFilterChange: (filters: CalendarFilters) => void;
  filterOptions: {
    assignees: { id: string; name: string }[];
    statuses: { value: string; label: string }[];
    modules: string[];
  };
  onOpenReschedule: () => void;
}

export function CalendarToolbar({
  filters,
  onFilterChange,
  filterOptions,
  onOpenReschedule,
}: CalendarToolbarProps) {
  const activeFilterCount = 
    filters.assignees.length + 
    filters.statuses.length + 
    filters.modules.length;

  const toggleAssignee = (id: string) => {
    const newAssignees = filters.assignees.includes(id)
      ? filters.assignees.filter(a => a !== id)
      : [...filters.assignees, id];
    onFilterChange({ ...filters, assignees: newAssignees });
  };

  const toggleStatus = (status: CalendarEventStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    onFilterChange({ ...filters, statuses: newStatuses });
  };

  const toggleModule = (module: string) => {
    const newModules = filters.modules.includes(module)
      ? filters.modules.filter(m => m !== module)
      : [...filters.modules, module];
    onFilterChange({ ...filters, modules: newModules });
  };

  const clearFilters = () => {
    onFilterChange({ assignees: [], statuses: [], priorities: [], modules: [] });
  };

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-[var(--ds-surface-sunken,var(--ds-surface-sunken, #f8fafc))] border-b border-[var(--ds-border,var(--ds-border, #e2e8f0))]">
      <div className="flex items-center gap-2">
        {/* Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2 border-[var(--ds-border,var(--ds-border, #e2e8f0))]">
              <Filter className="h-3.5 w-3.5" />
              Status
              {filters.statuses.length > 0 && (
                <Lozenge appearance="inprogress">
                  {filters.statuses.length}
                </Lozenge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {filterOptions.statuses.map((status) => (
              <DropdownMenuCheckboxItem
                key={status.value}
                checked={filters.statuses.includes(status.value as CalendarEventStatus)}
                onCheckedChange={() => toggleStatus(status.value as CalendarEventStatus)}
              >
                {status.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Assignee Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2 border-[var(--ds-border,var(--ds-border, #e2e8f0))]">
              Assignee
              {filters.assignees.length > 0 && (
                <Lozenge appearance="inprogress">
                  {filters.assignees.length}
                </Lozenge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Filter by Assignee</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {filterOptions.assignees.map((assignee) => (
              <DropdownMenuCheckboxItem
                key={assignee.id}
                checked={filters.assignees.includes(assignee.id)}
                onCheckedChange={() => toggleAssignee(assignee.id)}
              >
                {assignee.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Module Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2 border-[var(--ds-border,var(--ds-border, #e2e8f0))]">
              Module
              {filters.modules.length > 0 && (
                <Lozenge appearance="inprogress">
                  {filters.modules.length}
                </Lozenge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Filter by Module</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {filterOptions.modules.map((module) => (
              <DropdownMenuCheckboxItem
                key={module}
                checked={filters.modules.includes(module)}
                onCheckedChange={() => toggleModule(module)}
              >
                {module}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #64748b))] hover:text-[var(--ds-text,var(--ds-text, #0f172a))]"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onOpenReschedule}
        className="h-8 gap-2 border-[var(--ds-border,var(--ds-border, #e2e8f0))]"
      >
        <CalendarIcon className="h-3.5 w-3.5" />
        Reschedule Tests
      </Button>
    </div>
  );
}
