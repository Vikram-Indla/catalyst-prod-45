// ============================================================
// MY TASKS CONTENT
// Per Justification Matrix:
// KEPT: Sections (Overdue, Today, This Week, Later), Task Rows
// Grouped by time urgency, single column scan
// ============================================================

import { useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMyTasks } from '../../hooks/useMyTasks';
import { MyTasksContentWrapper } from './MyTasksLayout';
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
// "completed" section moved to Later or hidden
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
  const { data: tasks = [], isLoading } = useMyTasks(filters);

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
    <MyTasksContentWrapper>
      {/* Header with Stats and Filters */}
      <MyTasksHeader
        filters={filters}
        onFilterChange={onFilterChange}
        onOpenCreateModal={onOpenCreateModal}
      />

      {/* Task Sections - Single column scan */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-400 dark:text-slate-500">Loading tasks...</div>
          </div>
        ) : visibleSections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
              No tasks found
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              {filters.searchQuery
                ? `No tasks match "${filters.searchQuery}"`
                : 'You have no tasks yet. Create your first task to get started.'}
            </p>
            {!filters.searchQuery && (
            <Button onClick={onOpenCreateModal} className="mt-4 gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Create Task
            </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
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
    </MyTasksContentWrapper>
  );
}
