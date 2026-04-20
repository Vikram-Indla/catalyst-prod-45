/**
 * Task List Toolbar - Planner V9
 * Search, filters, view options, export, create
 */

import { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Columns3, 
  Download, 
  Plus,
  X,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { usePlannerUsers } from '../../hooks/usePlannerUsers';
import { useKanbanStatuses } from '../../hooks/useKanbanStatuses';
import { PRIORITY_CONFIG } from '../../types';
import type { TaskPriority, GroupByOption } from '../../types';
import type { TaskListFilters } from '../../hooks/useTaskList';

interface TaskListToolbarProps {
  filters: TaskListFilters;
  onFiltersChange: (filters: TaskListFilters) => void;
  onSearch: (query: string) => void;
  onCreateTask: () => void;
  onExport: () => void;
  visibleColumns: Set<string>;
  onColumnsChange: (columns: Set<string>) => void;
  groupBy: GroupByOption | 'none';
  onGroupByChange: (group: GroupByOption | 'none') => void;
  filteredCount: number;
  totalCount: number;
}

const ALL_COLUMNS = [
  { id: 'key', label: 'ID' },
  { id: 'title', label: 'Title' },
  { id: 'status', label: 'Status' },
  { id: 'priority', label: 'Priority' },
  { id: 'workstream', label: 'Workstream' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'dueDate', label: 'Due Date' },
  { id: 'progress', label: 'Progress' },
  { id: 'actions', label: 'Actions' },
];

const GROUP_OPTIONS: { value: GroupByOption | 'none'; label: string }[] = [
  { value: 'none', label: 'No Grouping' },
  { value: 'status', label: 'By Status' },
  { value: 'priority', label: 'By Priority' },
  { value: 'assignee', label: 'By Assignee' },
];

export function TaskListToolbar({
  filters,
  onFiltersChange,
  onSearch,
  onCreateTask,
  onExport,
  visibleColumns,
  onColumnsChange,
  groupBy,
  onGroupByChange,
  filteredCount,
  totalCount,
}: TaskListToolbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const workstreams: { id: string; name: string; slug?: string; color?: string }[] = []; // Workstreams removed
  const { data: users = [] } = usePlannerUsers();
  const { data: statuses = [] } = useKanbanStatuses();

  // Focus search on ⌘K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onSearch(value);
  };

  const handleClearFilters = () => {
    onFiltersChange({});
    setSearchValue('');
    onSearch('');
  };

  const activeFilterCount = [
    filters.workstream,
    filters.status,
    filters.priority,
    filters.assignee,
    filters.overdueOnly,
  ].filter(Boolean).length;

  const toggleColumn = (columnId: string) => {
    const next = new Set(visibleColumns);
    if (next.has(columnId)) {
      next.delete(columnId);
    } else {
      next.add(columnId);
    }
    onColumnsChange(next);
  };

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
      {/* Left: Search & Filters */}
      <div className="flex items-center gap-2 flex-1">
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search tasks... ⌘K"
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-9 bg-white dark:bg-slate-800"
          />
          {searchValue && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>

        {/* Workstream Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "h-9 gap-2",
                filters.workstream && "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300"
              )}
            >
              <Layers className="w-4 h-4" />
              {filters.workstream 
                ? workstreams.find(w => w.id === filters.workstream)?.name || 'Workstream'
                : 'Workstream'
              }
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-popover w-48">
            <DropdownMenuItem onClick={() => onFiltersChange({ ...filters, workstream: null })}>
              All Workstreams
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {workstreams.map((ws) => (
              <DropdownMenuItem 
                key={ws.id} 
                onClick={() => onFiltersChange({ ...filters, workstream: ws.id })}
                className={cn(filters.workstream === ws.id && "bg-blue-50 dark:bg-blue-950")}
              >
                <span 
                  className="w-2.5 h-2.5 rounded-full mr-2" 
                  style={{ backgroundColor: ws.color }}
                />
                {ws.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "h-9 gap-2",
                filters.status && "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300"
              )}
            >
              {filters.status 
                ? statuses.find(s => s.id === filters.status)?.name || 'Status'
                : 'Status'
              }
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-popover w-40">
            <DropdownMenuItem onClick={() => onFiltersChange({ ...filters, status: null })}>
              All Statuses
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {statuses.map((s) => (
              <DropdownMenuItem 
                key={s.id} 
                onClick={() => onFiltersChange({ ...filters, status: s.id })}
                className={cn(filters.status === s.id && "bg-blue-50 dark:bg-blue-950")}
              >
                <span 
                  className="w-2.5 h-2.5 rounded-full mr-2" 
                  style={{ backgroundColor: s.color }}
                />
                {s.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Priority Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "h-9 gap-2",
                filters.priority && "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300"
              )}
            >
              {filters.priority 
                ? PRIORITY_CONFIG[filters.priority].label
                : 'Priority'
              }
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-popover w-36">
            <DropdownMenuItem onClick={() => onFiltersChange({ ...filters, priority: null })}>
              All Priorities
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => {
              const config = PRIORITY_CONFIG[p];
              return (
                <DropdownMenuItem 
                  key={p} 
                  onClick={() => onFiltersChange({ ...filters, priority: p })}
                  className={cn(filters.priority === p && "bg-blue-50 dark:bg-blue-950")}
                >
                  <span className="mr-2">{config.emoji}</span>
                  <span style={{ color: config.color }}>{config.label}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClearFilters}
            className="h-9 text-slate-500"
          >
            <X className="w-4 h-4 mr-1" />
            Clear ({activeFilterCount})
          </Button>
        )}

        {/* Results Count */}
        <span className="text-sm text-slate-500 ml-2">
          {filteredCount === totalCount 
            ? `${totalCount} tasks`
            : `${filteredCount} of ${totalCount} tasks`
          }
        </span>
      </div>

      {/* Right: View Options & Actions */}
      <div className="flex items-center gap-2">
        {/* Group By */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Filter className="w-4 h-4" />
              Group
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            {GROUP_OPTIONS.map((opt) => (
              <DropdownMenuItem 
                key={opt.value} 
                onClick={() => onGroupByChange(opt.value)}
              >
                {groupBy === opt.value && <span className="mr-2">✓</span>}
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Columns */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Columns3 className="w-4 h-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover w-40">
            {ALL_COLUMNS.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={visibleColumns.has(col.id)}
                onCheckedChange={() => toggleColumn(col.id)}
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export */}
        <Button variant="outline" size="sm" className="h-9 gap-2" onClick={onExport}>
          <Download className="w-4 h-4" />
          Export
        </Button>

        {/* Add Task */}
        <Button size="sm" className="h-9 gap-2 bg-blue-600 hover:bg-blue-700" onClick={onCreateTask}>
          <Plus className="w-4 h-4" />
          Add Task
        </Button>
      </div>
    </div>
  );
}
