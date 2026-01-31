// ============================================================
// MY TASKS CONTENT - Enterprise Linear-Aligned V2
// Ring-fenced CSS: mytasks-page, mytasks-container, etc.
// Sections: Overdue → Today → This Week → Later
// ============================================================

import { useMemo } from 'react';
import { Search, Plus, Layers } from 'lucide-react';
import { useMyTasks } from '../../hooks/useMyTasks';
import { MyTasksHeader } from './MyTasksHeader';
import { TaskSection } from './TaskSection';
import type { FilterConfig, TimeSection, MyTask } from '../../types/my-tasks';
// Import ring-fenced CSS
import '@/styles/mytasks.css';

interface MyTasksContentProps {
  filters: FilterConfig;
  onFilterChange: (filters: Partial<FilterConfig>) => void;
  onOpenCreateModal: () => void;
  onOpenTaskDetail: (taskId: string) => void;
}

// Per spec: Overdue → Today → This Week → Later
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
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* Header with KPIs and Toolbar - Edge-to-edge like Dashboard */}
      <MyTasksHeader
        filters={filters}
        onFilterChange={onFilterChange}
        onOpenCreateModal={onOpenCreateModal}
      />

      {/* Content Area - Scrollable with padding */}
      <div className="flex-1 overflow-auto p-6 lg:px-8">
        {/* Task Container */}
        <div className="mytasks-container">
          {isLoading ? (
            <div className="mytasks-loading">
              <div className="mytasks-loading__spinner" />
              Loading tasks...
            </div>
          ) : visibleSections.length === 0 ? (
            <div className="mytasks-empty">
              <Layers className="mytasks-empty__icon" />
              <h3 className="mytasks-empty__title">No tasks found</h3>
              <p className="mytasks-empty__description">
                {filters.searchQuery
                  ? `No tasks match "${filters.searchQuery}"`
                  : 'You have no tasks yet. Create your first task to get started.'}
              </p>
              {!filters.searchQuery && (
                <button 
                  onClick={onOpenCreateModal} 
                  className="mytasks-add-btn mt-4"
                >
                  <Plus className="w-4 h-4" />
                  Add Task
                </button>
              )}
            </div>
          ) : (
            <>
              {visibleSections.map((section) => (
                <TaskSection
                  key={section}
                  title={SECTION_CONFIG[section].label}
                  color={SECTION_CONFIG[section].color}
                  tasks={tasksBySection[section]}
                  onOpenDetail={onOpenTaskDetail}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
