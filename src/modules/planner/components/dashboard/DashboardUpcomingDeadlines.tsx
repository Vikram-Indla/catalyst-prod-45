// ============================================================
// DASHBOARD UPCOMING DEADLINES - V9
// Tasks due in the next 7 days with priority badges
// ============================================================

import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, AlertTriangle, User } from 'lucide-react';
import type { UpcomingDeadline } from '../../types/planner-dashboard';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface DashboardUpcomingDeadlinesProps {
  data: UpcomingDeadline[];
}

const PRIORITY_CONFIG = {
  critical: { 
    bgClass: 'bg-red-100 dark:bg-red-900/40',
    textClass: 'text-red-700 dark:text-red-300',
    label: 'Critical'
  },
  high: { 
    bgClass: 'bg-orange-100 dark:bg-orange-900/40',
    textClass: 'text-orange-700 dark:text-orange-300',
    label: 'High'
  },
  medium: { 
    bgClass: 'bg-blue-100 dark:bg-blue-900/40',
    textClass: 'text-blue-700 dark:text-blue-300',
    label: 'Medium'
  },
  low: { 
    bgClass: 'bg-slate-100 dark:bg-slate-700',
    textClass: 'text-slate-600 dark:text-slate-300',
    label: 'Low'
  },
};

const DUE_STATUS_CONFIG = {
  overdue: { 
    label: 'Overdue',
    bgClass: 'bg-red-50 dark:bg-red-900/30',
    textClass: 'text-red-600 dark:text-red-400',
  },
  today: { 
    label: 'Today',
    bgClass: 'bg-amber-50 dark:bg-amber-900/30',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  tomorrow: { 
    label: 'Tomorrow',
    bgClass: 'bg-blue-50 dark:bg-blue-900/30',
    textClass: 'text-blue-600 dark:text-blue-400',
  },
  upcoming: { 
    label: 'Upcoming',
    bgClass: 'bg-slate-50 dark:bg-slate-800',
    textClass: 'text-slate-600 dark:text-slate-400',
  },
};

export function DashboardUpcomingDeadlines({ data }: DashboardUpcomingDeadlinesProps) {
  const navigate = useNavigate();

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Upcoming Deadlines
          </h3>
        </div>
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Clock className="w-5 h-5 mr-2" />
          No upcoming deadlines
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Upcoming Deadlines
          </h3>
        </div>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Next 7 days
        </span>
      </div>

      {/* Task list */}
      <div className="space-y-2 max-h-80 overflow-auto">
        {data.map((task) => {
          const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
          const dueStatus = DUE_STATUS_CONFIG[task.due_status] || DUE_STATUS_CONFIG.upcoming;
          
          return (
            <button
              key={task.id}
              onClick={() => navigate(`/planner/boards?task=${task.id}`)}
              className={cn(
                'w-full p-3 rounded-lg border text-left',
                'border-slate-200 dark:border-slate-700',
                'hover:border-slate-300 dark:hover:border-slate-600',
                'hover:shadow-sm transition-all',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                task.due_status === 'overdue' && 'border-l-4 border-l-red-500'
              )}
            >
              {/* Top row: Key + Priority */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                  {task.key}
                </span>
                <div className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium',
                  priority.bgClass,
                  priority.textClass
                )}>
                  {priority.label}
                </div>
              </div>

              {/* Title */}
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-1 mb-2">
                {task.title}
              </div>

              {/* Bottom row: Due date + Assignee */}
              <div className="flex items-center justify-between text-xs">
                <div className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded',
                  dueStatus.bgClass,
                  dueStatus.textClass
                )}>
                  {task.due_status === 'overdue' && <AlertTriangle className="w-3 h-3" />}
                  <span>{dueStatus.label}</span>
                  <span className="opacity-75">
                    • {format(parseISO(task.due_date), 'MMM d')}
                  </span>
                </div>
                
                {task.assignee_name && (
                  <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <User className="w-3 h-3" />
                    <span className="truncate max-w-20">{task.assignee_name}</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
