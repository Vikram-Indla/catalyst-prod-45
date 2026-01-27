// ============================================================
// DASHBOARD KPI STRIP - V9 REDESIGN
// Compact horizontal strip with trend indicators
// Per Audit: "Single row, inline stats, trend arrows"
// ============================================================

import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, UserX } from 'lucide-react';
import type { DashboardMetrics } from '../../types/planner-dashboard';
import { cn } from '@/lib/utils';

interface DashboardKPIStripProps {
  metrics: DashboardMetrics;
  unassignedCount: number;
}

interface KPIItem {
  id: string;
  label: string;
  value: number;
  trend?: number;
  isCritical?: boolean;
  isWarning?: boolean;
  onClick?: () => void;
}

export function DashboardKPIStrip({ metrics, unassignedCount }: DashboardKPIStripProps) {
  const navigate = useNavigate();

  const kpis: KPIItem[] = [
    {
      id: 'total',
      label: 'Tasks',
      value: metrics.total_tasks,
      onClick: () => navigate('/planner/task-list'),
    },
    {
      id: 'overdue',
      label: 'Overdue',
      value: metrics.overdue_count,
      isCritical: metrics.overdue_count > 0,
      onClick: () => navigate('/planner/task-list?filter=overdue'),
    },
    {
      id: 'blocked',
      label: 'Blocked',
      value: metrics.blocked_count,
      isWarning: metrics.blocked_count > 0,
      onClick: () => navigate('/planner/task-list?filter=blocked'),
    },
    {
      id: 'done',
      label: 'Done (7d)',
      value: metrics.completed_this_week,
      onClick: () => navigate('/planner/task-list?status=done'),
    },
    {
      id: 'unassigned',
      label: 'Unassigned',
      value: unassignedCount,
      isWarning: unassignedCount > 0,
      onClick: () => navigate('/planner/task-list?assignee=unassigned'),
    },
  ];

  return (
    <div className="flex items-center gap-1 p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      {kpis.map((kpi, index) => (
        <button
          key={kpi.id}
          onClick={kpi.onClick}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md transition-all',
            'hover:bg-slate-50 dark:hover:bg-slate-700',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
            index < kpis.length - 1 && 'border-r border-slate-200 dark:border-slate-700 mr-1'
          )}
        >
          <span className={cn(
            'text-lg font-bold font-mono tabular-nums',
            kpi.isCritical && 'text-red-600 dark:text-red-400',
            kpi.isWarning && kpi.value > 0 && 'text-amber-600 dark:text-amber-400',
            !kpi.isCritical && !kpi.isWarning && 'text-slate-900 dark:text-slate-100',
            kpi.value === 0 && 'text-slate-400 dark:text-slate-500'
          )}>
            {kpi.value}
          </span>
          
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {kpi.label}
          </span>
          
          {/* Trend indicator placeholder - future enhancement */}
          {kpi.trend !== undefined && kpi.trend !== 0 && (
            <span className={cn(
              'flex items-center text-xs font-medium',
              kpi.trend > 0 ? 'text-red-500' : 'text-emerald-500'
            )}>
              {kpi.trend > 0 ? (
                <>
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                  ↑{Math.abs(kpi.trend)}
                </>
              ) : (
                <>
                  <TrendingDown className="w-3 h-3 mr-0.5" />
                  ↓{Math.abs(kpi.trend)}
                </>
              )}
            </span>
          )}
          
          {/* Critical/Warning icons */}
          {kpi.isCritical && kpi.value > 0 && (
            <AlertTriangle className="w-4 h-4 text-red-500" />
          )}
          {kpi.id === 'unassigned' && kpi.value > 0 && (
            <UserX className="w-4 h-4 text-amber-500" />
          )}
        </button>
      ))}
    </div>
  );
}
