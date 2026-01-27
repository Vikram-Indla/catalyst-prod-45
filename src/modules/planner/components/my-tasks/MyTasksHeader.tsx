// ============================================================
// MY TASKS HEADER
// Planner V9: Stats chips header with actions
// ============================================================

import { useState } from 'react';
import { Focus, Plus, MoreVertical, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMyTasksSummary } from '../../hooks/useMyTasks';
import { usePlannerWorkstreams } from '../../hooks/usePlannerWorkstreams';
import type { FilterConfig } from '../../types/my-tasks';

interface MyTasksHeaderProps {
  filters: FilterConfig;
  onFilterChange: (filters: Partial<FilterConfig>) => void;
  onOpenCreateModal: () => void;
  onToggleFocusMode: () => void;
  isFocusModeActive?: boolean;
}

export function MyTasksHeader({
  filters,
  onFilterChange,
  onOpenCreateModal,
  onToggleFocusMode,
  isFocusModeActive = false,
}: MyTasksHeaderProps) {
  const { data: summary, isLoading } = useMyTasksSummary();
  const { data: workstreams = [] } = usePlannerWorkstreams();

  const statsChips = [
    { 
      label: 'Overdue', 
      value: summary?.overdue_count || 0, 
      color: '#ef4444',
      bgColor: '#fef2f2',
    },
    { 
      label: 'Today', 
      value: summary?.today_count || 0, 
      color: '#f59e0b',
      bgColor: '#fffbeb',
    },
    { 
      label: 'Done', 
      value: summary?.completed_today || 0, 
      color: '#10b981',
      bgColor: '#ecfdf5',
    },
  ];

  return (
    <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      {/* Top Row - Title and Stats */}
      <div className="flex items-center gap-4 px-6 py-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          My Tasks
        </h1>

        {/* Stats Chips */}
        <div className="flex items-center gap-2">
          {statsChips.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
              style={{ 
                backgroundColor: stat.bgColor,
                color: stat.color,
              }}
            >
              <span 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: stat.color }}
              />
              <span>{isLoading ? '...' : stat.value}</span>
              <span className="text-xs opacity-75">{stat.label}</span>
            </div>
          ))}
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <Button
          variant={isFocusModeActive ? "default" : "outline"}
          className={cn(
            'gap-2',
            isFocusModeActive && 'bg-slate-900 text-white hover:bg-slate-800'
          )}
          onClick={onToggleFocusMode}
        >
          <Focus className="w-4 h-4" />
          Focus Mode
        </Button>

        <Button 
          className="gap-2 bg-orange-500 hover:bg-orange-600"
          onClick={onOpenCreateModal}
        >
          <Plus className="w-4 h-4" />
          Add Task
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Export Tasks</DropdownMenuItem>
            <DropdownMenuItem>Print View</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bottom Row - Search and Filters */}
      <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 dark:bg-slate-800/50">
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search tasks..."
            value={filters.searchQuery || ''}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value || undefined })}
            className="pl-9 h-9 bg-white dark:bg-slate-800"
          />
          {filters.searchQuery && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              ⌘K
            </span>
          )}
        </div>

        {/* Status Filter */}
        <Select 
          value={filters.statuses?.[0] || 'all'}
          onValueChange={(value) => onFilterChange({ 
            statuses: value === 'all' ? undefined : [value] 
          })}
        >
          <SelectTrigger className="w-32 h-9 bg-white dark:bg-slate-800">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="backlog">Backlog</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select 
          value={filters.priorities?.[0] || 'all'}
          onValueChange={(value) => onFilterChange({ 
            priorities: value === 'all' ? undefined : [value as any] 
          })}
        >
          <SelectTrigger className="w-32 h-9 bg-white dark:bg-slate-800">
            <SelectValue placeholder="All Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        {/* Workstream Filter */}
        <Select 
          value={filters.workstreams?.[0] || 'all'}
          onValueChange={(value) => onFilterChange({ 
            workstreams: value === 'all' ? undefined : [value] 
          })}
        >
          <SelectTrigger className="w-40 h-9 bg-white dark:bg-slate-800">
            <SelectValue placeholder="All Workstreams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Workstreams</SelectItem>
            {workstreams.map((ws) => (
              <SelectItem key={ws.id} value={ws.id}>
                {ws.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Active Filters Count */}
        {(filters.statuses || filters.priorities || filters.workstreams) && (
          <Badge 
            variant="secondary" 
            className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
            onClick={() => onFilterChange({ 
              statuses: undefined, 
              priorities: undefined, 
              workstreams: undefined 
            })}
          >
            Clear filters ×
          </Badge>
        )}
      </div>
    </div>
  );
}
