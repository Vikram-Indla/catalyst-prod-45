// ============================================================
// BOARD TASK CARD - V9
// Sortable task card with V9 design tokens
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

const PRIORITY_STYLES = {
  critical: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  high: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  medium: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  low: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
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
      return { label: format(date, 'MMM d'), className: 'text-slate-400' };
    }
    
    if (isPast(date) && !isToday(date)) {
      return { 
        label: 'Overdue', 
        className: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' 
      };
    }
    if (isToday(date)) {
      return { 
        label: 'Today', 
        className: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' 
      };
    }
    if (isTomorrow(date)) {
      return { 
        label: 'Tomorrow', 
        className: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' 
      };
    }
    
    return { label: format(date, 'MMM d'), className: 'text-slate-500 dark:text-slate-400' };
  };

  const dueDisplay = getDueDateDisplay();
  const priorityStyle = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'group relative bg-white dark:bg-slate-800 rounded-lg p-3 cursor-pointer',
        'border border-slate-200 dark:border-slate-700',
        'hover:border-blue-300 dark:hover:border-blue-600',
        'hover:shadow-md hover:-translate-y-0.5 transition-all duration-150',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-xl rotate-2 scale-105',
        task.blocked && 'border-l-4 border-l-red-500'
      )}
    >
      {/* Workstream stripe */}
      {!task.blocked && task.workstream_color && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
          style={{ backgroundColor: task.workstream_color }}
        />
      )}

      {/* Top row: Key + Priority */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400">
          {task.key}
        </span>
        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium capitalize', priorityStyle)}>
          {task.priority}
        </span>
      </div>

      {/* Title */}
      <h4 className={cn(
        'text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2 mb-2',
        task.is_completed_status && 'line-through text-slate-400'
      )}>
        {task.title}
      </h4>

      {/* Blocked indicator */}
      {task.blocked && (
        <div className="flex items-center gap-1.5 mb-2 text-red-600 dark:text-red-400 text-xs">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="font-medium">Blocked</span>
        </div>
      )}

      {/* Workstream badge */}
      {task.workstream_name && (
        <div className="mb-2">
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
            style={{ 
              backgroundColor: task.workstream_color ? `${task.workstream_color}20` : '#f1f5f9',
              color: task.workstream_color || '#64748b',
            }}
          >
            {task.workstream_name}
          </span>
        </div>
      )}

      {/* Progress bar */}
      {task.progress > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-500">Progress</span>
            <span className="text-[10px] font-mono font-semibold text-slate-700 dark:text-slate-300">
              {task.progress}%
            </span>
          </div>
          <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full rounded-full transition-all',
                task.progress >= 100 ? 'bg-emerald-500' :
                task.progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'
              )}
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom row: Due date + Assignee */}
      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
        {dueDisplay ? (
          <div className={cn(
            'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded',
            dueDisplay.className
          )}>
            <Calendar className="w-3 h-3" />
            {dueDisplay.label}
          </div>
        ) : (
          <span className="text-[10px] text-slate-400">No due date</span>
        )}

        {task.assignee_name && (
          <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-24">
            <User className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{task.assignee_name}</span>
          </div>
        )}
      </div>
    </div>
  );
}
