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
  icon?: string;
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
  icon,
  tasks,
  selectedTasks,
  onTaskSelect,
  onOpenDetail,
  isCollapsible = true,
  defaultCollapsed = false,
}: TaskSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  if (tasks.length === 0) {
    return null;
  }

  const isMultiSelectMode = selectedTasks.size > 0;

  return (
    <div className="rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
      {/* Section Header */}
      <button
        onClick={() => isCollapsible && setIsCollapsed(!isCollapsed)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 transition-colors bg-slate-50 dark:bg-slate-800/80',
          isCollapsible ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50' : 'cursor-default'
        )}
        disabled={!isCollapsible}
      >
        {/* Collapse Icon */}
        {isCollapsible && (
          isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          )
        )}
        
        {/* Color/Icon Indicator */}
        {icon ? (
          <span className="text-base">{icon}</span>
        ) : (
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        
        {/* Title */}
        <span 
          className="font-semibold text-slate-900 dark:text-slate-100"
          style={{ color }}
        >
          {title}
        </span>
        
        {/* Count */}
        <span className="text-sm text-slate-400 dark:text-slate-500 font-medium">
          {tasks.length}
        </span>
      </button>

      {/* Task Rows */}
      {!isCollapsed && (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
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
