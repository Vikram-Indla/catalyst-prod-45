// ============================================================
// DASHBOARD KPI STRIP - V3 Design Spec
// Horizontal strip with dividers: Tasks | ⚠ Overdue | Blocked | Done(7d) | 👥 Unassigned
// ============================================================

import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Users } from 'lucide-react';
import type { DashboardMetrics } from '../../types/planner-dashboard';
import { cn } from '@/lib/utils';

interface DashboardKPIStripProps {
  metrics: DashboardMetrics;
  unassignedCount: number;
}

export function DashboardKPIStrip({ metrics, unassignedCount }: DashboardKPIStripProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 divide-x divide-slate-200 dark:divide-slate-700">
      {/* Total Tasks */}
      <button
        onClick={() => navigate('/planner/task-list')}
        className="flex items-center gap-2 px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
          {metrics.total_tasks}
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Tasks
        </span>
      </button>

      {/* Overdue - with warning icon */}
      <button
        onClick={() => navigate('/planner/task-list?filter=overdue')}
        className="flex items-center gap-2 px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        {metrics.overdue_count > 0 && (
          <AlertTriangle className="w-4 h-4 text-red-500" />
        )}
        <span className={cn(
          "text-2xl font-bold tabular-nums",
          metrics.overdue_count > 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100"
        )}>
          {metrics.overdue_count}
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Overdue
        </span>
      </button>

      {/* Blocked */}
      <button
        onClick={() => navigate('/planner/task-list?filter=blocked')}
        className="flex items-center gap-2 px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <span className={cn(
          "text-2xl font-bold tabular-nums",
          metrics.blocked_count > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-slate-100"
        )}>
          {metrics.blocked_count}
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Blocked
        </span>
      </button>

      {/* Done (7d) */}
      <button
        onClick={() => navigate('/planner/task-list?status=done')}
        className="flex items-center gap-2 px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
          {metrics.completed_this_week}
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Done (7d)
        </span>
      </button>

      {/* Unassigned - with users icon */}
      <button
        onClick={() => navigate('/planner/task-list?assignee=unassigned')}
        className="flex items-center gap-2 px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <Users className={cn(
          "w-5 h-5",
          unassignedCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400"
        )} />
        <span className={cn(
          "text-2xl font-bold tabular-nums",
          unassignedCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-slate-100"
        )}>
          {unassignedCount}
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Unassigned
        </span>
      </button>
    </div>
  );
}
