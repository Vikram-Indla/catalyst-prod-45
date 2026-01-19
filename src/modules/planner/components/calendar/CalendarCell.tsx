// ============================================================
// CALENDAR CELL
// Individual day cell with tasks, drop zone, quick add
// ============================================================

import { useState } from 'react';
import { format, isBefore, startOfDay } from 'date-fns';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalendarTaskEvent } from './CalendarTaskEvent';
import type { PlannerTask } from '../../types';

interface CalendarCellProps {
  date: Date;
  tasks: PlannerTask[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isSelected: boolean;
  onTaskClick: (task: PlannerTask) => void;
  onDateClick: () => void;
  onTaskDrop: (taskId: string) => void;
  onQuickAdd: () => void;
}

const MAX_VISIBLE_TASKS = 3;

export function CalendarCell({
  date,
  tasks,
  isCurrentMonth,
  isToday,
  isWeekend,
  isSelected,
  onTaskClick,
  onDateClick,
  onTaskDrop,
  onQuickAdd,
}: CalendarCellProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const visibleTasks = tasks.slice(0, MAX_VISIBLE_TASKS);
  const remainingCount = tasks.length - MAX_VISIBLE_TASKS;

  // Check if any tasks are overdue
  const today = startOfDay(new Date());
  const hasOverdueTasks = tasks.some(
    t => t.dueDate && isBefore(startOfDay(new Date(t.dueDate)), today) && t.status !== 'done'
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only trigger leave if we're actually leaving the cell
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onTaskDrop(taskId);
    }
  };

  return (
    <div
      onClick={onDateClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "min-h-[120px] p-2 border-r border-b border-border/50 transition-all group cursor-pointer",
        // Base colors
        !isCurrentMonth && "bg-surface-1/50",
        isCurrentMonth && !isWeekend && "bg-surface-0",
        isWeekend && isCurrentMonth && "bg-surface-1/30",
        // Today highlight
        isToday && "bg-blue-50 dark:bg-blue-950/20",
        // Selected
        isSelected && "ring-2 ring-inset ring-blue-500",
        // Overdue cell background
        hasOverdueTasks && !isToday && "bg-red-50/50 dark:bg-red-950/10",
        // Drag over state
        isDragOver && "bg-blue-100 dark:bg-blue-900/30 ring-2 ring-dashed ring-blue-400"
      )}
    >
      {/* Day Header */}
      <div className="flex items-center justify-between mb-1.5">
        <span
          className={cn(
            "text-sm font-medium transition-all",
            !isCurrentMonth && "text-text-muted",
            isCurrentMonth && "text-text-secondary",
            // Today: blue circle badge
            isToday && "w-7 h-7 flex items-center justify-center bg-blue-500 text-white rounded-full font-semibold"
          )}
        >
          {format(date, 'd')}
        </span>
        
        {/* Quick Add Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd();
          }}
          className="w-5 h-5 flex items-center justify-center rounded text-text-muted hover:bg-surface-2 hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity"
          title="Quick add task"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tasks */}
      <div className="space-y-1">
        {visibleTasks.map((task) => (
          <CalendarTaskEvent
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
          />
        ))}

        {/* Overflow Indicator */}
        {remainingCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDateClick();
            }}
            className="w-full px-2 py-0.5 text-xs font-medium text-text-muted hover:bg-surface-2 rounded transition-colors text-left"
          >
            +{remainingCount} more
          </button>
        )}
      </div>
    </div>
  );
}
