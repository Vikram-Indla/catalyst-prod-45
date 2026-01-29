// ============================================================
// DASHBOARD METRIC CARDS - V9
// 4 KPI cards with animated values and click navigation
// ============================================================

import { useNavigate } from 'react-router-dom';
import { CheckSquare, AlertTriangle, Ban, TrendingUp } from 'lucide-react';
import type { DashboardMetrics } from '../../types/planner-dashboard';
import { cn } from '@/lib/utils';

interface DashboardMetricCardsProps {
  metrics: DashboardMetrics;
}

export function DashboardMetricCards({ metrics }: DashboardMetricCardsProps) {
  const navigate = useNavigate();

  // Check if all metrics are zero (empty state)
  const isEmpty = metrics.total_tasks === 0;

  const cards = [
    {
      id: 'total',
      label: 'Total Tasks',
      value: metrics.total_tasks,
      icon: CheckSquare,
      colorClass: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      borderClass: 'border-l-blue-500',
      onClick: () => navigate('/planner/boards'),
      emptyText: 'No tasks yet',
    },
    {
      id: 'overdue',
      label: 'Overdue',
      value: metrics.overdue_count,
      icon: AlertTriangle,
      colorClass: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      borderClass: 'border-l-red-500',
      onClick: () => navigate('/planner/boards?filter=overdue'),
      emptyText: 'None overdue',
    },
    {
      id: 'blocked',
      label: 'Blocked',
      value: metrics.blocked_count,
      icon: Ban,
      colorClass: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
      borderClass: 'border-l-amber-500',
      onClick: () => navigate('/planner/boards?filter=blocked'),
      emptyText: 'None blocked',
    },
    {
      id: 'completed',
      label: 'Completed This Week',
      value: metrics.completed_this_week,
      icon: TrendingUp,
      colorClass: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
      borderClass: 'border-l-emerald-500',
      onClick: () => navigate('/planner/boards?status=done'),
      emptyText: 'None this week',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.id}
            onClick={card.onClick}
            className={cn(
              'group relative flex flex-col p-4 rounded-xl border-l-4',
              'bg-white dark:bg-slate-800 shadow-sm',
              'border border-slate-200 dark:border-slate-700',
              card.borderClass,
              'hover:shadow-md hover:-translate-y-0.5 transition-all duration-150',
              'text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            )}
          >
            {/* Icon */}
            <div className={cn('p-2 rounded-md w-fit mb-2.5', card.colorClass)}>
              <Icon className="w-4 h-4" />
            </div>
            
            {/* Value */}
            <span className={cn(
              "text-2xl font-bold font-mono tabular-nums leading-none",
              card.value === 0 && isEmpty
                ? "text-slate-300 dark:text-slate-600"
                : "text-slate-900 dark:text-slate-100"
            )}>
              {card.value.toLocaleString()}
            </span>
            
            {/* Label - V5: 11px uppercase */}
            <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-1.5">
              {card.label}
            </span>
            
            {/* Empty hint for zero values when dashboard is empty */}
            {card.value === 0 && isEmpty && (
              <span className="text-[0.6875rem] text-slate-400 dark:text-slate-500 mt-0.5">
                {card.emptyText}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
