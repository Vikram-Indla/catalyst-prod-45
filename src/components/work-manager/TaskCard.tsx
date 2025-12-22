// src/components/work-manager/TaskCard.tsx
// Kanban Task Card Component

import { Calendar, AlertTriangle, Link2 } from 'lucide-react';
import { getUserById } from '@/lib/work-manager-data';
import type { TaskExtended } from './types';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: TaskExtended;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const assignee = getUserById(task.assigneeId);
  
  // Format due date display
  const formatDueDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get priority badge classes
  const getPriorityClasses = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-status-danger-bg text-status-danger';
      case 'High': return 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400';
      case 'Medium': return 'bg-status-warning-bg text-status-warning';
      case 'Low': return 'bg-surface-muted text-text-muted';
      default: return 'bg-surface-muted text-text-secondary';
    }
  };

  // Get type badge classes
  const getTypeClasses = (type: string) => {
    switch (type) {
      case 'Project': return 'bg-brand-primary text-white';
      case 'Task': return 'bg-status-info-bg text-status-info';
      case 'General': return 'bg-surface-muted text-text-secondary';
      default: return 'bg-surface-muted text-text-secondary';
    }
  };

  // Get due date chip classes
  const getDueDateClasses = (bucket: string) => {
    switch (bucket) {
      case 'overdue': return 'bg-status-danger-bg text-status-danger';
      case 'today': return 'bg-status-warning-bg text-status-warning';
      default: return 'bg-surface-muted text-text-muted';
    }
  };

  const handleClick = () => {
    console.log('[TaskCard] Clicked task:', task.id, task.key, task.title);
    onClick();
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'bg-surface-card border border-border-default rounded-md p-3 cursor-pointer transition-all hover:shadow-md hover:border-brand-primary',
        task.blocked && 'border-l-[3px] border-l-status-danger'
      )}
    >
      {/* Header: Key + Blocked Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-mono text-[11px] text-text-muted">{task.key}</span>
        {task.blocked && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-status-danger-bg text-status-danger text-[10px] font-semibold uppercase rounded">
            <AlertTriangle className="w-3 h-3" />
            Blocked
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="text-[13px] font-medium text-text-primary leading-snug mb-2 line-clamp-2">
        {task.title}
      </h4>

      {/* Meta: Type, Priority, Linked Item */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className={cn('px-2 py-0.5 text-[11px] font-medium rounded', getTypeClasses(task.type))}>
          {task.type}
        </span>
        <span className={cn('px-2 py-0.5 text-[11px] font-medium rounded', getPriorityClasses(task.priority))}>
          {task.priority}
        </span>
        {task.linkedItem && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-brand-highlight/30 text-text-primary text-[11px] font-mono rounded dark:bg-brand-highlight/20 dark:text-brand-highlight">
            <Link2 className="w-3 h-3" />
            {task.linkedItem.key}
          </span>
        )}
      </div>

      {/* Footer: Due Date + Assignee */}
      <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
        {task.dueDate ? (
          <span className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] rounded',
            getDueDateClasses(task.dueBucket)
          )}>
            <Calendar className="w-3 h-3" />
            {task.dueBucket === 'overdue' && `${task.daysOverdue}d overdue`}
            {task.dueBucket === 'today' && 'Due today'}
            {(task.dueBucket === 'next7' || task.dueBucket === 'future') && formatDueDate(task.dueDate)}
          </span>
        ) : (
          <span className="text-[11px] text-text-muted">No due date</span>
        )}
        
        {assignee && (
          <div 
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white',
              assignee.avatarColor || 'bg-brand-primary'
            )}
            title={assignee.name}
          >
            {assignee.initials}
          </div>
        )}
      </div>

      {/* Recurrence indicator */}
      {task.recurrence !== 'None' && (
        <div className="mt-2 text-[10px] text-text-muted">
          ↻ {task.recurrence}
        </div>
      )}
    </div>
  );
}

export default TaskCard;