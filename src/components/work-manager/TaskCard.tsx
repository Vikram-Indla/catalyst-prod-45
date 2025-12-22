// src/components/work-manager/TaskCard.tsx
// Premium Enterprise-Grade Kanban Task Card - CIO Polish

import { 
  Calendar, 
  AlertTriangle, 
  Link2, 
  GripVertical, 
  CheckCircle,
  Folder,
  CheckSquare,
  FileText
} from 'lucide-react';
import { getUserById } from '@/lib/work-manager-data';
import type { TaskExtended } from './types';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: TaskExtended;
  onClick: () => void;
  isDragging?: boolean;
}

export function TaskCard({ task, onClick, isDragging = false }: TaskCardProps) {
  const assignee = getUserById(task.assigneeId);
  const isDone = task.status === 'Done';
  
  // Format due date display
  const formatDueDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format completed date
  const formatCompletedDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Priority dot colors with glow effect
  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'Critical': return { dot: 'bg-red-500', glow: 'shadow-[0_0_6px_rgba(239,68,68,0.5)]' };
      case 'High': return { dot: 'bg-orange-500', glow: 'shadow-[0_0_4px_rgba(249,115,22,0.4)]' };
      case 'Medium': return { dot: 'bg-amber-500', glow: '' };
      case 'Low': return { dot: 'bg-stone-400', glow: '' };
      default: return { dot: 'bg-stone-400', glow: '' };
    }
  };

  // Type icon config
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'Project': return { icon: Folder, color: 'text-olive-500 border-olive-200 bg-olive-50' };
      case 'Task': return { icon: CheckSquare, color: 'text-blue-500 border-blue-200 bg-blue-50' };
      case 'General': return { icon: FileText, color: 'text-stone-500 border-stone-200 bg-stone-50' };
      default: return { icon: FileText, color: 'text-stone-500 border-stone-200 bg-stone-50' };
    }
  };

  const typeConfig = getTypeConfig(task.type);
  const TypeIcon = typeConfig.icon;
  const priorityStyles = getPriorityStyles(task.priority);

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      tabIndex={0}
      role="button"
      className={cn(
        // Base styles - Premium card treatment
        'relative group bg-white rounded-xl p-4 cursor-pointer',
        'border border-stone-100',
        // Deeper premium shadows
        'shadow-[0_2px_8px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]',
        // Premium hover effects with deeper shadow
        'transition-all duration-200 ease-out',
        'hover:shadow-[0_8px_24px_rgba(0,0,0,0.1),0_4px_8px_rgba(0,0,0,0.06)]',
        'hover:border-stone-200 hover:-translate-y-0.5',
        'focus:ring-2 focus:ring-olive-500/20 focus:outline-none focus:border-olive-300',
        // Dragging state
        isDragging && 'shadow-hover cursor-grabbing rotate-1 scale-[1.02]',
        !isDragging && 'cursor-grab',
        // Blocked styling - accent bar on left
        task.blocked && 'border-l-[3px] border-l-red-500 bg-gradient-to-r from-red-50/50 to-transparent',
        // Done styling - subtle fade
        isDone && !task.blocked && 'opacity-60 bg-stone-50/50',
        // Dark mode
        'dark:bg-gray-800 dark:border-gray-700 dark:hover:border-gray-600'
      )}
    >
      {/* Drag Handle - visible on hover */}
      <div className="absolute top-3 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <GripVertical className="w-4 h-4 text-stone-300" />
      </div>

      {/* Done Checkmark - subtle */}
      {isDone && (
        <div className="absolute top-3 right-3">
          <CheckCircle className="w-4 h-4 text-green-500/60" />
        </div>
      )}

      {/* Header: Key + Blocked Badge */}
      <div className="flex items-center justify-between gap-2 mb-2.5 pl-5">
        <span className="font-mono text-[11px] text-stone-400 tracking-wide">{task.key}</span>
        {task.blocked && (
          <span 
            className="inline-flex items-center gap-1 text-red-500 text-[10px] font-semibold uppercase tracking-wide"
            title={task.blockedReason || 'Task is blocked'}
          >
            <AlertTriangle className="w-3 h-3" />
            Blocked
          </span>
        )}
      </div>

      {/* Title - muted for done tasks */}
      <h4 className={cn(
        'text-[13px] font-medium leading-snug mb-3 line-clamp-2 pl-5 tracking-tight',
        isDone 
          ? 'text-stone-400 line-through decoration-stone-300' 
          : 'text-stone-900 dark:text-gray-100'
      )}>
        {task.title}
      </h4>

      {/* Meta: Type, Priority, Linked Item */}
      <div className="flex flex-wrap items-center gap-2 mb-3 pl-5">
        {/* Type - Premium pill with icon */}
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md border",
          typeConfig.color
        )}>
          <TypeIcon className="w-3 h-3" />
          {task.type}
        </span>
        
        {/* Priority - dot with optional glow */}
        <div className="flex items-center gap-1.5">
          <div className={cn(
            'w-2 h-2 rounded-full shrink-0',
            priorityStyles.dot,
            priorityStyles.glow
          )} />
          <span className="text-[11px] text-stone-500">{task.priority}</span>
        </div>
        
        {/* Linked Item - Champagne tint with hover state */}
        {task.linkedItem && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-bronze-50 text-bronze-600 text-[11px] font-mono rounded border border-bronze-200 hover:bg-[#d4b896]/40 transition-colors cursor-pointer">
            <Link2 className="w-3 h-3" />
            {task.linkedItem.key}
          </span>
        )}
      </div>

      {/* Footer: Due Date/Completed + Recurrence + Assignee */}
      <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-gray-700 pl-5">
        <div className="flex items-center gap-2">
          {/* Show completed date for done tasks, otherwise due date */}
          {isDone && task.completedAt ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-stone-400">
              <CheckCircle className="w-3 h-3 text-green-500/60" />
              Completed {formatCompletedDate(task.completedAt)}
            </span>
          ) : task.dueDate ? (
            <span className={cn(
              'inline-flex items-center gap-1 text-[11px] font-medium',
              task.dueBucket === 'overdue' && 'text-red-400',
              task.dueBucket === 'today' && 'text-amber-400',
              task.dueBucket !== 'overdue' && task.dueBucket !== 'today' && 'text-stone-400 dark:text-stone-500'
            )}>
              <Calendar className="w-3 h-3" />
              {task.dueBucket === 'overdue' && `${task.daysOverdue}d overdue`}
              {task.dueBucket === 'today' && 'Due today'}
              {(task.dueBucket === 'next7' || task.dueBucket === 'future' || task.dueBucket === 'none') && formatDueDate(task.dueDate)}
            </span>
          ) : (
            <span className="text-[11px] text-stone-400">No due date</span>
          )}

          {/* Recurrence indicator */}
          {task.recurrence !== 'None' && (
            <span className="text-[10px] text-stone-400 font-medium" title={`Repeats ${task.recurrence.toLowerCase()}`}>
              ↻ {task.recurrence}
            </span>
          )}
        </div>
        
        {/* Assignee Avatar - Premium style */}
        <div 
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
            'ring-2 ring-white dark:ring-gray-800',
            'bg-gradient-to-br from-stone-100 to-stone-200 text-stone-600',
            'dark:from-gray-600 dark:to-gray-700 dark:text-gray-200',
            'transition-transform duration-200 hover:scale-110 hover:ring-olive-200'
          )}
          title={assignee?.name || 'Unassigned'}
        >
          {assignee?.initials || '??'}
        </div>
      </div>
    </div>
  );
}

export default TaskCard;
