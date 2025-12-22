// src/components/work-manager/TaskCard.tsx
// Premium Enterprise-Grade Kanban Task Card - Dark Mode Optimized

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

  // Priority dot colors only - no background badges
  const getPriorityDotColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-500';
      case 'High': return 'bg-orange-500';
      case 'Medium': return 'bg-amber-500';
      case 'Low': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  // Type icon config - outlined style, no filled backgrounds
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Project': return Folder;
      case 'Task': return CheckSquare;
      case 'General': return FileText;
      default: return FileText;
    }
  };

  const TypeIcon = getTypeIcon(task.type);

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      tabIndex={0}
      role="button"
      className={cn(
        'relative group bg-white dark:bg-gray-800 border rounded-lg p-3 cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:border-[#5c7c5c] hover:-translate-y-0.5',
        'focus:ring-2 focus:ring-[#5c7c5c] focus:outline-none',
        'shadow-sm',
        isDragging && 'shadow-xl cursor-grabbing',
        !isDragging && 'cursor-grab',
        // Blocked styling - red border only, no background tint
        task.blocked && 'border-l-2 border-l-red-500',
        // Done styling - just opacity, no green tint
        isDone && !task.blocked && 'opacity-50',
        // Default border
        !task.blocked && 'border-gray-200 dark:border-gray-700'
      )}
    >
      {/* Drag Handle - visible on hover */}
      <div className="absolute top-2 left-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>

      {/* Done Checkmark - subtle */}
      {isDone && (
        <div className="absolute top-2 right-2">
          <CheckCircle className="w-4 h-4 text-green-500/50" />
        </div>
      )}

      {/* Header: Key + Blocked Badge */}
      <div className="flex items-center justify-between gap-2 mb-2 pl-4">
        <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">{task.key}</span>
        {task.blocked && (
          <span 
            className="text-red-400 text-[10px] font-medium uppercase"
            title={task.blockedReason || 'Task is blocked'}
          >
            BLOCKED
          </span>
        )}
      </div>

      {/* Title - muted for done tasks */}
      <h4 className={cn(
        'text-[13px] font-medium leading-snug mb-2 line-clamp-2 pl-4',
        isDone 
          ? 'text-muted-foreground line-through decoration-muted-foreground/50' 
          : 'text-gray-900 dark:text-gray-100'
      )}>
        {task.title}
      </h4>

      {/* Meta: Type (icon + text), Priority (dot + text), Linked Item (muted) */}
      <div className="flex flex-wrap items-center gap-2 mb-3 pl-4">
        {/* Type - outlined badges per type color */}
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded bg-transparent border",
          task.type === 'Project' && 'border-green-500/30 text-green-400',
          task.type === 'Task' && 'border-blue-500/30 text-blue-400',
          task.type === 'General' && 'border-gray-500/30 text-gray-400'
        )}>
          <TypeIcon className="w-3 h-3" />
          {task.type}
        </span>
        
        {/* Priority - dot + text only */}
        <div className="flex items-center gap-1.5">
          <div className={cn('w-2 h-2 rounded-full shrink-0', getPriorityDotColor(task.priority))} />
          <span className="text-[11px] text-gray-400">{task.priority}</span>
        </div>
        
        {/* Linked Item - neutral, no gold */}
        {task.linkedItem && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/5 text-gray-400 text-[11px] font-mono rounded border border-white/10">
            <Link2 className="w-3 h-3" />
            {task.linkedItem.key}
          </span>
        )}
      </div>

      {/* Footer: Due Date/Completed + Recurrence + Assignee */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700 pl-4">
        <div className="flex items-center gap-2">
          {/* Show completed date for done tasks, otherwise due date */}
          {isDone && task.completedAt ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
              <CheckCircle className="w-3 h-3 text-green-500/50" />
              Completed {formatCompletedDate(task.completedAt)}
            </span>
          ) : task.dueDate ? (
            <span className={cn(
              'inline-flex items-center gap-1 text-[11px]',
              task.dueBucket === 'overdue' && 'text-red-400',
              task.dueBucket === 'today' && 'text-amber-400',
              task.dueBucket !== 'overdue' && task.dueBucket !== 'today' && 'text-muted-foreground'
            )}>
              <Calendar className="w-3 h-3" />
              {task.dueBucket === 'overdue' && `${task.daysOverdue}d overdue`}
              {task.dueBucket === 'today' && 'Due today'}
              {(task.dueBucket === 'next7' || task.dueBucket === 'future' || task.dueBucket === 'none') && formatDueDate(task.dueDate)}
            </span>
          ) : (
            <span className="text-[11px] text-gray-400">No due date</span>
          )}

          {/* Recurrence indicator */}
          {task.recurrence !== 'None' && (
            <span className="text-[10px] text-gray-500" title={`Repeats ${task.recurrence.toLowerCase()}`}>
              ↻ {task.recurrence}
            </span>
          )}
        </div>
        
        {/* Assignee Avatar - Monochrome */}
        <div 
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ring-2 ring-white dark:ring-gray-800 bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-white"
          title={assignee?.name || 'Unassigned'}
        >
          {assignee?.initials || '??'}
        </div>
      </div>
    </div>
  );
}

export default TaskCard;
