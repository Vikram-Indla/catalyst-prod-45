// ============================================================
// TASK SECTION
// Planner V9: Time-grouped section with collapsible header
// ============================================================

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskRow } from './TaskRow';
import type { MyTask } from '../../types/my-tasks';

interface TaskSectionProps {
  title: string;
  color: string;
  tasks: MyTask[];
  selectedTasks: Set<string>;
  onTaskSelect: (taskId: string, isMultiSelect: boolean) => void;
  onOpenDetail: (taskId: string) => void;
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function TaskSection({
  title,
  color,
  tasks,
  selectedTasks,
  onTaskSelect,
  onOpenDetail,
  isCollapsible = false,
  defaultCollapsed = false,
}: TaskSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  if (tasks.length === 0) {
    return null;
  }

  const isMultiSelectMode = selectedTasks.size > 0;

  return (
    <div className="rounded-lg border border-[var(--planner-border)] overflow-hidden bg-[var(--planner-bg-primary)]">
      {/* Section Header */}
      <button
        onClick={() => isCollapsible && setIsCollapsed(!isCollapsed)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 transition-colors',
          isCollapsible ? 'cursor-pointer hover:bg-[var(--planner-bg-hover)]' : 'cursor-default'
        )}
        disabled={!isCollapsible}
      >
        {isCollapsible && (
          isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-[var(--planner-text-muted)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--planner-text-muted)]" />
          )
        )}
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="font-medium text-[var(--planner-text-primary)]">
          {title}
        </span>
        <span className="text-sm text-[var(--planner-text-muted)]">
          ({tasks.length})
        </span>
      </button>

      {/* Task Rows */}
      {!isCollapsed && (
        <div className="divide-y divide-[var(--planner-border)]">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              isSelected={selectedTasks.has(task.id)}
              isMultiSelectMode={isMultiSelectMode}
              onSelect={onTaskSelect}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </div>
      )}
    </div>
  );
}
