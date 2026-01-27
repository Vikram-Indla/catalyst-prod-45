// ============================================================
// DASHBOARD UPCOMING DEADLINES V2 - REDESIGN
// Per Audit: Show "Overdue" for past dates, "Due Today" for today
// Header: "Attention Required" instead of "Upcoming Deadlines"
// ============================================================

import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Calendar, User } from 'lucide-react';
import type { UpcomingDeadline } from '../../types/planner-dashboard';
import { cn } from '@/lib/utils';
import { format, parseISO, isToday, isTomorrow, isPast, differenceInDays } from 'date-fns';

interface DashboardUpcomingDeadlinesV2Props {
  data: UpcomingDeadline[];
  className?: string;
}

type DueStatus = 'overdue' | 'today' | 'tomorrow' | 'this-week' | 'upcoming';

function getDueStatus(dueDate: string): DueStatus {
  const date = parseISO(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (isPast(date) && !isToday(date)) return 'overdue';
  if (isToday(date)) return 'today';
  if (isTomorrow(date)) return 'tomorrow';
  
  const daysUntil = differenceInDays(date, today);
  if (daysUntil <= 7) return 'this-week';
  return 'upcoming';
}

const DUE_STATUS_CONFIG: Record<DueStatus, {
  label: string;
  textClass: string;
  bgClass: string;
}> = {
  overdue: {
    label: 'OVERDUE',
    textClass: 'text-red-700 dark:text-red-300',
    bgClass: 'bg-red-100 dark:bg-red-900/40',
  },
  today: {
    label: 'TODAY',
    textClass: 'text-amber-700 dark:text-amber-300',
    bgClass: 'bg-amber-100 dark:bg-amber-900/40',
  },
  tomorrow: {
    label: 'Tomorrow',
    textClass: 'text-blue-700 dark:text-blue-300',
    bgClass: 'bg-blue-100 dark:bg-blue-900/40',
  },
  'this-week': {
    label: '',
    textClass: 'text-slate-600 dark:text-slate-400',
    bgClass: '',
  },
  upcoming: {
    label: '',
    textClass: 'text-slate-600 dark:text-slate-400',
    bgClass: '',
  },
};

const PRIORITY_INDICATOR: Record<string, string> = {
  critical: '!!',
  high: '!',
  medium: '',
  low: '',
};

export function DashboardUpcomingDeadlinesV2({ data, className }: DashboardUpcomingDeadlinesV2Props) {
  const navigate = useNavigate();

  // Count overdue for header
  const overdueCount = data.filter(t => getDueStatus(t.due_date) === 'overdue').length;

  if (data.length === 0) {
    return (
      <div className={cn(
        "bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex flex-col",
        className
      )}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Attention Required
        </h3>
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          <Clock className="w-4 h-4 mr-2" />
          No upcoming deadlines
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex flex-col",
      className
    )}>
      {/* Header - Per audit: "Attention Required" */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Attention Required
        </h3>
        {overdueCount > 0 && (
          <span className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {overdueCount} overdue
          </span>
        )}
      </div>

      {/* Compact task list - flex-1 to expand */}
      <div className="flex-1 space-y-1 overflow-auto">
        {data.map((task) => {
          const dueStatus = getDueStatus(task.due_date);
          const statusConfig = DUE_STATUS_CONFIG[dueStatus];
          const priorityIndicator = PRIORITY_INDICATOR[task.priority] || '';
          
          // Fix "Stand-Alone" → "Standalone" per audit
          const workstreamName = task.workstream_name?.replace('Stand-Alone', 'Standalone') || '';
          
          return (
            <button
              key={task.id}
              onClick={() => navigate(`/planner/task-list?task=${task.id}`)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left',
                'hover:bg-slate-50 dark:hover:bg-slate-700/50',
                'transition-colors text-xs',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
                dueStatus === 'overdue' && 'bg-red-50/50 dark:bg-red-900/10'
              )}
            >
              {/* Task key */}
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 w-14 flex-shrink-0">
                {task.key}
              </span>
              
              {/* Title */}
              <span className="flex-1 truncate text-slate-900 dark:text-slate-100 min-w-0">
                {task.title}
              </span>
              
              {/* Workstream */}
              {workstreamName && (
                <span className="text-slate-500 dark:text-slate-400 w-20 text-right truncate flex-shrink-0">
                  {workstreamName}
                </span>
              )}
              
              {/* Due date */}
              <span className="text-slate-500 dark:text-slate-400 w-12 text-right flex-shrink-0">
                {format(parseISO(task.due_date), 'MMM d')}
              </span>
              
              {/* Status badge */}
              {statusConfig.label && (
                <span className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide flex-shrink-0',
                  statusConfig.bgClass,
                  statusConfig.textClass
                )}>
                  {statusConfig.label}
                </span>
              )}
              
              {/* Priority indicator */}
              {priorityIndicator && (
                <span className={cn(
                  'font-bold flex-shrink-0',
                  task.priority === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                )}>
                  {priorityIndicator}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
