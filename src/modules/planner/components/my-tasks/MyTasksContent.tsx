// ============================================================
// MY TASKS CONTENT - Dashboard Style (Planner V9 Aligned)
// Sections: Overdue → Today → This Week → Later
// ============================================================

import { useMemo, useState, useCallback } from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMyTasks } from '../../hooks/useMyTasks';
import { MyTasksHeader } from './MyTasksHeader';
import { TaskSection } from './TaskSection';
import type { FilterConfig, TimeSection, MyTask } from '../../types/my-tasks';

interface MyTasksContentProps {
  filters: FilterConfig;
  onFilterChange: (filters: Partial<FilterConfig>) => void;
  onOpenCreateModal: () => void;
  onOpenTaskDetail: (taskId: string) => void;
}

// Per justification: Overdue → Today → This Week → Later
const SECTION_ORDER: TimeSection[] = ['overdue', 'today', 'this_week', 'upcoming'];

const SECTION_CONFIG: Record<TimeSection, { label: string; color: string }> = {
  overdue: { label: 'Overdue', color: '#ef4444' },
  today: { label: 'Today', color: '#f59e0b' },
  this_week: { label: 'This Week', color: '#3b82f6' },
  upcoming: { label: 'Later', color: '#8b5cf6' },
  someday: { label: 'Later', color: '#94a3b8' },
  completed: { label: 'Completed', color: '#10b981' },
};

export function MyTasksContent({
  filters,
  onFilterChange,
  onOpenCreateModal,
  onOpenTaskDetail,
}: MyTasksContentProps) {
  const { data: tasks = [], isLoading, refetch } = useMyTasks(filters);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 800);
  }, [refetch]);

  // Group tasks by time section
  const tasksBySection = useMemo(() => {
    const grouped: Record<TimeSection, MyTask[]> = {
      overdue: [],
      today: [],
      this_week: [],
      upcoming: [],
      someday: [],
      completed: [],
    };

    tasks.forEach((task) => {
      const section = task.time_section as TimeSection;
      // Merge someday into upcoming (Later)
      if (section === 'someday') {
        grouped.upcoming.push(task);
      } else if (grouped[section]) {
        grouped[section].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  // Only show non-empty sections
  const visibleSections = useMemo(() => {
    return SECTION_ORDER.filter(
      (section) => tasksBySection[section].length > 0
    );
  }, [tasksBySection]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* Header with Stats and Filters - Dashboard Style */}
      <MyTasksHeader
        filters={filters}
        onFilterChange={onFilterChange}
        onOpenCreateModal={onOpenCreateModal}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Task Sections - Dashboard content area style */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visibleSections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
              <Search className="w-6 h-6 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
              No tasks found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-4">
              {filters.searchQuery
                ? `No tasks match "${filters.searchQuery}"`
                : 'You have no tasks yet. Create your first task to get started.'}
            </p>
            {!filters.searchQuery && (
              <Button 
                onClick={onOpenCreateModal} 
                size="sm"
                className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Task
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {visibleSections.map((section) => (
              <TaskSection
                key={section}
                title={SECTION_CONFIG[section].label}
                color={SECTION_CONFIG[section].color}
                tasks={tasksBySection[section]}
                onOpenDetail={onOpenTaskDetail}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
