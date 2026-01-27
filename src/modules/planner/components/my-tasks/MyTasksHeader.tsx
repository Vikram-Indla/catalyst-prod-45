// ============================================================
// MY TASKS HEADER - Dashboard Style (Planner V9 Aligned)
// Matches PlannerDashboard header structure
// ============================================================

import { useState } from 'react';
import { Plus, Search, CheckSquare, RefreshCw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMyTasksSummary } from '../../hooks/useMyTasks';
import { usePlannerWorkstreams } from '../../hooks/usePlannerWorkstreams';
import { cn } from '@/lib/utils';
import type { FilterConfig } from '../../types/my-tasks';

interface MyTasksHeaderProps {
  filters: FilterConfig;
  onFilterChange: (filters: Partial<FilterConfig>) => void;
  onOpenCreateModal: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function MyTasksHeader({
  filters,
  onFilterChange,
  onOpenCreateModal,
  onRefresh,
  isRefreshing = false,
}: MyTasksHeaderProps) {
  const { data: summary, isLoading } = useMyTasksSummary();
  const { data: workstreams = [] } = usePlannerWorkstreams();
  const [dateRange, setDateRange] = useState('this-week');
  const [lastUpdated] = useState<Date>(new Date());

  // Format last updated time
  const formatLastUpdated = () => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Stats chips: Overdue, Today, Done
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
    <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      {/* ROW 1: Header - Dashboard style */}
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          {/* Icon container - Dashboard style */}
          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <CheckSquare className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            My Tasks
          </h1>
          
          {/* Stats Chips */}
          <div className="flex items-center gap-2 ml-4">
            {statsChips.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                style={{ 
                  backgroundColor: stat.bgColor,
                  color: stat.color,
                  borderColor: `${stat.color}30`,
                }}
              >
                <span 
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: stat.color }}
                />
                <span className="font-semibold">{isLoading ? '...' : stat.value}</span>
                <span className="opacity-75">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Date range selector - Dashboard style */}
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-sprint">This Sprint</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Last updated indicator */}
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Updated {formatLastUpdated()}
          </span>
          
          {/* Refresh button - Dashboard style */}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="gap-1.5 h-8 text-xs"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          )}

          {/* Add Task Button */}
          <Button 
            size="sm"
            className="gap-1.5 h-8 text-xs bg-blue-600 hover:bg-blue-700"
            onClick={onOpenCreateModal}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Task
          </Button>
        </div>
      </div>

      {/* ROW 2: Search + Filters */}
      <div className="flex items-center gap-3 px-6 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
        {/* Search Input */}
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search tasks..."
            value={filters.searchQuery || ''}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value || undefined })}
            className="pl-9 h-8 text-xs bg-white dark:bg-slate-800"
          />
        </div>

        {/* Workstream Dropdown */}
        <Select 
          value={filters.workstreams?.[0] || 'all'}
          onValueChange={(value) => onFilterChange({ 
            workstreams: value === 'all' ? undefined : [value] 
          })}
        >
          <SelectTrigger className="w-36 h-8 text-xs bg-white dark:bg-slate-800">
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

        {/* Status Dropdown */}
        <Select 
          value={filters.statuses?.[0] || 'all'}
          onValueChange={(value) => onFilterChange({ 
            statuses: value === 'all' ? undefined : [value] 
          })}
        >
          <SelectTrigger className="w-28 h-8 text-xs bg-white dark:bg-slate-800">
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

        {/* Clear Filters */}
        {(filters.statuses || filters.workstreams || filters.searchQuery) && (
          <button
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            onClick={() => onFilterChange({ 
              statuses: undefined, 
              workstreams: undefined,
              searchQuery: undefined,
            })}
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
