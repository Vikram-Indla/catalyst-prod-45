// ============================================================
// PLANNER SEARCH BAR
// Search and filter toolbar for Planner
// ============================================================

import { useState, useMemo } from 'react';
import { Search, X, Filter, ChevronDown, Users, Layers, Plus, ArrowRight, Columns3, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { PlannerFilters } from '../hooks/usePlannerSearch';
import type { TaskStatus, TaskPriority, GroupByOption, PlannerUser } from '../types';
import { COLUMN_CONFIG, PRIORITY_CONFIG } from '../types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const GROUP_OPTIONS: { id: GroupByOption | 'none'; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'status', label: 'Status' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'priority', label: 'Priority' },
  { id: 'reporter', label: 'Reporter' },
  { id: 'dueDate', label: 'Due Date' },
];

// Column definitions for task list
export interface ColumnDef {
  id: string;
  label: string;
}

export const ALL_COLUMNS: ColumnDef[] = [
  { id: 'key', label: 'ID' },
  { id: 'title', label: 'Title' },
  { id: 'status', label: 'Status' },
  { id: 'priority', label: 'Priority' },
  { id: 'teamName', label: 'Workstream' },
  { id: 'assigneeName', label: 'Assignee' },
  { id: 'startDate', label: 'Start Date' },
  { id: 'dueDate', label: 'Due Date' },
  { id: 'progress', label: 'Progress' },
];

// Simplified team type for search bar (workstreams removed)
interface SimpleTeam {
  id: string;
  name: string;
  color?: string;
  memberCount?: number;
}

interface PlannerSearchBarProps {
  filters: PlannerFilters;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: TaskStatus | null) => void;
  onPriorityChange: (priority: TaskPriority | null) => void;
  onAssigneeChange?: (assigneeId: string | null) => void;
  onBlockedChange: (blocked: boolean | null) => void;
  onOverdueChange: (overdue: boolean | null) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  filteredCount: number;
  totalCount: number;
  inputRef?: React.RefObject<HTMLInputElement>;
  teams?: SimpleTeam[];
  users?: PlannerUser[];
  selectedTeamId: string | null;
  onTeamChange: (teamId: string | null) => void;
  groupBy?: GroupByOption | 'none';
  onGroupByChange?: (groupBy: GroupByOption | 'none') => void;
  onCreateTeam?: () => void;
  // Columns visibility (for task-list view)
  visibleColumns?: Set<string>;
  onToggleColumn?: (columnId: string) => void;
  showColumnsButton?: boolean;
}

export function PlannerSearchBar({
  filters,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onBlockedChange,
  onOverdueChange,
  onClearFilters,
  hasActiveFilters,
  filteredCount,
  totalCount,
  inputRef,
  teams = [],
  users = [],
  selectedTeamId,
  onTeamChange,
  groupBy = 'none',
  onGroupByChange,
  onCreateTeam,
  visibleColumns,
  onToggleColumn,
  showColumnsButton = false,
}: PlannerSearchBarProps) {
  const navigate = useNavigate();
  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  const selectedAssignee = users.find(u => u.id === filters.assigneeId);
  const selectedGroupLabel = GROUP_OPTIONS.find(o => o.id === groupBy)?.label || 'None';
  
  return (
    <div className="relative z-50 flex items-center gap-3 px-4 py-2 border-b border-border bg-surface-0">
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
                {selectedTeam?.name || 'All Workstreams'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="z-[9999] bg-popover w-56 max-h-80 overflow-y-auto">
          <DropdownMenuItem 
            onClick={() => onTeamChange(null)}
            className={cn(!selectedTeamId && "bg-blue-50")}
          >
            <Users className="w-4 h-4 mr-2 text-muted-foreground" />
            All Workstreams
          </DropdownMenuItem>
          {onCreateTeam && (
            <DropdownMenuItem 
              onClick={onCreateTeam}
              className="text-blue-600 font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Workstream
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
            onClick={() => navigate('/taskhub/teams')}
            className="text-muted-foreground hover:text-foreground"
          >
            <span className="flex items-center gap-1 text-sm">
              Manage workstreams
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
        <DropdownMenuContent align="start" className="z-[9999] bg-popover w-44">
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
        <DropdownMenuContent align="start" className="z-[9999] bg-popover w-44">
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
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: config.color }}
                />
                {config.label}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Assignee Filter */}
      {onAssigneeChange && (
        <AssigneeFilterPopover
          users={users}
          selectedAssigneeId={filters.assigneeId}
          onAssigneeChange={onAssigneeChange}
        />
      )}

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
           <DropdownMenuContent align="start" className="z-[9999] bg-popover w-44">
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
         <DropdownMenuContent align="start" className="z-[9999] bg-popover w-48">
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

      {/* Columns Toggle (for task-list view) */}
      {showColumnsButton && visibleColumns && onToggleColumn && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Columns3 className="w-4 h-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
           <DropdownMenuContent align="end" className="w-48 bg-popover z-[9999]">
            {ALL_COLUMNS.map(column => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={visibleColumns.has(column.id)}
                onCheckedChange={() => onToggleColumn(column.id)}
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// Assignee filter with search
function AssigneeFilterPopover({
  users,
  selectedAssigneeId,
  onAssigneeChange,
}: {
  users: PlannerUser[];
  selectedAssigneeId: string | null | undefined;
  onAssigneeChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedAssignee = users.find((u) => u.id === selectedAssigneeId);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter((u) => u.name.toLowerCase().includes(q));
  }, [users, search]);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn(
          "h-9 gap-2",
          selectedAssigneeId && "border-blue-500 text-blue-600"
        )}>
          <span className="text-sm">Assignee</span>
          {selectedAssignee && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 truncate max-w-[80px]">
              {selectedAssignee.name}
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-[9999] bg-popover w-64 p-0">
        {/* Search input */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assignees..."
              autoFocus
              className="w-full pl-8 pr-3 py-1.5 bg-muted/50 border rounded text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        
        {/* Options */}
        <div className="max-h-60 overflow-y-auto p-1">
          <button
            onClick={() => { onAssigneeChange(null); setOpen(false); setSearch(''); }}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-2 rounded transition-colors text-left",
              !selectedAssigneeId ? "bg-blue-50" : "hover:bg-muted/50"
            )}
          >
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1 text-sm">All Assignees</span>
            {!selectedAssigneeId && <Check className="w-4 h-4 text-primary" />}
          </button>
          
          {filteredUsers.length === 0 && search.trim() && (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No matching users
            </div>
          )}
          
          {filteredUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => { onAssigneeChange(user.id); setOpen(false); setSearch(''); }}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-2 rounded transition-colors text-left",
                selectedAssigneeId === user.id ? "bg-blue-50" : "hover:bg-muted/50"
              )}
            >
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium flex-shrink-0">
                {user.initials}
              </div>
              <span className="flex-1 text-sm truncate">{user.name}</span>
              {selectedAssigneeId === user.id && <Check className="w-4 h-4 text-primary" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
