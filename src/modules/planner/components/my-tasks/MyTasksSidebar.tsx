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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSavedFilters, useDeleteSavedFilter } from '../../hooks/useSavedFilters';
import { useMyTasksSummary } from '../../hooks/useMyTasks';
import type { FilterConfig, TimeSection } from '../../types/my-tasks';
import { MyTasksSidebarWrapper } from './MyTasksLayout';
import { MiniCalendar, DailyGoal } from './widgets';

type ViewMode = 'list' | 'board' | 'calendar';

interface MyTasksSidebarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  activeSection: TimeSection | null;
  onQuickFilter: (section: TimeSection | null) => void;
  filters: FilterConfig;
  onFilterChange: (filters: Partial<FilterConfig>) => void;
  onApplySavedFilter: (filter: FilterConfig) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const TIME_SECTIONS: { id: TimeSection | 'all'; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'all' as const, label: 'All Tasks', icon: List, color: '#64748b' },
  { id: 'overdue', label: 'Overdue', icon: AlertCircle, color: '#ef4444' },
  { id: 'today', label: 'Today', icon: Calendar, color: '#f59e0b' },
  { id: 'this_week', label: 'This Week', icon: CalendarDays, color: '#3b82f6' },
  { id: 'upcoming', label: 'Upcoming', icon: CalendarPlus, color: '#8b5cf6' },
  { id: 'someday', label: 'Someday/Maybe', icon: Cloud, color: '#94a3b8' },
];

export function MyTasksSidebar({
  viewMode,
  onViewModeChange,
  activeSection,
  onQuickFilter,
  filters,
  onFilterChange,
  onApplySavedFilter,
  isCollapsed = false,
  onToggleCollapse,
}: MyTasksSidebarProps) {
  const { data: savedFilters = [] } = useSavedFilters();
  const { data: summary } = useMyTasksSummary();
  const deleteSavedFilter = useDeleteSavedFilter();

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

  // Mock task dates for calendar
  const taskDates = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    // Add some sample dates
    dates.push(new Date(today.getFullYear(), today.getMonth(), 6));
    dates.push(new Date(today.getFullYear(), today.getMonth(), 13));
    dates.push(new Date(today.getFullYear(), today.getMonth(), 20));
    dates.push(new Date(today.getFullYear(), today.getMonth(), 21));
    dates.push(new Date(today.getFullYear(), today.getMonth(), 22));
    dates.push(new Date(today.getFullYear(), today.getMonth(), 23));
    return dates;
  }, []);

  return (
    <MyTasksSidebarWrapper>
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <span className="font-semibold text-slate-900 dark:text-slate-100 uppercase text-xs tracking-wider">
          My Tasks
        </span>
        {onToggleCollapse && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={onToggleCollapse}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* View Switcher */}
      <div className="flex-shrink-0 p-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {[
            { id: 'list' as ViewMode, icon: List, label: 'List' },
            { id: 'board' as ViewMode, icon: LayoutGrid, label: 'Board' },
            { id: 'calendar' as ViewMode, icon: Calendar, label: 'Calendar' },
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => onViewModeChange(view.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-all',
                viewMode === view.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              <view.icon className="w-4 h-4" />
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Time Sections */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-2">
            Time Sections
          </h3>
          <div className="space-y-0.5">
            {TIME_SECTIONS.map((section) => {
              const isActive = section.id === 'all' ? !activeSection : activeSection === section.id;
              const count = getFilterCount(section.id);
              
              return (
                <button
                  key={section.id}
                  onClick={() => handleQuickFilterClick(section.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  )}
                >
                  <section.icon 
                    className="w-4 h-4" 
                    style={{ color: isActive ? undefined : section.color }}
                  />
                  <span className="flex-1 text-left">{section.label}</span>
                  <span 
                    className={cn(
                      'text-xs font-semibold min-w-[20px] text-center',
                      isActive
                        ? 'text-blue-600 dark:text-blue-300'
                        : 'text-slate-400 dark:text-slate-500'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Saved Filters */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2 px-2">
            <h3 className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Saved Filters
            </h3>
          </div>
          
          {savedFilters.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic px-2">
              No saved filters yet
            </p>
          ) : (
            <div className="space-y-0.5">
              {savedFilters.slice(0, 3).map((filter) => (
                <div
                  key={filter.id}
                  className="group flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer"
                  onClick={() => onApplySavedFilter(filter.filter_config as FilterConfig)}
                >
                  <span 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: '#ef4444' }}
                  />
                  <span className="flex-1 text-slate-600 dark:text-slate-300 truncate">
                    {filter.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Daily Goal */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-700">
          <DailyGoal />
        </div>

        {/* Mini Calendar */}
        <div className="p-3">
          <MiniCalendar taskDates={taskDates} />
        </div>
      </div>
    </MyTasksSidebarWrapper>
  );
}
