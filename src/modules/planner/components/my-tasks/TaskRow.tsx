// ============================================================
// TASK ROW - Enterprise Linear-Aligned V2
// Ring-fenced CSS: mytasks-row, mytasks-checkbox, etc.
// Visual Hierarchy: Checkbox → ID (mono) → Title (500) → Workstream (dot+text) → Date → Actions
// ============================================================

import { Check, Calendar, Clock, Edit2, Trash2, MoreHorizontal } from 'lucide-react';
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

// Derive workstream dot color from workstream color or name
function getWorkstreamDotClass(color?: string | null, name?: string | null): string {
  if (color) {
    // Map common colors to dot classes
    if (color.includes('3b82f6') || color.includes('blue')) return 'mytasks-row__workstream-dot--blue';
    if (color.includes('14b8a6') || color.includes('teal')) return 'mytasks-row__workstream-dot--teal';
    if (color.includes('8b5cf6') || color.includes('purple')) return 'mytasks-row__workstream-dot--purple';
    if (color.includes('f97316') || color.includes('orange')) return 'mytasks-row__workstream-dot--orange';
    if (color.includes('ec4899') || color.includes('pink')) return 'mytasks-row__workstream-dot--pink';
    if (color.includes('22c55e') || color.includes('green')) return 'mytasks-row__workstream-dot--green';
  }
  // Default to slate
  return 'mytasks-row__workstream-dot--slate';
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

  // Format due date with color state
  const formatDueDate = (): { text: string; state: 'overdue' | 'today' | 'upcoming' } | null => {
    if (!task.due_date) return null;
    const date = new Date(task.due_date);
    const today = startOfDay(new Date());

    if (isBefore(date, today)) {
      return { text: format(date, 'MMM d'), state: 'overdue' };
    }
    if (isToday(date)) {
      return { text: 'Today', state: 'today' };
    }
    if (isTomorrow(date)) {
      return { text: 'Tomorrow', state: 'upcoming' };
    }
    if (isThisWeek(date, { weekStartsOn: 0 })) {
      return { text: format(date, 'EEE'), state: 'upcoming' };
    }
    return { text: format(date, 'MMM d'), state: 'upcoming' };
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
  const isOverdue = isOverdueSection || dueDate?.state === 'overdue';

  return (
    <div
      className={cn(
        'mytasks-row',
        isOverdue && 'mytasks-row--overdue',
        task.status_is_done && 'opacity-50'
      )}
      onClick={handleRowClick}
    >
      {/* Checkbox - 16px, Linear style */}
      <button
        onClick={handleComplete}
        className={cn(
          'mytasks-checkbox',
          task.status_is_done && 'mytasks-checkbox--checked'
        )}
      >
        {task.status_is_done && <Check className="w-2.5 h-2.5" />}
      </button>

      {/* Task ID - Monospace, NO badge */}
      <span className="mytasks-row__id">{task.task_key}</span>

      {/* Task Title - Weight 500, primary */}
      <span className="mytasks-row__title">{task.title}</span>

      {/* Workstream - 8px dot + grey text */}
      {workstreamName && (
        <span className="mytasks-row__workstream">
          <span 
            className={cn(
              'mytasks-row__workstream-dot',
              getWorkstreamDotClass(task.workstream_color, workstreamName)
            )}
            style={task.workstream_color ? { backgroundColor: task.workstream_color } : undefined}
          />
          {workstreamName}
        </span>
      )}

      {/* Date + Duration meta group */}
      <div className="mytasks-row__meta">
        {/* Due Date - Color coded */}
        {dueDate && (
          <span className={cn(
            'mytasks-row__date',
            dueDate.state === 'overdue' && 'mytasks-row__date--overdue',
            dueDate.state === 'today' && 'mytasks-row__date--today',
            dueDate.state === 'upcoming' && 'mytasks-row__date--upcoming'
          )}>
            <Calendar className="mytasks-row__date-icon" />
            {dueDate.text}
          </span>
        )}

        {/* Duration - Subtle */}
        {timeEstimate && (
          <>
            {dueDate && <span className="mytasks-row__meta-separator">·</span>}
            <span className="mytasks-row__duration">
              <Clock className="mytasks-row__duration-icon" />
              {timeEstimate}
            </span>
          </>
        )}
      </div>

      {/* Row Actions - Appear on hover */}
      <div className="mytasks-row__actions">
        <button className="mytasks-action-btn" onClick={(e) => { e.stopPropagation(); onOpenDetail(task.id); }}>
          <Edit2 />
        </button>
        <button className="mytasks-action-btn mytasks-action-btn--danger" onClick={(e) => { e.stopPropagation(); }}>
          <Trash2 />
        </button>
      </div>
    </div>
  );
}
