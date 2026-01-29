// ============================================================
// MY TASKS HEADER - Enterprise Clean V1
// Invasive override with elevated KPI cards and sentence case
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
      {/* ROW 1: Header with KPI Cards */}
      <div className="mt-header flex items-center justify-between">
        <div>
          <h1>My Tasks</h1>
          <p className="mt-subtitle">{subtitleText}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* KPI Cards - Enterprise Clean Style */}
          <div className="mt-kpi-card kpi-overdue">
            <span className="mt-kpi-value">{isLoading ? '—' : summary?.overdue_count || 0}</span>
            <span className="mt-kpi-label">Overdue</span>
          </div>
          <div className="mt-kpi-card kpi-today">
            <span className="mt-kpi-value">{isLoading ? '—' : summary?.today_count || 0}</span>
            <span className="mt-kpi-label">Today</span>
          </div>
          <div className="mt-kpi-card kpi-done">
            <span className="mt-kpi-value">{isLoading ? '—' : summary?.completed_today || 0}</span>
            <span className="mt-kpi-label">Done</span>
          </div>
        </div>
      </div>

      {/* ROW 2: Toolbar */}
      <div className="mt-toolbar">
        <div className="flex items-center gap-2 flex-1">
          {/* Search */}
          <div className="mt-search">
            <Search className="w-4 h-4 mt-search-icon" />
            <input
              type="text"
              placeholder="Search tasks... ⌘K"
              value={filters.searchQuery || ''}
              onChange={(e) => onFilterChange({ searchQuery: e.target.value || undefined })}
              className="mt-search-input"
            />
            {filters.searchQuery && (
              <button
                onClick={() => onFilterChange({ searchQuery: undefined })}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--mt-text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Workstream Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="mt-filter-btn">
                <Layers className="w-4 h-4" />
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
              <button className="mt-filter-btn">
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
              className="mt-filter-btn"
            >
              <X className="w-4 h-4" />
              Clear ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Add Task Button */}
        <button 
          className="mt-btn-primary"
          onClick={onOpenCreateModal}
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>
    </div>
  );
}
