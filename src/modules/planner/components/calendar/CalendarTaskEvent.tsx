// ============================================================
// CALENDAR TASK EVENT
// Individual task chip with workstream color, priority dot, drag support
// ============================================================

import { useMemo } from 'react';
import { isBefore, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import type { PlannerTask } from '../../types';
import { PRIORITY_CONFIG } from '../../types';

interface CalendarTaskEventProps {
  task: PlannerTask;
  onClick: () => void;
}

// Derive workstream color classes from hex
function getWorkstreamStyles(color: string | undefined) {
  const hex = color || '#6366f1';
  return {
    backgroundColor: `${hex}15`,
    borderLeftColor: hex,
  };
}

export function CalendarTaskEvent({ task, onClick }: CalendarTaskEventProps) {
  const workstreamStyles = useMemo(() => {
    return getWorkstreamStyles(task.teamColor);
  }, [task.teamColor]);

  const isOverdue = useMemo(() => {
    if (!task.dueDate) return false;
    const dueDate = startOfDay(new Date(task.dueDate));
    const today = startOfDay(new Date());
    return isBefore(dueDate, today) && task.status !== 'done';
  }, [task.dueDate, task.status]);

  const priorityConfig = PRIORITY_CONFIG[task.priority];

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition-all",
        "border-l-[3px] text-xs font-medium",
        "hover:brightness-95 hover:shadow-sm",
        "relative group"
      )}
      style={workstreamStyles}
      title={`${task.title}${task.assigneeName ? ` - ${task.assigneeName}` : ''}`}
    >
      {/* Priority Dot */}
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: priorityConfig.color }}
      />

      {/* Task Title - CRITICAL FIX: Show title, not assignee */}
      <span className="flex-1 truncate text-text-primary">
        {task.title}
      </span>

      {/* Assignee Initials */}
      {task.assigneeInitials && (
        <span
          className="w-4 h-4 rounded-full bg-white/80 flex items-center justify-center text-[8px] font-semibold flex-shrink-0 border border-border/50"
          title={task.assigneeName}
          style={{ color: task.teamColor || '#6366f1' }}
        >
          {task.assigneeInitials}
        </span>
      )}

      {/* Overdue Indicator */}
      {isOverdue && (
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
          !
        </span>
      )}
    </div>
  );
}
