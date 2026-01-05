// src/components/work-manager/TaskCard.tsx
// Executive-Grade Kanban Task Card - 9.8 Bloomberg/Linear UX Standard

import { 
  Calendar, 
  AlertTriangle, 
  Link2, 
  GripVertical, 
  CheckCircle2,
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

  // Priority indicator - contextual, not competing with title
  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'Critical': 
        return { 
          dotClass: 'bg-danger', 
          textClass: 'text-danger',
          showDot: true 
        };
      case 'High': 
        return { 
          dotClass: 'bg-warning', 
          textClass: 'text-warning',
          showDot: true 
        };
      case 'Medium': 
        return { 
          dotClass: 'bg-text-muted', 
          textClass: 'text-text-muted',
          showDot: false 
        };
      case 'Low': 
        return { 
          dotClass: 'bg-text-muted', 
          textClass: 'text-text-muted',
          showDot: false 
        };
      default: 
        return { 
          dotClass: 'bg-text-muted', 
          textClass: 'text-text-muted',
          showDot: false 
        };
    }
  };

  // Type icon config
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'Project': return { icon: Folder };
      case 'Task': return { icon: CheckSquare };
      case 'General': return { icon: FileText };
      default: return { icon: FileText };
    }
  };

  const typeConfig = getTypeConfig(task.type);
  const TypeIcon = typeConfig.icon;
  const priorityConfig = getPriorityConfig(task.priority);

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      tabIndex={0}
      role="button"
      className={cn(
        // Base styles - Premium card with proper surface separation
        'relative group bg-surface-0 rounded-lg p-4 cursor-pointer',
        'border border-border-subtle',
        // Shadow for depth
        'shadow-sm',
        // Smooth transitions
        'transition-all duration-200 ease-out',
        // Hover effects
        'hover:shadow-md hover:border-border-default hover:-translate-y-0.5',
        'focus:ring-2 focus:ring-brand-primary/20 focus:outline-none focus:border-brand-primary',
        // Dragging state
        isDragging && 'shadow-lg cursor-grabbing rotate-1 scale-[1.02]',
        !isDragging && 'cursor-grab',
        // Blocked styling - red left accent
        task.blocked && 'border-l-[3px] border-l-danger',
        // Done styling - resolved look, NOT disabled
        isDone && !task.blocked && 'bg-surface-2 border-success/30'
      )}
    >
      {/* Drag Handle - visible on hover */}
      <div className="absolute top-3 left-1 opacity-0 group-hover:opacity-60 transition-opacity duration-200">
        <GripVertical className="w-4 h-4 text-text-muted" />
      </div>

      {/* Done Checkmark - success indicator */}
      {isDone && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 className="w-4 h-4 text-success" />
        </div>
      )}

      {/* Header: Key + Blocked Badge */}
      <div className="flex items-center justify-between gap-2 mb-2 pl-5">
        <span className="font-mono text-xs text-text-muted tracking-wide">{task.key}</span>
        {task.blocked && (
          <span 
            className="inline-flex items-center gap-1 text-danger text-xs font-semibold uppercase tracking-wide"
            title={task.blockedReason || 'Task is blocked'}
          >
            <AlertTriangle className="w-3 h-3" />
            Blocked
          </span>
        )}
      </div>

      {/* Title - DOMINANT element */}
      <h4 className={cn(
        'text-sm font-semibold leading-snug mb-3 line-clamp-2 pl-5 tracking-tight',
        isDone 
          ? 'text-text-secondary line-through decoration-text-muted/50' 
          : 'text-text-primary'
      )}>
        {task.title}
      </h4>

      {/* Meta: Type + Priority (contextual, not competing) */}
      <div className="flex flex-wrap items-center gap-3 mb-3 pl-5">
        {/* Type - subtle secondary info */}
        <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
          <TypeIcon className="w-3 h-3" />
          {task.type}
        </span>
        
        {/* Priority - only visually emphasized for Critical/High */}
        {(priorityConfig.showDot || task.priority === 'Critical' || task.priority === 'High') && (
          <div className="flex items-center gap-1.5">
            <div className={cn(
              'w-2 h-2 rounded-full shrink-0',
              priorityConfig.dotClass
            )} />
            <span className={cn('text-xs font-medium', priorityConfig.textClass)}>
              {task.priority}
            </span>
          </div>
        )}
        
        {/* Linked Item */}
        {task.linkedItem && (
          <span className="inline-flex items-center gap-1 text-xs text-text-muted font-mono">
            <Link2 className="w-3 h-3" />
            {task.linkedItem.key}
          </span>
        )}
      </div>

      {/* Footer: Due Date/Completed + Recurrence + Assignee */}
      <div className="flex items-center justify-between pt-3 border-t border-border-subtle pl-5">
        <div className="flex items-center gap-2">
          {/* Show completed date for done tasks, otherwise due date */}
          {isDone && task.completedAt ? (
            <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
              <CheckCircle2 className="w-3 h-3" />
              Completed {formatCompletedDate(task.completedAt)}
            </span>
          ) : task.dueDate ? (
            <span className={cn(
              'inline-flex items-center gap-1 text-xs font-medium',
              task.dueBucket === 'overdue' && 'text-danger',
              task.dueBucket === 'today' && 'text-warning',
              task.dueBucket !== 'overdue' && task.dueBucket !== 'today' && 'text-text-muted'
            )}>
              <Calendar className="w-3 h-3" />
              {task.dueBucket === 'overdue' && `${task.daysOverdue}d overdue`}
              {task.dueBucket === 'today' && 'Due today'}
              {(task.dueBucket === 'next7' || task.dueBucket === 'future' || task.dueBucket === 'none') && formatDueDate(task.dueDate)}
            </span>
          ) : (
            <span className="text-xs text-text-muted">No due date</span>
          )}

          {/* Recurrence indicator */}
          {task.recurrence !== 'None' && (
            <span className="text-xs text-text-muted font-medium" title={`Repeats ${task.recurrence.toLowerCase()}`}>
              ↻ {task.recurrence}
            </span>
          )}
        </div>
        
        {/* Assignee Avatar */}
        <div 
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
            'ring-2 ring-surface-0',
            'bg-surface-3 text-text-secondary',
            'transition-transform duration-200 hover:scale-110 hover:ring-brand-primary/30'
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
