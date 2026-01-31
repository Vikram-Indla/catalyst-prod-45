// ============================================================
// TASK ROW - Enterprise Linear-Aligned V2 with Completion Animation
// Ring-fenced CSS: mytasks-row, mytasks-checkbox, etc.
// Visual Hierarchy: Checkbox → ID (mono) → Title (500) → Workstream (dot+text) → Date → Actions
// ============================================================

import { useState, useRef } from 'react';
import { Check, Calendar, Clock, Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompleteMyTaskWithUndo } from '../../hooks/useCompleteMyTaskWithUndo';
import type { MyTask, TimeSection } from '../../types/my-tasks';
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
    if (color.includes('3b82f6') || color.includes('blue')) return 'mytasks-row__workstream-dot--blue';
    if (color.includes('14b8a6') || color.includes('teal')) return 'mytasks-row__workstream-dot--teal';
    if (color.includes('8b5cf6') || color.includes('purple')) return 'mytasks-row__workstream-dot--purple';
    if (color.includes('f97316') || color.includes('orange')) return 'mytasks-row__workstream-dot--orange';
    if (color.includes('ec4899') || color.includes('pink')) return 'mytasks-row__workstream-dot--pink';
    if (color.includes('22c55e') || color.includes('green')) return 'mytasks-row__workstream-dot--green';
  }
  return 'mytasks-row__workstream-dot--slate';
}

// Helper for animation timing
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function TaskRow({ task, onOpenDetail, isOverdueSection }: TaskRowProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(task.status_is_done);
  const rowRef = useRef<HTMLDivElement>(null);
  
  const completeTask = useCompleteMyTaskWithUndo();

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isCompleted && !isCompleting) {
      // COMPLETING TASK - with animation sequence
      setIsCompleting(true);
      
      // Step 1: Show completing state (green flash)
      await wait(150);
      
      // Step 2: Show completed state (strikethrough)
      setIsCompleted(true);
      await wait(250);
      
      // Step 3: Fade out
      rowRef.current?.classList.add('mytasks-row--fade-out');
      await wait(400);
      
      // Step 4: Actually complete in database
      completeTask.mutate({
        taskId: task.id,
        taskTitle: task.title,
        originalSection: task.time_section as TimeSection,
      });
      
      setIsCompleting(false);
    }
  };

  const handleRowClick = () => {
    if (!isCompleting) {
      onOpenDetail(task.id);
    }
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
      ref={rowRef}
      className={cn(
        'mytasks-row',
        isOverdue && 'mytasks-row--overdue',
        isCompleting && 'mytasks-row--completing',
        isCompleted && 'mytasks-row--completed'
      )}
      onClick={handleRowClick}
      data-task-id={task.id}
    >
      {/* Checkbox - 16px, Linear style */}
      <button
        onClick={handleComplete}
        disabled={isCompleting}
        className={cn(
          'mytasks-checkbox',
          isCompleted && 'mytasks-checkbox--checked'
        )}
      >
        {isCompleted && <Check className="w-2.5 h-2.5" />}
      </button>

      {/* Task ID - Monospace, NO badge */}
      <span className="mytasks-row__id">{task.task_key}</span>

      {/* Task Title - Weight 500, primary */}
      <span className={cn(
        'mytasks-row__title',
        isCompleted && 'mytasks-row__title--completed'
      )}>
        {task.title}
      </span>

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
