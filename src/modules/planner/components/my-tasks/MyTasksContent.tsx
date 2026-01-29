// ============================================================
// MY TASKS CONTENT - Enterprise Clean V1
// Sections: Overdue → Today → This Week → Later
// Uses mytasks-enterprise-clean CSS override
// ============================================================

import { useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import { useMyTasks } from '../../hooks/useMyTasks';
import { MyTasksHeader } from './MyTasksHeader';
import { TaskSection } from './TaskSection';
import type { FilterConfig, TimeSection, MyTask } from '../../types/my-tasks';
// Import Enterprise Clean override styles
import '@/styles/mytasks-enterprise-clean.css';

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
    <div className="mytasks-enterprise-clean flex flex-col h-full" data-component="mytasks">
      {/* Header with KPIs and Filters */}
      <MyTasksHeader
        filters={filters}
        onFilterChange={onFilterChange}
        onOpenCreateModal={onOpenCreateModal}
      />

      {/* Task Sections - Enterprise Clean cards */}
      <div className="mt-content">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visibleSections.length === 0 ? (
          <div className="mt-empty-state">
            <div className="mt-empty-icon">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="mt-empty-title">No tasks found</h3>
            <p className="mt-empty-text">
              {filters.searchQuery
                ? `No tasks match "${filters.searchQuery}"`
                : 'You have no tasks yet. Create your first task to get started.'}
            </p>
            {!filters.searchQuery && (
              <button 
                onClick={onOpenCreateModal} 
                className="mt-btn-primary mt-4"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </button>
            )}
          </div>
        ) : (
          <div>
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
