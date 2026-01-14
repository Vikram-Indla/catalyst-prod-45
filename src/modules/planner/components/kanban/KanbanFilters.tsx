// ============================================================
// KANBAN FILTERS COMPONENT
// Filter bar with search, priority, and swimlane grouping
// ============================================================

import { Search, X, Rows3 } from 'lucide-react';
import type { KanbanTaskFilters, KanbanTaskPriority } from '../../types/kanban';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type SwimlaneGrouping = 'none' | 'assignee' | 'priority' | 'workstream';

interface KanbanFiltersProps {
  filters: KanbanTaskFilters;
  onFilterChange: (filters: Partial<KanbanTaskFilters>) => void;
  taskCount: number;
  swimlane: SwimlaneGrouping;
  onSwimlaneChange: (swimlane: SwimlaneGrouping) => void;
}

const PRIORITY_OPTIONS: { value: KanbanTaskPriority | 'all'; label: string }[] = [
  { value: 'all', label: 'All Priorities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const SWIMLANE_OPTIONS: { value: SwimlaneGrouping; label: string }[] = [
  { value: 'none', label: 'No Swimlanes' },
  { value: 'assignee', label: 'By Assignee' },
  { value: 'priority', label: 'By Priority' },
  { value: 'workstream', label: 'By Workstream' },
];

export function KanbanFilters({ 
  filters, 
  onFilterChange, 
  taskCount,
  swimlane,
  onSwimlaneChange,
}: KanbanFiltersProps) {
  const hasActiveFilters = 
    filters.search !== '' || 
    filters.priority !== 'all';

  const clearFilters = () => {
    onFilterChange({
      search: '',
      priority: 'all',
      assignee_id: 'all',
      workstream_id: 'all',
    });
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-[280px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={filters.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
          className="pl-9 h-9"
        />
        {filters.search && (
          <button
            onClick={() => onFilterChange({ search: '' })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Priority Filter */}
      <Select
        value={filters.priority}
        onValueChange={(value) => onFilterChange({ priority: value as KanbanTaskPriority | 'all' })}
      >
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          {PRIORITY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Swimlane Grouping */}
      <Select value={swimlane} onValueChange={(value) => onSwimlaneChange(value as SwimlaneGrouping)}>
        <SelectTrigger className="w-[150px] h-9">
          <Rows3 className="w-4 h-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Swimlanes" />
        </SelectTrigger>
        <SelectContent>
          {SWIMLANE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Task count & Clear filters */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-sm text-muted-foreground">
          {taskCount} task{taskCount !== 1 ? 's' : ''}
        </span>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 text-muted-foreground hover:text-foreground"
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
