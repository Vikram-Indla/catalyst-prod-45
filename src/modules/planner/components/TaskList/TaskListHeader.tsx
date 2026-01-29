/**
 * Task List Header - Planner V9
 * Page title with quick stats
 */

import { List, AlertCircle, PlayCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskListHeaderProps {
  totalCount: number;
  overdueCount: number;
  inProgressCount: number;
  doneCount: number;
  isLoading?: boolean;
}

export function TaskListHeader({
  totalCount,
  overdueCount,
  inProgressCount,
  doneCount,
  isLoading,
}: TaskListHeaderProps) {
  const stats = [
    {
      label: 'Total',
      value: totalCount,
      color: 'text-slate-900 dark:text-slate-100',
    },
    {
      label: 'Overdue',
      value: overdueCount,
      color: 'text-red-600 dark:text-red-400',
      icon: AlertCircle,
      bgColor: 'bg-red-50 dark:bg-red-950/30',
    },
    {
      label: 'In Progress',
      value: inProgressCount,
      color: 'text-amber-600 dark:text-amber-400',
      icon: PlayCircle,
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      label: 'Done',
      value: doneCount,
      color: 'text-emerald-600 dark:text-emerald-400',
      icon: CheckCircle2,
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
  ];

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Task List
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          All tasks across workstreams
        </p>
      </div>

      {/* Quick Stats */}
      <div className="flex items-center gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg",
              stat.bgColor || "bg-slate-50 dark:bg-slate-800"
            )}
          >
            {stat.icon && (
              <stat.icon className={cn("w-4 h-4", stat.color)} />
            )}
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {stat.label}
              </span>
              <span className={cn("text-lg font-semibold", stat.color)}>
                {isLoading ? '—' : stat.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
