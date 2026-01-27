// ============================================================
// MY TASKS SIDEBAR
// Planner V9: Left sidebar with view switcher, quick filters, saved filters
// ============================================================

import { useState, useMemo } from 'react';
import { 
  List, 
  LayoutGrid, 
  Calendar,
  AlertCircle,
  CalendarDays,
  CalendarPlus,
  Cloud,
  CheckCircle,
  Plus,
  Bookmark,
  Trash2,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useSavedFilters, useDeleteSavedFilter } from '../../hooks/useSavedFilters';
import { useMyTasksSummary } from '../../hooks/useMyTasks';
import type { FilterConfig, TimeSection } from '../../types/my-tasks';
import { MyTasksSidebarWrapper } from './MyTasksLayout';

type ViewMode = 'list' | 'board' | 'calendar';

interface MyTasksSidebarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  activeSection: TimeSection | null;
  onQuickFilter: (section: TimeSection | null) => void;
  filters: FilterConfig;
  onFilterChange: (filters: Partial<FilterConfig>) => void;
  onApplySavedFilter: (filter: FilterConfig) => void;
}

const QUICK_FILTERS: { id: TimeSection | 'all'; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'all' as const, label: 'All Tasks', icon: List, color: '#64748b' },
  { id: 'overdue', label: 'Overdue', icon: AlertCircle, color: '#ef4444' },
  { id: 'today', label: 'Today', icon: Calendar, color: '#f59e0b' },
  { id: 'this_week', label: 'This Week', icon: CalendarDays, color: '#3b82f6' },
  { id: 'upcoming', label: 'Upcoming', icon: CalendarPlus, color: '#8b5cf6' },
  { id: 'someday', label: 'Someday', icon: Cloud, color: '#94a3b8' },
];

