// ============================================================
// TASK ROW
// Per Justification Matrix:
// KEPT: Checkbox, Task Key, Title, Workstream Badge, Due Date, Time Estimate
// DELETED: Priority indicator, Status badge, Subtask progress, Action buttons
// Minimal scannable row - everything else opens in drawer
// ============================================================

import { useState, useRef } from 'react';
import { CheckCircle2, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompleteMyTask, useUpdateMyTask } from '../../hooks/useMyTasks';
import { Badge } from '@/components/ui/badge';
import type { MyTask } from '../../types/my-tasks';

interface TaskRowProps {
  task: MyTask;
  onOpenDetail: (taskId: string) => void;
}

export function TaskRow({ task, onOpenDetail }: TaskRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const completeTask = useCompleteMyTask();
  const updateTask = useUpdateMyTask();

  // Handle checkbox click (complete task)
  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!task.status_is_done) {
      completeTask.mutate(task.id);
    }
  };

  // Handle row click - opens drawer
  const handleRowClick = () => {
    if (!isEditing) {
      onOpenDetail(task.id);
    }
  };

  // Format due date
  const formatDueDate = () => {
    if (!task.due_date) return null;
    const date = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date < today) {
      const daysOverdue = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      return { text: `${daysOverdue}d overdue`, className: 'text-red-500' };
    } else if (date.toDateString() === today.toDateString()) {
      return { text: 'Today', className: 'text-amber-600' };
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return { text: 'Tomorrow', className: 'text-blue-600' };
    } else {
      return { 
        text: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), 
        className: 'text-slate-500'
      };
    }
  };

  const dueDate = formatDueDate();

  // Format time estimate
  const formatTime = (minutes: number | null) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-3 px-4 py-3',
        'hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors',
        task.status_is_done && 'opacity-50'
      )}
      onClick={handleRowClick}
    >
      {/* Checkbox - Complete task */}
      <button
        onClick={handleComplete}
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center',
          'transition-all hover:scale-110 hover:border-green-500',
          task.status_is_done 
            ? 'bg-green-500 border-green-500 text-white' 
            : 'border-slate-300 dark:border-slate-600 hover:bg-green-50 dark:hover:bg-green-900/20'
        )}
      >
        {task.status_is_done && <CheckCircle2 className="w-3 h-3" />}
      </button>

      {/* Task Key */}
      <span className="flex-shrink-0 text-xs font-mono text-slate-400 dark:text-slate-500 w-16">
        {task.task_key}
      </span>

      {/* Title */}
      <span
        className={cn(
          'flex-1 font-medium text-slate-900 dark:text-slate-100 truncate',
          task.status_is_done && 'line-through text-slate-500'
        )}
      >
        {task.title}
      </span>

      {/* Workstream Badge */}
      {task.workstream_name && (
        <Badge
          className="flex-shrink-0 text-xs px-2 py-0.5 h-5 font-medium border-0"
          style={{ 
            backgroundColor: `${task.workstream_color}20`,
            color: task.workstream_color || undefined,
          }}
        >
          {task.workstream_name}
        </Badge>
      )}

      {/* Due Date */}
      {dueDate && (
        <span className={cn('flex-shrink-0 flex items-center gap-1 text-xs', dueDate.className)}>
          <Calendar className="w-3 h-3" />
          {dueDate.text}
        </span>
      )}

      {/* Time Estimate */}
      {task.time_estimate_minutes && (
        <span className="flex-shrink-0 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
          <Clock className="w-3 h-3" />
          {formatTime(task.time_estimate_minutes)}
        </span>
      )}
    </div>
  );
}
