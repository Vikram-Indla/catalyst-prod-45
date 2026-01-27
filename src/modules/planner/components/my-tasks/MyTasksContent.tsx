// ============================================================
// MY TASKS CONTENT
// Planner V9: Main content area with task sections
// ============================================================

import { useMemo, useCallback } from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMyTasks } from '../../hooks/useMyTasks';
import { MyTasksContentWrapper } from './MyTasksLayout';
import { MyTasksHeader } from './MyTasksHeader';
import { TaskSection } from './TaskSection';
import { BulkActionToolbar } from './BulkActionToolbar';
import type { FilterConfig, TimeSection, MyTask } from '../../types/my-tasks';

interface MyTasksContentProps {
  filters: FilterConfig;
  onFilterChange: (filters: Partial<FilterConfig>) => void;
  selectedTasks: Set<string>;
  onTaskSelect: (taskId: string, isMultiSelect: boolean) => void;
  onBulkComplete: () => void;
  onClearSelection: () => void;
  onOpenCreateModal: () => void;
  onOpenTaskDetail: (taskId: string) => void;
  onToggleFocusMode?: () => void;
  isFocusModeActive?: boolean;
}

// Order for time sections
const SECTION_ORDER: TimeSection[] = ['overdue', 'today', 'this_week', 'upcoming', 'someday', 'completed'];

const SECTION_CONFIG: Record<TimeSection, { label: string; color: string; icon: string }> = {
  overdue: { label: 'Overdue', color: '#ef4444', icon: '🔴' },
  today: { label: 'Today', color: '#f59e0b', icon: '🟡' },
  this_week: { label: 'This Week', color: '#3b82f6', icon: '📅' },
  upcoming: { label: 'Upcoming', color: '#8b5cf6', icon: '📆' },
  someday: { label: 'Someday', color: '#94a3b8', icon: '✨' },
  completed: { label: 'Completed', color: '#10b981', icon: '✅' },
};

export function MyTasksContent({
  filters,
  onFilterChange,
  selectedTasks,
  onTaskSelect,
  onBulkComplete,
  onClearSelection,
  onOpenCreateModal,
  onOpenTaskDetail,
  onToggleFocusMode,
  isFocusModeActive,
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
      if (grouped[section]) {
        grouped[section].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  // Visible sections (non-empty or actively filtered)
  const visibleSections = useMemo(() => {
    if (filters.timeSection) {
      return [filters.timeSection];
    }
    return SECTION_ORDER.filter(
      (section) => tasksBySection[section].length > 0
    );
  }, [tasksBySection, filters.timeSection]);

  const isMultiSelectMode = selectedTasks.size > 0;

  return (
    <MyTasksContentWrapper>
      {/* Header with Stats and Filters */}
      <MyTasksHeader
        filters={filters}
        onFilterChange={onFilterChange}
        onOpenCreateModal={onOpenCreateModal}
        onToggleFocusMode={onToggleFocusMode || (() => {})}
        isFocusModeActive={isFocusModeActive}
      />

      {/* Bulk Action Toolbar (when tasks selected) */}
      {isMultiSelectMode && (
        <BulkActionToolbar
          selectedIds={selectedTasks}
          onClear={onClearSelection}
          onComplete={onBulkComplete}
        />
      )}

      {/* Task Sections */}
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
              <Button onClick={onOpenCreateModal} className="mt-4 gap-2 bg-orange-500 hover:bg-orange-600">
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
                icon={SECTION_CONFIG[section].icon}
                tasks={tasksBySection[section]}
                selectedTasks={selectedTasks}
                onTaskSelect={onTaskSelect}
                onOpenDetail={onOpenTaskDetail}
                isCollapsible={section === 'completed'}
                defaultCollapsed={section === 'completed'}
              />
            ))}
          </div>
        )}
      </div>
    </MyTasksContentWrapper>
  );
}
