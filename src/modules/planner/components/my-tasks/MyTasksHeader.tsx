// ============================================================
// MY TASKS HEADER - Enterprise Linear-Aligned V2
// Ring-fenced CSS: mytasks-header, mytasks-summary-card, etc.
// ============================================================

import { Plus, Search, X, ChevronDown, Layers } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useMyTasksSummary } from '../../hooks/useMyTasks';
import type { FilterConfig } from '../../types/my-tasks';

interface MyTasksHeaderProps {
  filters: FilterConfig;
  onFilterChange: (filters: Partial<FilterConfig>) => void;
  onOpenCreateModal: () => void;
}

export function MyTasksHeader({
  filters,
  onFilterChange,
  onOpenCreateModal,
}: MyTasksHeaderProps) {
  const { data: summary, isLoading } = useMyTasksSummary();
  const workstreams: { id: string; name: string; color?: string }[] = [];

  // Active filter count
  const activeFilterCount = [
    filters.workstreams?.length,
    filters.statuses?.length,
    filters.searchQuery,
  ].filter(Boolean).length;

  // Dynamic subtitle
  const totalTasks = summary?.total_tasks || 0;
  const overdueCount = summary?.overdue_count || 0;
  const subtitleText = isLoading 
    ? 'Loading...' 
    : `${totalTasks} task${totalTasks !== 1 ? 's' : ''} · ${overdueCount > 0 ? `${overdueCount} overdue` : 'All on track'}`;

  return (
    <div className="flex-shrink-0">
      {/* Header - Dashboard style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 gap-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            My Tasks
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {subtitleText}
          </p>
        </div>

        {/* Summary Cards - Inline with header */}
        <div className="flex items-center gap-3">
          <div className="mytasks-summary-card mytasks-summary-card--overdue">
            <div className="mytasks-summary-card__value">
              {isLoading ? '—' : summary?.overdue_count || 0}
            </div>
            <div className="mytasks-summary-card__label">Overdue</div>
          </div>
          <div className="mytasks-summary-card mytasks-summary-card--today">
            <div className="mytasks-summary-card__value">
              {isLoading ? '—' : summary?.today_count || 0}
            </div>
            <div className="mytasks-summary-card__label">Today</div>
          </div>
          <div className="mytasks-summary-card mytasks-summary-card--done">
            <div className="mytasks-summary-card__value">
              {isLoading ? '—' : summary?.completed_today || 0}
            </div>
            <div className="mytasks-summary-card__label">Done</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mytasks-toolbar">
        <div className="mytasks-toolbar__left">
          {/* Search */}
          <div className="mytasks-search">
            <Search className="mytasks-search__icon" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={filters.searchQuery || ''}
              onChange={(e) => onFilterChange({ searchQuery: e.target.value || undefined })}
              className="mytasks-search__input"
            />
            <span className="mytasks-search__shortcut">⌘K</span>
          </div>

          {/* Workstream Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="mytasks-filter-btn">
                <Layers className="mytasks-filter-btn__icon" />
                {filters.workstreams?.[0] 
                  ? workstreams.find(w => w.id === filters.workstreams?.[0])?.name || 'Workstream'
                  : 'Workstream'
                }
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => onFilterChange({ workstreams: undefined })}>
                All Workstreams
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {workstreams.map((ws) => (
                <DropdownMenuItem 
                  key={ws.id} 
                  onClick={() => onFilterChange({ workstreams: [ws.id] })}
                >
                  {ws.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="mytasks-filter-btn">
                {filters.statuses?.[0] || 'Status'}
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem onClick={() => onFilterChange({ statuses: undefined })}>
                All Statuses
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onFilterChange({ statuses: ['backlog'] })}>
                Backlog
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFilterChange({ statuses: ['planned'] })}>
                Planned
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFilterChange({ statuses: ['progress'] })}>
                In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFilterChange({ statuses: ['review'] })}>
                Review
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFilterChange({ statuses: ['done'] })}>
                Done
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <button 
              onClick={() => onFilterChange({ 
                statuses: undefined, 
                workstreams: undefined,
                searchQuery: undefined,
              })} 
              className="mytasks-filter-btn"
            >
              <X className="w-4 h-4" />
              Clear ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Add Task Button */}
        <button 
          className="mytasks-add-btn"
          onClick={onOpenCreateModal}
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>
    </div>
  );
}
