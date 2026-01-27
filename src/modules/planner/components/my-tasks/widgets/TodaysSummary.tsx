// ============================================================
// TODAY'S SUMMARY WIDGET
// Planner V9: Daily productivity metrics dashboard
// ============================================================

import { BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMyTasksSummary } from '../../../hooks/useMyTasks';

interface TodaysSummaryProps {
  className?: string;
}

export function TodaysSummary({ className }: TodaysSummaryProps) {
  const { data: summary, isLoading } = useMyTasksSummary();

  const stats = [
    { 
      label: 'Completed', 
      value: summary?.completed_today || 0, 
      color: '#10b981' 
    },
    { 
      label: 'In Progress', 
      value: summary?.today_count || 0, 
      color: '#f59e0b' 
    },
    { 
      label: 'Overdue', 
      value: summary?.overdue_count || 0, 
      color: '#ef4444' 
    },
    { 
      label: 'Time Tracked', 
      value: '2h 15m', 
      color: '#3b82f6',
      isTime: true,
    },
  ];

  return (
    <div className={cn('rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Today's Summary
        </h3>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div 
            key={stat.label}
            className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-center"
          >
            <div 
              className="text-2xl font-bold mb-0.5"
              style={{ color: stat.color }}
            >
              {isLoading ? '...' : stat.value}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
