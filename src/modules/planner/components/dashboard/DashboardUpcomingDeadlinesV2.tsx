// ============================================================
// DASHBOARD ATTENTION REQUIRED V3 - Design Spec
// Two-row layout per task: Title row + Date row
// Priority badges on right (CRITICAL/HIGH/MEDIUM)
// ============================================================

import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock } from 'lucide-react';
import type { UpcomingDeadline } from '../../types/planner-dashboard';
import { cn } from '@/lib/utils';
import { format, parseISO, isToday, isPast, differenceInDays } from 'date-fns';

interface DashboardUpcomingDeadlinesV2Props {
  data: UpcomingDeadline[];
  className?: string;
  onTaskClick?: (taskId: string) => void;
}

function getDaysOverdue(dueDate: string): number {
  const date = parseISO(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  if (date >= today) return 0;
  return differenceInDays(today, date);
}

function isOverdue(dueDate: string): boolean {
  const date = parseISO(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return isPast(date) && !isToday(date);
}

const PRIORITY_BADGES: Record<string, { label: string; className: string }> = {
  critical: { 
    label: 'CRITICAL', 
    className: 'bg-red-500 text-white' 
  },
  high: { 
    label: 'HIGH', 
    className: 'bg-amber-500 text-white' 
  },
  medium: { 
    label: 'MEDIUM', 
    className: 'bg-blue-500 text-white' 
  },
  low: { 
    label: 'LOW', 
    className: 'bg-slate-400 text-white' 
  },
};

export function DashboardUpcomingDeadlinesV2({ data, className, onTaskClick }: DashboardUpcomingDeadlinesV2Props) {
  const navigate = useNavigate();

  // Count overdue for header
  const overdueCount = data.filter(t => isOverdue(t.due_date)).length;

  if (data.length === 0) {
    return (
      <div className={cn(
        "bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 flex flex-col",
        className
      )}>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Attention Required
        </h3>
        <div className="flex-1 flex items-center justify-center py-8 text-sm text-slate-400">
          <Clock className="w-4 h-4 mr-2" />
          No upcoming deadlines — all clear!
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 flex flex-col",
      className
    )}>
      {/* Header with overdue badge */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Attention Required
        </h3>
        {overdueCount > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 px-2.5 py-1 bg-red-50 dark:bg-red-900/20 rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" />
            {overdueCount} overdue
          </span>
        )}
      </div>

      {/* Task list - two-row layout */}
      <div className="flex-1 space-y-0 divide-y divide-slate-100 dark:divide-slate-700 overflow-auto">
        {data.map((task) => {
          const daysOverdue = getDaysOverdue(task.due_date);
          const taskIsOverdue = isOverdue(task.due_date);
          const priorityBadge = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium;
          
          return (
            <button
              key={task.id}
              onClick={() => onTaskClick ? onTaskClick(task.id) : navigate(`/taskhub/task-list?taskId=${task.id}`)}
              className={cn(
                'w-full flex items-center gap-4 py-4 px-2 text-left',
                'hover:bg-slate-50 dark:hover:bg-slate-700/50',
                'transition-colors'
              )}
            >
              {/* Workstream color dot + name */}
              <div className="flex items-center gap-2 w-28 flex-shrink-0">
                <div 
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: task.workstream_color || 'var(--ds-text-subtlest, #64748b)' }}
                />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase truncate">
                  {task.workstream_name || 'Unassigned'}
                </span>
              </div>
              
              {/* Main content - two rows */}
              <div className="flex-1 min-w-0">
                {/* Title row: Key + Title */}
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono font-semibold text-sm text-blue-600 dark:text-blue-400 flex-shrink-0">
                    {task.key}
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {task.title}
                  </span>
                </div>
                
                {/* Date row: Full date + overdue text */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {format(parseISO(task.due_date), 'MMM d, yyyy')}
                  </span>
                  {taskIsOverdue && (
                    <>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                        {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Priority badge */}
              <span className={cn(
                'px-3 py-1 rounded text-xs font-bold uppercase tracking-wide flex-shrink-0',
                priorityBadge.className
              )}>
                {priorityBadge.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
