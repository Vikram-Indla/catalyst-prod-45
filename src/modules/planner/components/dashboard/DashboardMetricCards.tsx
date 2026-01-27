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

  const cards = [
    {
      id: 'total',
      label: 'Total Tasks',
      value: metrics.total_tasks,
      icon: CheckSquare,
      colorClass: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      borderClass: 'border-l-blue-500',
      onClick: () => navigate('/planner/boards'),
    },
    {
      id: 'overdue',
      label: 'Overdue',
      value: metrics.overdue_count,
      icon: AlertTriangle,
      colorClass: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      borderClass: 'border-l-red-500',
      onClick: () => navigate('/planner/boards?filter=overdue'),
    },
    {
      id: 'blocked',
      label: 'Blocked',
      value: metrics.blocked_count,
      icon: Ban,
      colorClass: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
      borderClass: 'border-l-amber-500',
      onClick: () => navigate('/planner/boards?filter=blocked'),
    },
    {
      id: 'completed',
      label: 'Completed This Week',
      value: metrics.completed_this_week,
      icon: TrendingUp,
      colorClass: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
      borderClass: 'border-l-emerald-500',
      onClick: () => navigate('/planner/boards?status=done'),
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
              'group relative flex flex-col p-5 rounded-xl border-l-4',
              'bg-white dark:bg-slate-800',
              'border border-slate-200 dark:border-slate-700',
              card.borderClass,
              'hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200',
              'text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            )}
          >
            {/* Icon */}
            <div className={cn('p-2.5 rounded-lg w-fit mb-3', card.colorClass)}>
              <Icon className="w-5 h-5" />
            </div>
            
            {/* Value */}
            <span className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
              {card.value.toLocaleString()}
            </span>
            
            {/* Label */}
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
              {card.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
