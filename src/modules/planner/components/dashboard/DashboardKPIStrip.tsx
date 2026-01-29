// ============================================================
// DASHBOARD KPI STRIP - V3 Design Spec
// Horizontal strip with dividers: Tasks | ⚠ Overdue | Blocked | Done(7d) | 👥 Unassigned | Role Context (right)
// ============================================================

import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Users } from 'lucide-react';
import type { DashboardMetrics } from '../../types/planner-dashboard';
import { cn } from '@/lib/utils';

interface DashboardKPIStripProps {
  metrics: DashboardMetrics;
  unassignedCount: number;
  // Role banner info (merged into right side)
  userRole?: string;
  assignedWorkstreams?: Array<{ id: string; name: string; color: string }>;
  isViewingAll?: boolean;
}

const ROLE_LABELS: Record<string, { label: string; className: string }> = {
  super_admin: { label: 'Super Admin', className: 'border-purple-300 text-purple-700 dark:border-purple-600 dark:text-purple-300' },
  admin: { label: 'Admin', className: 'border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300' },
  program_manager: { label: 'Program Manager', className: 'border-indigo-300 text-indigo-700 dark:border-indigo-600 dark:text-indigo-300' },
  management: { label: 'Management', className: 'border-emerald-300 text-emerald-700 dark:border-emerald-600 dark:text-emerald-300' },
  team_lead: { label: 'Team Lead', className: 'border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300' },
  developer: { label: 'Developer', className: 'border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300' },
  member: { label: 'Team Member', className: 'border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300' },
};

export function DashboardKPIStrip({ 
  metrics, 
  unassignedCount,
  userRole,
  assignedWorkstreams = [],
  isViewingAll = false
}: DashboardKPIStripProps) {
  const navigate = useNavigate();
  const roleConfig = ROLE_LABELS[userRole || 'member'] || ROLE_LABELS.member;

  // Build workstream context string
  const getContextText = () => {
    if (isViewingAll) {
      return 'Viewing all workstreams';
    }
    
    if (assignedWorkstreams.length === 0) {
      return 'No workstreams assigned';
    }
    
    if (assignedWorkstreams.length === 1) {
      return (
        <>
          Viewing <strong className="font-semibold text-slate-900 dark:text-slate-100">{assignedWorkstreams[0].name}</strong>
        </>
      );
    }
    
    if (assignedWorkstreams.length === 2) {
      return (
        <>
          Viewing <strong className="font-semibold text-slate-900 dark:text-slate-100">{assignedWorkstreams[0].name}</strong>,{' '}
          <strong className="font-semibold text-slate-900 dark:text-slate-100">{assignedWorkstreams[1].name}</strong>
        </>
      );
    }
    
    // 3+ workstreams
    const remaining = assignedWorkstreams.length - 1;
    return (
      <>
        Viewing <strong className="font-semibold text-slate-900 dark:text-slate-100">{assignedWorkstreams[0].name}</strong>{' '}
        and {remaining} more
      </>
    );
  };

  return (
    <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      {/* Left side - KPI metrics */}
      <div className="flex items-center divide-x divide-slate-200 dark:divide-slate-700">
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

      {/* Right side - Role badge + context */}
      {userRole && (
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Role badge - pill with border */}
          <span className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border-2 bg-white dark:bg-slate-900',
            roleConfig.className
          )}>
            <Users className="w-3.5 h-3.5" />
            {roleConfig.label}
          </span>
          
          {/* Context text */}
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {getContextText()}
          </span>
        </div>
      )}
    </div>
  );
}
