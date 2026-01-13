// ============================================================
// PLANNER SEARCH BAR
// Search and filter toolbar for Planner
// ============================================================

import { Search, X, Filter, ChevronDown, Users, Layers, Plus, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { PlannerFilters } from '../hooks/usePlannerSearch';
import type { TaskStatus, TaskPriority, PlannerTeam, GroupByOption } from '../types';
import { COLUMN_CONFIG, PRIORITY_CONFIG } from '../types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const GROUP_OPTIONS: { id: GroupByOption | 'none'; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'status', label: 'Status' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'priority', label: 'Priority' },
  { id: 'reporter', label: 'Reporter' },
  { id: 'dueDate', label: 'Due Date' },
];

interface PlannerSearchBarProps {
  filters: PlannerFilters;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: TaskStatus | null) => void;
  onPriorityChange: (priority: TaskPriority | null) => void;
  onBlockedChange: (blocked: boolean | null) => void;
  onOverdueChange: (overdue: boolean | null) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  filteredCount: number;
  totalCount: number;
  inputRef?: React.RefObject<HTMLInputElement>;
  teams?: PlannerTeam[];
  selectedTeamId: string | null;
  onTeamChange: (teamId: string | null) => void;
  groupBy?: GroupByOption | 'none';
  onGroupByChange?: (groupBy: GroupByOption | 'none') => void;
  onCreateTeam?: () => void;
}

export function PlannerSearchBar({
  filters,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onBlockedChange,
  onOverdueChange,
  onClearFilters,
  hasActiveFilters,
  filteredCount,
  totalCount,
  inputRef,
  teams = [],
  selectedTeamId,
  onTeamChange,
  groupBy = 'none',
  onGroupByChange,
  onCreateTeam,
}: PlannerSearchBarProps) {
  const navigate = useNavigate();
  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  const selectedGroupLabel = GROUP_OPTIONS.find(o => o.id === groupBy)?.label || 'None';
  
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-surface-0">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <Input
          ref={inputRef}
          type="text"
          value={filters.search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tasks... (⌘K)"
          className="pl-9 pr-9 h-9 bg-surface-1"
        />
        {filters.search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-surface-2 text-text-muted"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Team Switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={cn(
            "h-9 gap-2 min-w-[140px] justify-between",
            selectedTeamId && "border-blue-500 text-blue-600"
          )}>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="text-sm truncate max-w-[100px]">
                {selectedTeam?.name || 'All Teams'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-surface-0 z-50 w-56 max-h-80 overflow-y-auto">
          <DropdownMenuItem 
            onClick={() => onTeamChange(null)}
            className={cn(!selectedTeamId && "bg-blue-50")}
          >
            <Users className="w-4 h-4 mr-2 text-muted-foreground" />
            All Teams
          </DropdownMenuItem>
          {onCreateTeam && (
            <DropdownMenuItem 
              onClick={onCreateTeam}
              className="text-blue-600 font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {teams.map(team => (
            <DropdownMenuItem
              key={team.id}
              onClick={() => onTeamChange(team.id)}
              className={cn(selectedTeamId === team.id && "bg-blue-50")}
            >
              <div className="flex items-center gap-2 w-full">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: team.color }}
                />
                <span className="truncate flex-1">{team.name}</span>
                <span className="text-xs text-muted-foreground">{team.memberCount}</span>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => navigate('/planner/teams')}
            className="text-muted-foreground hover:text-foreground"
          >
            <span className="flex items-center gap-1 text-sm">
              Manage teams
              <ArrowRight className="w-3 h-3" />
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={cn(
            "h-9 gap-2",
            filters.status && "border-blue-500 text-blue-600"
          )}>
            <span className="text-sm">Status</span>
            {filters.status && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                {COLUMN_CONFIG.find(c => c.id === filters.status)?.title}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-surface-0 z-50 w-44">
          <DropdownMenuItem onClick={() => onStatusChange(null)}>
            All Statuses
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {COLUMN_CONFIG.map(col => (
            <DropdownMenuItem
              key={col.id}
              onClick={() => onStatusChange(col.id as TaskStatus)}
              className={cn(filters.status === col.id && "bg-blue-50")}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: col.color }}
                />
                {col.title}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Priority Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={cn(
            "h-9 gap-2",
            filters.priority && "border-blue-500 text-blue-600"
          )}>
            <span className="text-sm">Priority</span>
            {filters.priority && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                {PRIORITY_CONFIG[filters.priority].label}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-surface-0 z-50 w-44">
          <DropdownMenuItem onClick={() => onPriorityChange(null)}>
            All Priorities
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, typeof PRIORITY_CONFIG['critical']][]).map(([key, config]) => (
            <DropdownMenuItem
              key={key}
              onClick={() => onPriorityChange(key)}
              className={cn(filters.priority === key && "bg-blue-50")}
            >
              <div className="flex items-center gap-2">
                <span>{config.emoji}</span>
                {config.label}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Group By Dropdown */}
      {onGroupByChange && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={cn(
              "h-9 gap-2",
              groupBy !== 'none' && "border-blue-500 text-blue-600"
            )}>
              <Layers className="w-4 h-4" />
              <span className="text-sm">Group</span>
              {groupBy !== 'none' && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                  {selectedGroupLabel}
                </span>
              )}
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-surface-0 z-50 w-44">
            {GROUP_OPTIONS.map(option => (
              <DropdownMenuItem
                key={option.id}
                onClick={() => onGroupByChange(option.id)}
                className={cn(groupBy === option.id && "bg-blue-50")}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Quick Filters */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={cn(
            "h-9 gap-2",
            (filters.blocked !== null || filters.overdue) && "border-blue-500 text-blue-600"
          )}>
            <Filter className="w-4 h-4" />
            <span className="text-sm">Filters</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-surface-0 z-50 w-48">
          <DropdownMenuItem
            onClick={() => onBlockedChange(filters.blocked === true ? null : true)}
            className={cn(filters.blocked === true && "bg-red-50 text-red-700")}
          >
            🚫 Blocked Only
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onOverdueChange(filters.overdue ? null : true)}
            className={cn(filters.overdue && "bg-orange-50 text-orange-700")}
          >
            ⏰ Overdue Only
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="h-9 text-text-muted hover:text-text-primary"
        >
          <X className="w-4 h-4 mr-1" />
          Clear
        </Button>
      )}

      {/* Results Count */}
      <div className="ml-auto text-xs text-text-muted">
        {hasActiveFilters ? (
          <span>{filteredCount} of {totalCount} tasks</span>
        ) : (
          <span>{totalCount} tasks</span>
        )}
      </div>
    </div>
  );
}
