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
import { format, isToday, isTomorrow, isThisWeek, isBefore, startOfDay, differenceInDays } from 'date-fns';

interface TaskRowProps {
  task: MyTask;
  onOpenDetail: (taskId: string) => void;
}

// Workstream color palette - all solid fills with white text
const WORKSTREAM_COLORS: Record<string, string> = {
  'Senaie': '#06b6d4',
  'Catalyst': '#8b5cf6',
  'Tahommona': '#6366f1',
  'Delivery': '#f97316',  // Orange, NOT red (reserved for danger)
  'MIM': '#ec4899',
  'Standalone': '#64748b',
  'Stand-Alone': '#64748b',  // Also support hyphenated version
  'Data & AI': '#14b8a6',
};

// Get workstream badge color - fallback to provided or slate
function getWorkstreamColor(name: string | null, fallbackColor: string | null): string {
  if (!name) return '#64748b';
  return WORKSTREAM_COLORS[name] || fallbackColor || '#64748b';
}

// Normalize workstream name (e.g., Stand-Alone → Standalone)
function normalizeWorkstreamName(name: string | null): string | null {
  if (!name) return null;
  if (name === 'Stand-Alone') return 'Standalone';
  return name;
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

  // Format due date - consistent relative format per audit
  const formatDueDate = () => {
    if (!task.due_date) return null;
    const date = new Date(task.due_date);
    const today = startOfDay(new Date());

    // Overdue - show just the date in red (no "X days overdue" text - section header says Overdue)
    if (isBefore(date, today)) {
      return { 
        text: format(date, 'MMM d'), 
        className: 'text-red-500' 
      };
    }
    
    // Today
    if (isToday(date)) {
      return { text: 'Today', className: 'text-amber-600' };
    }
    
    // Tomorrow
    if (isTomorrow(date)) {
      return { text: 'Tomorrow', className: 'text-blue-600' };
    }
    
    // This week - show day name only (Mon, Tue, etc.)
    if (isThisWeek(date, { weekStartsOn: 0 })) {
      return { 
        text: format(date, 'EEE'), 
        className: 'text-blue-600'
      };
    }
    
    // Beyond this week - show date without day name (Jan 30, Feb 5)
    return { 
      text: format(date, 'MMM d'), 
      className: 'text-slate-500 dark:text-slate-400'
    };
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

  const workstreamName = normalizeWorkstreamName(task.workstream_name);
  const workstreamColor = getWorkstreamColor(task.workstream_name, task.workstream_color);
  const timeEstimate = formatTime(task.time_estimate_minutes);

  return (
    <div
      className={cn(
        'group flex items-center gap-3 px-4 py-3',
        'hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors',
        task.status_is_done && 'opacity-50'
      )}
      onClick={handleRowClick}
    >
      {/* Checkbox - Complete task (thicker border, hover state per audit) */}
      <button
        onClick={handleComplete}
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center',
          'transition-all hover:scale-110',
          task.status_is_done 
            ? 'bg-green-500 border-2 border-green-500 text-white' 
            : 'border-2 border-slate-300 dark:border-slate-500 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
        )}
      >
        {task.status_is_done && <CheckCircle2 className="w-3 h-3" />}
      </button>

      {/* Task Key - slate-500 with medium weight per audit */}
      <span className="flex-shrink-0 text-xs font-mono font-medium text-slate-500 dark:text-slate-400 w-16">
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

      {/* Workstream Badge - ALL SOLID FILL with white text per audit */}
      {workstreamName && (
        <Badge
          className="flex-shrink-0 text-xs px-2 py-0.5 h-5 font-medium border-0 text-white"
          style={{ 
            backgroundColor: workstreamColor,
          }}
        >
          {workstreamName}
        </Badge>
      )}

      {/* Due Date + Time Estimate grouped together per audit */}
      {(dueDate || timeEstimate) && (
        <span className={cn('flex-shrink-0 flex items-center gap-1.5 text-xs', dueDate?.className || 'text-slate-500')}>
          {dueDate && (
            <>
              <Calendar className="w-3 h-3" />
              <span>{dueDate.text}</span>
            </>
          )}
          {dueDate && timeEstimate && <span className="text-slate-300 dark:text-slate-600">·</span>}
          {timeEstimate && (
            <span className="text-slate-400 dark:text-slate-500">{timeEstimate}</span>
          )}
        </span>
      )}
    </div>
  );
}
