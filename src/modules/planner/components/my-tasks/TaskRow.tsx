// ============================================================
// TASK ROW - V9 Design System (Task List Aligned)
// Uses ring-fenced Task List typography and sizing
// ============================================================

import { useState, useRef } from 'react';
import { CheckCircle2, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompleteMyTask, useUpdateMyTask } from '../../hooks/useMyTasks';
import type { MyTask } from '../../types/my-tasks';
import { format, isToday, isTomorrow, isThisWeek, isBefore, startOfDay } from 'date-fns';

interface TaskRowProps {
  task: MyTask;
  onOpenDetail: (taskId: string) => void;
}

// Workstream color palette
const WORKSTREAM_COLORS: Record<string, string> = {
  'Senaie': '#06b6d4',
  'Catalyst': '#8b5cf6',
  'Tahommona': '#6366f1',
  'Delivery': '#f97316',
  'MIM': '#ec4899',
  'Standalone': '#64748b',
  'Stand-Alone': '#64748b',
  'Data & AI': '#14b8a6',
};

function getWorkstreamColor(name: string | null): string {
  if (!name) return '#64748b';
  const normalized = name === 'Stand-Alone' ? 'Standalone' : name;
  return WORKSTREAM_COLORS[normalized] || WORKSTREAM_COLORS[name] || '#64748b';
}

function normalizeWorkstreamName(name: string | null): string | null {
  if (!name) return null;
  if (name === 'Stand-Alone') return 'Standalone';
  return name;
}

export function TaskRow({ task, onOpenDetail }: TaskRowProps) {
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
  const workstreamColor = getWorkstreamColor(task.workstream_name);

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
        'tl-row group flex items-center gap-3 px-4 cursor-pointer transition-colors',
        task.status_is_done && 'opacity-50'
      )}
      style={{ padding: '0.5rem 0.75rem' }}
      onClick={handleRowClick}
    >
      {/* Checkbox */}
      <button
        onClick={handleComplete}
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center',
          'transition-all hover:scale-110',
          task.status_is_done 
            ? 'bg-green-500 border-2 border-green-500 text-white' 
            : 'border-2 hover:border-green-500 hover:bg-green-50'
        )}
        style={{ 
          borderColor: task.status_is_done ? undefined : 'var(--pln-tl-border-strong)' 
        }}
      >
        {task.status_is_done && <CheckCircle2 className="w-3 h-3" />}
      </button>

      {/* Task Key - Task List V3 style */}
      <span 
        className="flex-shrink-0 text-xs font-mono font-medium w-16"
        style={{ color: 'var(--pln-tl-text-link)' }}
      >
        {task.task_key}
      </span>

      {/* Title - Task List V3 style */}
      <span
        className={cn(
          'tl-title-text flex-1 truncate',
          task.status_is_done && 'line-through'
        )}
        style={{ 
          color: task.status_is_done ? 'var(--pln-tl-text-muted)' : 'var(--pln-tl-text-primary)',
          fontWeight: 500,
          fontSize: '0.875rem',
        }}
      >
        {task.title}
      </span>

      {/* Workstream Badge - Task List V3 style */}
      {workstreamName && (
        <span 
          className="tl-workstream-cell flex-shrink-0"
          style={{ fontSize: '0.75rem', fontWeight: 500 }}
        >
          <span 
            className="tl-workstream-dot"
            style={{ backgroundColor: workstreamColor }}
          />
          <span style={{ color: 'var(--pln-tl-text-secondary)' }}>
            {workstreamName}
          </span>
        </span>
      )}

      {/* Due Date - Task List V3 style */}
      {dueDate && (
        <span 
          className="tl-date-cell flex-shrink-0"
          style={{ padding: '0.25rem 0.5rem' }}
        >
          <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--pln-tl-text-muted)' }} />
          <span 
            className={cn('tl-date-value', dueDate.isOverdue && 'tl-date-overdue')}
            style={{ 
              color: dueDate.isOverdue ? 'var(--pln-tl-priority-critical)' : 'var(--pln-tl-text-primary)',
              fontSize: '0.8125rem',
              fontWeight: 500,
            }}
          >
            {dueDate.text}
          </span>
        </span>
      )}

      {/* Time Estimate */}
      {timeEstimate && (
        <span 
          className="flex-shrink-0 flex items-center gap-1"
          style={{ color: 'var(--pln-tl-text-muted)', fontSize: '0.75rem' }}
        >
          <Clock className="w-3 h-3" />
          {timeEstimate}
        </span>
      )}
    </div>
  );
}
