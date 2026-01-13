// ============================================================
// KANBAN FILTERS COMPONENT
// Filter bar for the Kanban board
// ============================================================

import { Search, X, Filter } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

interface KanbanFiltersProps {
  filters: KanbanTaskFilters;
  onFilterChange: (filters: Partial<KanbanTaskFilters>) => void;
  taskCount: number;
}

const PRIORITY_OPTIONS: { value: KanbanTaskPriority | 'all'; label: string }[] = [
  { value: 'all', label: 'All Priorities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export function KanbanFilters({ filters, onFilterChange, taskCount }: KanbanFiltersProps) {
  const hasActiveFilters = 
    filters.search !== '' || 
    filters.priority !== 'all' || 
    filters.assignee_id !== 'all' || 
    filters.workstream_id !== 'all';

  const clearFilters = () => {
    onFilterChange({
      search: '',
      priority: 'all',
      assignee_id: 'all',
      workstream_id: 'all',
    });
  };

  const activeFilterCount = [
    filters.search !== '',
    filters.priority !== 'all',
    filters.assignee_id !== 'all',
    filters.workstream_id !== 'all',
  ].filter(Boolean).length;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-[300px]">
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
        <SelectTrigger className="w-[150px] h-9">
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

      {/* Task count & Clear filters */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-sm text-muted-foreground">
          {taskCount} task{taskCount !== 1 ? 's' : ''}
        </span>

        {hasActiveFilters && (
          <>
            <Badge variant="secondary" className="gap-1">
              <Filter className="w-3 h-3" />
              {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