export function MyTasksSidebar({
  viewMode,
  onViewModeChange,
  activeSection,
  onQuickFilter,
  filters,
  onFilterChange,
  onApplySavedFilter,
}: MyTasksSidebarProps) {
  const { data: savedFilters = [] } = useSavedFilters();
  const { data: summary } = useMyTasksSummary();
  const deleteSavedFilter = useDeleteSavedFilter();

  // Calculate daily progress
  const dailyProgress = useMemo(() => {
    if (!summary) return { completed: 0, total: 0, percentage: 0 };
    const completed = summary.completed_today || 0;
    const total = summary.today_count + completed;
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [summary]);

  const handleQuickFilterClick = (id: TimeSection | 'all') => {
    if (id === 'all') {
      onQuickFilter(null);
    } else {
      onQuickFilter(activeSection === id ? null : id);
    }
  };

  const getFilterCount = (id: TimeSection | 'all'): number => {
    if (!summary) return 0;
    switch (id) {
      case 'all': return summary.total_tasks || 0;
      case 'overdue': return summary.overdue_count || 0;
      case 'today': return summary.today_count || 0;
      case 'this_week': return summary.this_week_count || 0;
      case 'upcoming': return summary.upcoming_count || 0;
      case 'someday': return summary.someday_count || 0;
      default: return 0;
    }
  };

  return (
    <MyTasksSidebarWrapper>
      {/* View Switcher */}
      <div className="flex-shrink-0 p-4 border-b border-[var(--planner-border)]">
        <div className="flex items-center gap-1 p-1 bg-[var(--planner-bg-secondary)] rounded-lg">
          {[
            { id: 'list' as ViewMode, icon: List, label: 'List' },
            { id: 'board' as ViewMode, icon: LayoutGrid, label: 'Board' },
            { id: 'calendar' as ViewMode, icon: Calendar, label: 'Calendar' },
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => onViewModeChange(view.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all',
                viewMode === view.id
                  ? 'bg-[var(--planner-bg-primary)] text-[var(--planner-text-primary)] shadow-sm'
                  : 'text-[var(--planner-text-secondary)] hover:text-[var(--planner-text-primary)]'
              )}
            >
              <view.icon className="w-4 h-4" />
              <span className="hidden lg:inline">{view.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex-shrink-0 p-4 border-b border-[var(--planner-border)]">
        <h3 className="text-xs font-semibold text-[var(--planner-text-muted)] uppercase tracking-wider mb-3">
          Quick Filters
        </h3>
        <div className="space-y-1">
          {QUICK_FILTERS.map((filter) => {
            const isActive = filter.id === 'all' ? !activeSection : activeSection === filter.id;
            const count = getFilterCount(filter.id);
            
            return (
              <button
                key={filter.id}
                onClick={() => handleQuickFilterClick(filter.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                  isActive
                    ? 'bg-[var(--planner-primary-muted)] text-[var(--planner-primary)]'
                    : 'text-[var(--planner-text-secondary)] hover:bg-[var(--planner-bg-hover)]'
                )}
              >
                <filter.icon 
                  className="w-4 h-4" 
                  style={{ color: isActive ? 'var(--planner-primary)' : filter.color }}
                />
                <span className="flex-1 text-left">{filter.label}</span>
                {count > 0 && (
                  <span 
                    className={cn(
                      'text-xs font-medium px-1.5 py-0.5 rounded-full',
                      isActive
                        ? 'bg-[var(--planner-primary)] text-white'
                        : 'bg-[var(--planner-bg-secondary)] text-[var(--planner-text-muted)]'
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Saved Filters */}
      <div className="flex-shrink-0 p-4 border-b border-[var(--planner-border)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-[var(--planner-text-muted)] uppercase tracking-wider">
            Saved Filters
          </h3>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
        
        {savedFilters.length === 0 ? (
          <p className="text-xs text-[var(--planner-text-muted)] italic">
            No saved filters yet
          </p>
        ) : (
          <div className="space-y-1">
            {savedFilters.map((filter) => (
              <div
                key={filter.id}
                className="group flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-[var(--planner-bg-hover)] cursor-pointer"
                onClick={() => onApplySavedFilter(filter.filter_config as FilterConfig)}
              >
                <Bookmark className="w-4 h-4 text-[var(--planner-text-muted)]" />
                <span className="flex-1 text-[var(--planner-text-secondary)] truncate">
                  {filter.name}
                </span>
                {filter.is_default && (
                  <Star className="w-3.5 h-3.5 text-[var(--planner-warning)] fill-current" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSavedFilter.mutate(filter.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[var(--planner-text-muted)] hover:text-[var(--planner-danger)]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Daily Progress */}
      <div className="flex-shrink-0 p-4">
        <h3 className="text-xs font-semibold text-[var(--planner-text-muted)] uppercase tracking-wider mb-3">
          Today's Progress
        </h3>
        <div className="bg-[var(--planner-bg-secondary)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--planner-text-secondary)]">
              {dailyProgress.completed}/{dailyProgress.total} completed
            </span>
            <span className="text-sm font-semibold text-[var(--planner-text-primary)]">
              {dailyProgress.percentage}%
            </span>
          </div>
          <Progress 
            value={dailyProgress.percentage} 
            className="h-2 bg-[var(--planner-bg-active)]"
          />
          {dailyProgress.total === 0 && (
            <p className="text-xs text-[var(--planner-text-muted)] mt-2 text-center">
              No tasks due today
            </p>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Keyboard Shortcuts Hint */}
      <div className="flex-shrink-0 p-4 border-t border-[var(--planner-border)]">
        <div className="text-xs text-[var(--planner-text-muted)] space-y-1">
          <div className="flex items-center justify-between">
            <span>Quick add</span>
            <kbd className="px-1.5 py-0.5 bg-[var(--planner-bg-secondary)] rounded text-[10px]">Q</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span>Search</span>
            <kbd className="px-1.5 py-0.5 bg-[var(--planner-bg-secondary)] rounded text-[10px]">⌘K</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span>Complete</span>
            <kbd className="px-1.5 py-0.5 bg-[var(--planner-bg-secondary)] rounded text-[10px]">X</kbd>
          </div>
        </div>
      </div>
    </MyTasksSidebarWrapper>
  );
}
