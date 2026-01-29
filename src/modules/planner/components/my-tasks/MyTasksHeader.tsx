// ============================================================
// MY TASKS HEADER - V9 Design System (Task List Aligned)
// Matches Task List V3 header structure and typography
// ============================================================

import { Plus, Search, CheckSquare, List, X, ChevronDown, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useMyTasksSummary } from '../../hooks/useMyTasks';
import { cn } from '@/lib/utils';
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
  const workstreams: { id: string; name: string; color?: string }[] = []; // Workstreams removed

  // Active filter count
  const activeFilterCount = [
    filters.workstreams?.length,
    filters.statuses?.length,
    filters.searchQuery,
  ].filter(Boolean).length;

  return (
    <div className="flex-shrink-0">
      {/* ROW 1: Header with Stats (Task List V3 Style) */}
      <div 
        className="flex items-center justify-between px-6 py-4 border-b" 
        style={{ 
          background: 'var(--pln-tl-surface-page)', 
          borderColor: 'var(--pln-tl-border)' 
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center" 
            style={{ background: 'rgba(37, 99, 235, 0.1)' }}
          >
            <CheckSquare className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--pln-tl-text-primary)' }}>
              My Tasks
            </h1>
            <p className="text-sm" style={{ color: 'var(--pln-tl-text-tertiary)' }}>
              Personal task overview and tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats chips (Task List V3 Style) */}
          <div className="tl-stat-chip danger">
            <span className="label">Overdue</span>
            <span className="value">{isLoading ? '—' : summary?.overdue_count || 0}</span>
          </div>
          <div className="tl-stat-chip warning">
            <span className="label">Today</span>
            <span className="value">{isLoading ? '—' : summary?.today_count || 0}</span>
          </div>
          <div className="tl-stat-chip success">
            <span className="label">Done</span>
            <span className="value">{isLoading ? '—' : summary?.completed_today || 0}</span>
          </div>
        </div>
      </div>

      {/* ROW 2: Toolbar (Task List V3 Style) */}
      <div className="tl-toolbar shrink-0">
        <div className="flex items-center gap-2 flex-1">
          {/* Search */}
          <div className="tl-search">
            <Search className="w-4 h-4 tl-search-icon" />
            <input
              type="text"
              placeholder="Search tasks... ⌘K"
              value={filters.searchQuery || ''}
              onChange={(e) => onFilterChange({ searchQuery: e.target.value || undefined })}
              className="tl-search-input"
            />
            {filters.searchQuery && (
              <button
                onClick={() => onFilterChange({ searchQuery: undefined })}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--pln-tl-text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Workstream Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="tl-btn tl-btn-outline">
                <Layers className="w-4 h-4" />
                {filters.workstreams?.[0] 
                  ? workstreams.find(w => w.id === filters.workstreams?.[0])?.name || 'Workstream'
                  : 'Workstream'
                }
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="tl-dropdown w-48">
              <DropdownMenuItem onClick={() => onFilterChange({ workstreams: undefined })}>
                All Workstreams
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {workstreams.map((ws) => (
                <DropdownMenuItem 
                  key={ws.id} 
                  onClick={() => onFilterChange({ workstreams: [ws.id] })}
                >
                  <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: ws.color }} />
                  {ws.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="tl-btn tl-btn-outline">
                {filters.statuses?.[0] || 'Status'}
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="tl-dropdown w-40">
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
              className="tl-btn tl-btn-outline"
            >
              <X className="w-4 h-4" />
              Clear ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Add Task Button */}
        <Button 
          className="tl-btn tl-btn-primary gap-2"
          onClick={onOpenCreateModal}
        >
          <Plus className="w-4 h-4" />
          Add Task
        </Button>
      </div>
    </div>
  );
}
