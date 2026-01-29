// ============================================================
// BOARD TASK CARD - V10 Enterprise Clean
// Sortable task card with V10 enterprise design tokens
// Shape-based priority, muted colors, border-only workstream
// ============================================================

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, Calendar, User } from 'lucide-react';
import type { BoardTask } from '../../types/planner-boards';
import { cn } from '@/lib/utils';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';

interface BoardTaskCardProps {
  task: BoardTask;
  onClick?: () => void;
  isDragging?: boolean;
}

// V10: Shape-based priority indicators (all gray, shape differentiates)
const PRIORITY_SHAPES: Record<string, string> = {
  critical: '◆', // Diamond - maximum urgency
  high: '▲',     // Triangle - warning
  medium: '●',   // Filled circle - moderate
  low: '○',      // Empty circle - minimal
};

export function BoardTaskCard({ task, onClick, isDragging }: BoardTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getDueDateDisplay = () => {
    if (!task.due_date) return null;
    
    const date = parseISO(task.due_date);
    
    if (task.is_completed_status) {
      return { label: format(date, 'MMM d'), className: 'task-due' };
    }
    
    if (isPast(date) && !isToday(date)) {
      return { label: 'Overdue', className: 'task-due overdue' };
    }
    if (isToday(date)) {
      return { label: 'Today', className: 'task-due today' };
    }
    if (isTomorrow(date)) {
      return { label: 'Tomorrow', className: 'task-due' };
    }
    
    return { label: format(date, 'MMM d'), className: 'task-due' };
  };

  const dueDisplay = getDueDateDisplay();
  const priorityShape = PRIORITY_SHAPES[task.priority] || PRIORITY_SHAPES.medium;
  
  // Get workstream slug for data attribute
  const workstreamSlug = task.workstream_slug?.toLowerCase() || '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      data-workstream={workstreamSlug}
      className={cn(
        'board-task-card group relative bg-white dark:bg-slate-800 rounded-lg p-3 cursor-pointer',
        'border border-slate-200 dark:border-slate-700',
        'hover:shadow-sm transition-all duration-150',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-xl rotate-2 scale-105',
        task.blocked && 'blocked'
      )}
    >
      {/* Top row: Key + Priority Shape */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="task-key text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400">
          {task.key}
        </span>
        <span 
          className="priority-shape text-[10px] text-slate-500 dark:text-slate-400"
          title={task.priority}
        >
          {priorityShape}
        </span>
      </div>

      {/* Title */}
      <h4 className={cn(
        'task-title text-[13px] font-medium text-slate-900 dark:text-slate-100 line-clamp-2 mb-2',
        task.is_completed_status && 'completed line-through text-slate-400'
      )}>
        {task.title}
      </h4>

      {/* Blocked indicator */}
      {task.blocked && (
        <div className="blocked-indicator flex items-center gap-1.5 mb-2 text-red-600 dark:text-red-400 text-[11px]">
          <AlertTriangle className="w-3 h-3" />
          <span className="font-medium">Blocked</span>
        </div>
      )}

      {/* Progress bar (V10: muted colors) */}
      {task.progress > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400">Progress</span>
            <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400">
              {task.progress}%
            </span>
          </div>
          <div className="progress-bar-bg h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={cn(
                'progress-bar-fill h-full rounded-full transition-all',
                task.progress >= 100 ? 'complete bg-emerald-500' : 'bg-slate-400'
              )}
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom row: Due date + Assignee (V10: text-only, no pills) */}
      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
        {dueDisplay ? (
          <div className={cn('flex items-center gap-1 text-[11px]', dueDisplay.className)}>
            <Calendar className="w-3 h-3" />
            {dueDisplay.label}
          </div>
        ) : (
          <span className="text-[10px] text-slate-400">No due date</span>
        )}

        {task.assignee_name && (
          <div className="task-assignee flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-24">
            <User className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{task.assignee_name}</span>
          </div>
        )}
      </div>
    </div>
  );
}
