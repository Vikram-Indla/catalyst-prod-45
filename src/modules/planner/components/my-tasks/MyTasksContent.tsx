// ============================================================
// MY TASKS CONTENT
// Planner V9: Main content area with action bar and task sections
// ============================================================

import { useMemo, useCallback } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMyTasks } from '../../hooks/useMyTasks';
import { MyTasksContentWrapper } from './MyTasksLayout';
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
}

// Order for time sections
const SECTION_ORDER: TimeSection[] = ['overdue', 'today', 'this_week', 'upcoming', 'someday', 'completed'];

const SECTION_LABELS: Record<TimeSection, string> = {
  overdue: 'Overdue',
  today: 'Today',
  this_week: 'This Week',
  upcoming: 'Upcoming',
  someday: 'Someday',
  completed: 'Completed',
};

const SECTION_COLORS: Record<TimeSection, string> = {
  overdue: '#ef4444',
  today: '#f59e0b',
  this_week: '#3b82f6',
  upcoming: '#8b5cf6',
  someday: '#94a3b8',
  completed: '#10b981',
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

  const handleSearchChange = useCallback((value: string) => {
    onFilterChange({ searchQuery: value || undefined });
  }, [onFilterChange]);

  const handleClearSearch = useCallback(() => {
    onFilterChange({ searchQuery: undefined });
  }, [onFilterChange]);

  const isMultiSelectMode = selectedTasks.size > 0;

  return (
    <MyTasksContentWrapper>
      {/* Bulk Action Toolbar (when tasks selected) */}
      {isMultiSelectMode && (
        <BulkActionToolbar
          selectedIds={selectedTasks}
          onClear={onClearSelection}
          onComplete={onBulkComplete}
        />
      )}

      {/* Action Bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-6 py-3 border-b border-[var(--planner-border)]">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--planner-text-muted)]" />
          <Input
            type="text"
            placeholder="Search tasks..."
            value={filters.searchQuery || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-8 bg-[var(--planner-bg-secondary)] border-[var(--planner-border)]"
          />
          {filters.searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--planner-text-muted)] hover:text-[var(--planner-text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Active Filters */}
        {filters.priorities?.length ? (
          <Badge variant="secondary" className="gap-1">
            Priority: {filters.priorities.join(', ')}
            <button onClick={() => onFilterChange({ priorities: undefined })}>
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ) : null}

        {filters.workstreams?.length ? (
          <Badge variant="secondary" className="gap-1">
            Workstream: {filters.workstreams.length}
            <button onClick={() => onFilterChange({ workstreams: undefined })}>
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ) : null}

        <div className="flex-1" />

        {/* Quick Add */}
        <Button onClick={onOpenCreateModal} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Task
        </Button>
      </div>

      {/* Task Sections */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-[var(--planner-text-muted)]">Loading tasks...</div>
          </div>
        ) : visibleSections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--planner-bg-secondary)] flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-[var(--planner-text-muted)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--planner-text-primary)] mb-1">
              No tasks found
            </h3>
            <p className="text-sm text-[var(--planner-text-muted)] max-w-sm">
              {filters.searchQuery
                ? `No tasks match "${filters.searchQuery}"`
                : 'You have no tasks yet. Create your first task to get started.'}
            </p>
            {!filters.searchQuery && (
              <Button onClick={onOpenCreateModal} className="mt-4 gap-2">
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
                title={SECTION_LABELS[section]}
                color={SECTION_COLORS[section]}
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
