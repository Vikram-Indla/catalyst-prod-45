// ============================================================
// MY TASKS HEADER - V8 Design System (Budget Planner Aligned)
// Matches Budget Planner 2-row header structure
// ============================================================

import { Plus, Search, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
}

export function MyTasksHeader({
  filters,
  onFilterChange,
  onOpenCreateModal,
}: MyTasksHeaderProps) {
  const { data: summary, isLoading } = useMyTasksSummary();
  const { data: workstreams = [] } = usePlannerWorkstreams();

  // Stats chips per justification: Overdue, Today, Done
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
    <div className="flex-shrink-0 bg-card border-b border-border">
      {/* ROW 1: Breadcrumb + Title + Stats + Action (matches Budget Planner) */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-border/40">
        {/* Left: Title + Stats Inline */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-0.5">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">Planner / Personal</span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-medium text-blue-600">My Tasks</span>
            </div>
            
            {/* Title */}
            <h1 className="text-2xl font-bold text-slate-900 dark:text-[var(--text-primary)] tracking-tight">
              My Tasks
            </h1>
          </div>
          
          {/* Stats Chips - Inline with title (Budget Planner style) */}
          <div className="flex items-center gap-2">
            {statsChips.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border"
                style={{ 
                  backgroundColor: stat.bgColor,
                  color: stat.color,
                  borderColor: `${stat.color}30`,
                }}
              >
                <span 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: stat.color }}
                />
                <span className="font-semibold">{isLoading ? '...' : stat.value}</span>
                <span className="text-xs opacity-75">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Add Task Button */}
        <Button 
          className="gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-md"
          onClick={onOpenCreateModal}
        >
          <Plus className="w-4 h-4" />
          Add Task
        </Button>
      </div>

      {/* ROW 2: Search + Filters (matches Budget Planner style) */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/40">
        {/* Search - Budget Planner style */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search tasks..."
            value={filters.searchQuery || ''}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value || undefined })}
            className="w-56 h-10 pl-10 pr-3 text-sm bg-slate-100 border-slate-200 rounded-xl focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Filter Strip - Right Aligned (matches Budget Planner hero tabs style) */}
        <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1.5 border border-slate-200">
          {/* Workstream Dropdown */}
          <Select 
            value={filters.workstreams?.[0] || 'all'}
            onValueChange={(value) => onFilterChange({ 
              workstreams: value === 'all' ? undefined : [value] 
            })}
          >
            <SelectTrigger className="w-40 h-9 bg-white border-slate-200 rounded-lg text-sm font-medium">
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
            <SelectTrigger className="w-32 h-9 bg-white border-slate-200 rounded-lg text-sm font-medium">
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
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all"
              onClick={() => onFilterChange({ 
                statuses: undefined, 
                workstreams: undefined,
                searchQuery: undefined,
              })}
            >
              Clear ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
