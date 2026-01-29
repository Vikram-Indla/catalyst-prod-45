// ============================================================
// TASK ROW - Enterprise Clean V1
// Elevated cards, rounded square checkboxes, muted IDs
// ============================================================

import { Check, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompleteMyTask } from '../../hooks/useMyTasks';
import type { MyTask } from '../../types/my-tasks';
import { format, isToday, isTomorrow, isThisWeek, isBefore, startOfDay } from 'date-fns';

interface TaskRowProps {
  task: MyTask;
  onOpenDetail: (taskId: string) => void;
  isOverdueSection?: boolean;
}

function normalizeWorkstreamName(name: string | null): string | null {
  if (!name) return null;
  if (name === 'Stand-Alone') return 'Standalone';
  return name;
}

export function TaskRow({ task, onOpenDetail, isOverdueSection }: TaskRowProps) {
  const completeTask = useCompleteMyTask();

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!task.status_is_done) {
      completeTask.mutate(task.id);
    }
  };

  const handleRowClick = () => {
    onOpenDetail(task.id);
  };

  // Format due date
  const formatDueDate = () => {
    if (!task.due_date) return null;
    const date = new Date(task.due_date);
    const today = startOfDay(new Date());

    if (isBefore(date, today)) {
      return { text: format(date, 'MMM d'), isOverdue: true };
    }
    if (isToday(date)) {
      return { text: 'Today', isOverdue: false };
    }
    if (isTomorrow(date)) {
      return { text: 'Tomorrow', isOverdue: false };
    }
    if (isThisWeek(date, { weekStartsOn: 0 })) {
      return { text: format(date, 'EEE'), isOverdue: false };
    }
    return { text: format(date, 'MMM d'), isOverdue: false };
  };

  const dueDate = formatDueDate();
  const workstreamName = normalizeWorkstreamName(task.workstream_name);

  const formatTime = (minutes: number | null) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const timeEstimate = formatTime(task.time_estimate_minutes);

  return (
    <div
      className={cn(
        'mt-task-card group',
        isOverdueSection && 'task-overdue',
        task.status_is_done && 'opacity-50'
      )}
      onClick={handleRowClick}
    >
      {/* Checkbox - Rounded Square */}
      <button
        onClick={handleComplete}
        className={cn('mt-checkbox', task.status_is_done && 'checked')}
      >
        {task.status_is_done && <Check className="w-3 h-3" />}
      </button>

      {/* Task ID - Muted Gray */}
      <span className="mt-task-id">{task.task_key}</span>

      {/* Title */}
      <span className={cn('mt-task-title', task.status_is_done && 'completed')}>
        {task.title}
      </span>

      {/* Meta: Workstream, Due Date, Time */}
      <div className="mt-task-meta">
        {/* Workstream - Text only, no dot */}
        {workstreamName && (
          <span className="mt-workstream-name">
            <span className="mt-workstream-dot" /> {/* Hidden via CSS */}
            {workstreamName}
          </span>
        )}

        {/* Due Date */}
        {dueDate && (
          <span className={cn('flex items-center gap-1', dueDate.isOverdue && 'mt-date-overdue')}>
            <Calendar className="w-3.5 h-3.5" />
            {dueDate.text}
          </span>
        )}

        {/* Time Estimate */}
        {timeEstimate && (
          <span className="mt-time-estimate">
            <Clock className="w-3 h-3" />
            {timeEstimate}
          </span>
        )}
      </div>
    </div>
  );
}
