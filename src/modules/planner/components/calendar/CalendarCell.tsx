// ============================================================
// CALENDAR CELL V2
// Individual day cell with TaskPillV2, context menu, drop zone
// ============================================================

import { useState, useCallback } from 'react';
import { format, isBefore, startOfDay, getWeek } from 'date-fns';
import { Plus, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskPillV2 } from './TaskPillV2';
import { TaskContextMenu } from './TaskContextMenu';
import type { PlannerTask } from '../../types';
import '../../styles/planner-calendar.css';

interface CalendarCellProps {
  date: Date;
  tasks: PlannerTask[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isSelected: boolean;
  isFocused?: boolean;
  onTaskClick: (task: PlannerTask) => void;
  onDateClick: () => void;
  onTaskDrop: (taskId: string) => void;
  onQuickAdd: () => void;
  onTaskAction?: (action: string, task: PlannerTask, payload?: any) => void;
  statuses?: { id: string; name: string; color: string }[];
  users?: { id: string; name: string; initials: string }[];
}

const MAX_VISIBLE_TASKS = 3;

export function CalendarCell({
  date,
  tasks,
  isCurrentMonth,
  isToday,
  isWeekend,
  isSelected,
  isFocused = false,
  onTaskClick,
  onDateClick,
  onTaskDrop,
  onQuickAdd,
  onTaskAction,
  statuses = [],
  users = [],
}: CalendarCellProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ task: PlannerTask; x: number; y: number } | null>(null);

  const visibleTasks = tasks.slice(0, MAX_VISIBLE_TASKS);
  const remainingCount = tasks.length - MAX_VISIBLE_TASKS;
  const remainingTasks = tasks.slice(MAX_VISIBLE_TASKS);

  // Check if any tasks are overdue
  const today = startOfDay(new Date());
  const hasOverdueTasks = tasks.some(
    t => t.dueDate && isBefore(startOfDay(new Date(t.dueDate)), today) && t.status !== 'done'
  );

  // Task count badge
  const taskCount = tasks.length;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
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

  const handleContextMenu = useCallback((e: React.MouseEvent, task: PlannerTask) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ task, x: e.clientX, y: e.clientY });
  }, []);

  const handleContextMenuAction = useCallback((action: string, payload?: any) => {
    if (contextMenu && onTaskAction) {
      onTaskAction(action, contextMenu.task, payload);
    }
    setContextMenu(null);
  }, [contextMenu, onTaskAction]);

  // Get week number for first day of week
  const isFirstDayOfWeek = date.getDay() === 0;
  const weekNumber = isFirstDayOfWeek ? getWeek(date) : null;

  return (
    <>
      <div
        onClick={onDateClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        tabIndex={0}
        className={cn(
          "planner-calendar-content min-h-[120px] p-2 border-r border-b transition-all group cursor-pointer relative",
          "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500",
          // Base colors using ring-fenced tokens
          !isCurrentMonth && "bg-[var(--pln-cal-surface-adjacent)] opacity-60",
          isCurrentMonth && !isWeekend && "bg-[var(--pln-cal-surface-card)]",
          isWeekend && isCurrentMonth && "bg-[var(--pln-cal-surface-weekend)]",
          // Border color
          "border-[var(--pln-cal-border-light)]",
          // Today highlight - full cell background
          isToday && "bg-[var(--pln-cal-surface-today)] ring-2 ring-inset ring-blue-400",
          // Selected
          isSelected && !isToday && "ring-2 ring-inset ring-blue-500 bg-[var(--pln-cal-surface-selected)]",
          // Focused (keyboard navigation)
          isFocused && !isSelected && !isToday && "ring-2 ring-inset ring-blue-300",
          // Overdue cell background
          hasOverdueTasks && !isToday && "bg-red-50/50 dark:bg-red-950/10",
          // Drag over state
          isDragOver && "bg-blue-100 dark:bg-blue-900/30 ring-2 ring-dashed ring-blue-400"
        )}
      >
        {/* Day Header */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            {/* Week Number (first day only) */}
            {weekNumber && (
              <span className="text-[9px] font-medium text-[var(--pln-cal-text-muted)] uppercase tracking-wider">
                W{weekNumber.toString().padStart(2, '0')}
              </span>
            )}
            
            {/* Day Number */}
            <span
              className={cn(
                "text-sm font-medium transition-all",
                !isCurrentMonth && "text-[var(--pln-cal-text-adjacent)]",
                isCurrentMonth && "text-[var(--pln-cal-text-secondary)]",
                // Today: blue circle badge with number
                isToday && "w-7 h-7 flex items-center justify-center bg-blue-500 text-white rounded-full font-semibold text-xs"
              )}
            >
              {format(date, 'd')}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Task Count Badge */}
            {taskCount > 0 && (
              <span className="text-[9px] font-semibold text-[var(--pln-cal-text-muted)] bg-[var(--pln-cal-surface-hover)] px-1.5 py-0.5 rounded">
                {taskCount}
              </span>
            )}
            
            {/* Quick Add Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd();
              }}
              className="w-5 h-5 flex items-center justify-center rounded text-[var(--pln-cal-text-muted)] hover:bg-[var(--pln-cal-surface-hover)] hover:text-[var(--pln-cal-text-primary)] opacity-0 group-hover:opacity-100 transition-opacity"
              title="Quick add task (N)"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tasks using TaskPillV2 */}
        <div className="space-y-1">
          {visibleTasks.map((task) => (
            <TaskPillV2
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              onContextMenu={handleContextMenu}
              compact
            />
          ))}

          {/* Overflow Indicator with tooltip */}
          {remainingCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDateClick();
              }}
              className="w-full px-2 py-1 text-[10px] font-medium text-[var(--pln-cal-text-muted)] hover:bg-[var(--pln-cal-surface-hover)] rounded transition-colors text-left flex items-center gap-1"
              title={remainingTasks.map(t => t.title).join('\n')}
            >
              <span>+{remainingCount} more</span>
            </button>
          )}
        </div>
      </div>

      {/* Context Menu Portal */}
      {contextMenu && (
        <TaskContextMenu
          task={contextMenu.task}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          onAction={handleContextMenuAction}
          statuses={statuses}
          users={users}
        />
      )}
    </>
  );
}
