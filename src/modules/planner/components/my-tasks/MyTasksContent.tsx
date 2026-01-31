// ============================================================
// MY TASKS CONTENT - Enterprise Linear-Aligned V2
// Ring-fenced CSS: mytasks-page, mytasks-container, etc.
// Sections: Overdue → Today → This Week → Later → Completed Today
// ============================================================

import { useMemo, useEffect } from 'react';
import { Plus, Layers } from 'lucide-react';
import { useMyTasks } from '../../hooks/useMyTasks';
import { useMyTasksUndo } from '../../hooks/useMyTasksUndo';
import { useUncompleteMyTask } from '../../hooks/useUncompleteMyTask';
import { MyTasksHeader } from './MyTasksHeader';
import { TaskSection } from './TaskSection';
import { CompletedTodaySection } from './CompletedTodaySection';
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

// Check if task was completed today
function isCompletedToday(completedAt: string | null): boolean {
  if (!completedAt) return false;
  const completed = new Date(completedAt);
  const today = new Date();
  return completed.toDateString() === today.toDateString();
}

export function MyTasksContent({
  filters,
  onFilterChange,
  onOpenCreateModal,
  onOpenTaskDetail,
}: MyTasksContentProps) {
  const { data: tasks = [], isLoading } = useMyTasks(filters);
  const { popUndo, clearExpired } = useMyTasksUndo();
  const uncompleteTask = useUncompleteMyTask();

  // Keyboard shortcut: Cmd+Z for undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        const action = popUndo();
        if (action && action.type === 'complete') {
          uncompleteTask.mutate({
            taskId: action.taskId,
            originalSection: action.originalSection,
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [popUndo, uncompleteTask]);

  // Clear expired undo actions periodically
  useEffect(() => {
    const interval = setInterval(clearExpired, 10000);
    return () => clearInterval(interval);
  }, [clearExpired]);

  // Group tasks by time section including completed today
  const tasksBySection = useMemo(() => {
    const grouped: Record<TimeSection | 'completedToday', MyTask[]> = {
      overdue: [],
      today: [],
      this_week: [],
      upcoming: [],
      someday: [],
      completed: [],
      completedToday: [],
    };

    tasks.forEach((task) => {
      // Check if it's a task completed today
      if (task.status_is_done && isCompletedToday(task.completed_at)) {
        grouped.completedToday.push(task);
        return;
      }

      // Skip other completed tasks (not today)
      if (task.status_is_done) {
        return;
      }

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
        completedTodayCount={tasksBySection.completedToday.length}
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
          ) : visibleSections.length === 0 && tasksBySection.completedToday.length === 0 ? (
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
              {/* Active task sections */}
              {visibleSections.map((section) => (
                <TaskSection
                  key={section}
                  title={SECTION_CONFIG[section].label}
                  color={SECTION_CONFIG[section].color}
                  tasks={tasksBySection[section]}
                  onOpenDetail={onOpenTaskDetail}
                />
              ))}

              {/* Completed Today Section */}
              <CompletedTodaySection
                tasks={tasksBySection.completedToday}
                onOpenDetail={onOpenTaskDetail}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
