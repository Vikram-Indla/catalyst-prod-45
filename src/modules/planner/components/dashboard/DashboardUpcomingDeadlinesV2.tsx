// ============================================================
// DASHBOARD UPCOMING DEADLINES V2 - REDESIGN
// Per V2 Spec: "X DAYS OVERDUE" badges, workstream colors
// Header: "Attention Required" with days overdue calculation
// ============================================================

import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock } from 'lucide-react';
import type { UpcomingDeadline } from '../../types/planner-dashboard';
import { cn } from '@/lib/utils';
import { format, parseISO, isToday, isTomorrow, isPast, differenceInDays } from 'date-fns';

interface DashboardUpcomingDeadlinesV2Props {
  data: UpcomingDeadline[];
  className?: string;
  onTaskClick?: (taskId: string) => void;
}

type DueStatus = 'overdue' | 'today' | 'tomorrow' | 'this-week' | 'upcoming';

function getDaysOverdue(dueDate: string): number {
  const date = parseISO(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  if (date >= today) return 0;
  return differenceInDays(today, date);
}

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

// Per V2 Spec: Badge logic based on days overdue
function getOverdueBadge(daysOverdue: number): { text: string; className: string } | null {
  if (daysOverdue >= 7) {
    return { 
      text: `${daysOverdue} DAYS OVERDUE`, 
      className: 'bg-red-600 text-white dark:bg-red-500' 
    };
  }
  if (daysOverdue >= 1) {
    return { 
      text: `${daysOverdue} DAY${daysOverdue > 1 ? 'S' : ''} OVERDUE`, 
      className: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' 
    };
  }
  return null;
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
    label: 'TOMORROW',
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

const PRIORITY_SHAPES: Record<string, string> = {
  critical: '◆',
  high: '▲',
  medium: '●',
  low: '○',
};

export function DashboardUpcomingDeadlinesV2({ data, className, onTaskClick }: DashboardUpcomingDeadlinesV2Props) {
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
          No upcoming deadlines — all clear!
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex flex-col",
      className
    )}>
      {/* Header - Per V2 Spec: "Attention Required" */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Attention Required
        </h3>
        {overdueCount > 0 && (
          <span className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1 px-2 py-0.5 bg-red-50 dark:bg-red-900/20 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            {overdueCount} overdue
          </span>
        )}
      </div>

      {/* Task list with V2 layout - Per spec: workstream color dot, key, title, date, days overdue */}
      <div className="flex-1 space-y-1.5 overflow-auto">
        {data.map((task) => {
          const dueStatus = getDueStatus(task.due_date);
          const statusConfig = DUE_STATUS_CONFIG[dueStatus];
          const daysOverdue = getDaysOverdue(task.due_date);
          const overdueBadge = getOverdueBadge(daysOverdue);
          const priorityShape = PRIORITY_SHAPES[task.priority] || '';
          
          return (
            <button
              key={task.id}
              onClick={() => onTaskClick ? onTaskClick(task.id) : navigate(`/planner/task-list?taskId=${task.id}`)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left',
                'hover:bg-slate-50 dark:hover:bg-slate-700/50',
                'transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
                dueStatus === 'overdue' && 'bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30'
              )}
            >
              {/* Workstream color dot */}
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: task.workstream_color || '#64748b' }}
                title={task.workstream_name || 'No workstream'}
              />
              
              {/* Workstream name */}
              <span className="text-xs text-slate-500 dark:text-slate-400 w-20 truncate flex-shrink-0">
                {task.workstream_name || 'Unassigned'}
              </span>
              
              {/* Task key */}
              <span className="font-mono font-semibold text-xs text-blue-600 dark:text-blue-400 w-12 flex-shrink-0">
                {task.key}
              </span>
              
              {/* Title */}
              <span className="flex-1 text-sm text-slate-900 dark:text-slate-100 truncate min-w-0">
                {task.title}
              </span>
              
              {/* Due date */}
              <span className="text-xs text-slate-500 dark:text-slate-400 w-14 text-right flex-shrink-0">
                {format(parseISO(task.due_date), 'MMM d')}
              </span>
              
              {/* Overdue badge or status badge - Per V2 spec */}
              {overdueBadge ? (
                <span className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide flex-shrink-0',
                  overdueBadge.className
                )}>
                  {overdueBadge.text}
                </span>
              ) : statusConfig.label && (
                <span className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide flex-shrink-0',
                  statusConfig.bgClass,
                  statusConfig.textClass
                )}>
                  {statusConfig.label}
                </span>
              )}
              
              {/* Priority shape */}
              {priorityShape && (
                <span className={cn(
                  'text-xs flex-shrink-0',
                  task.priority === 'critical' ? 'text-red-600 dark:text-red-400' : 
                  task.priority === 'high' ? 'text-amber-600 dark:text-amber-400' :
                  'text-slate-400'
                )}>
                  {priorityShape}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
