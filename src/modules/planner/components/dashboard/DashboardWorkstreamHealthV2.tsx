// ============================================================
// DASHBOARD WORKSTREAM HEALTH V3 - Design Spec
// Cards with left color border, progress bar, health/late badges
// ============================================================

import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import type { WorkstreamHealth } from '../../types/planner-dashboard';
import { cn } from '@/lib/utils';

interface DashboardWorkstreamHealthV2Props {
  data: WorkstreamHealth[];
}

type HealthStatus = 'healthy' | 'at-risk' | 'critical';

function calculateHealth(ws: WorkstreamHealth): HealthStatus {
  if (ws.total_tasks === 0) return 'healthy';
  
  const overduePercentage = (ws.overdue_tasks / ws.total_tasks) * 100;
  const progressPercentage = ws.total_tasks > 0 ? (ws.completed_tasks / ws.total_tasks) * 100 : 0;
  
  // Critical: overdue > 30% OR progress < 25% with backlog > 5
  if (overduePercentage > 30 || (progressPercentage < 25 && (ws.total_tasks - ws.completed_tasks) > 5)) {
    return 'critical';
  }
  // At Risk: overdue > 15% OR progress < 50%
  if (overduePercentage > 15 || progressPercentage < 50) {
    return 'at-risk';
  }
  return 'healthy';
}

const HEALTH_BADGES: Record<HealthStatus, { label: string; className: string }> = {
  healthy: { 
    label: 'HEALTHY', 
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' 
  },
  'at-risk': { 
    label: 'AT RISK', 
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' 
  },
  critical: { 
    label: 'CRITICAL', 
    className: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
  },
};

export function DashboardWorkstreamHealthV2({ data }: DashboardWorkstreamHealthV2Props) {
  const navigate = useNavigate();

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Workstream Health
        </h3>
        <div className="flex items-center justify-center py-12 text-sm text-slate-400">
          No active workstreams
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
      {/* Header with count badge */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Workstream Health
        </h3>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-full">
          {data.length} workstream{data.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {data.map((ws) => {
          const healthStatus = calculateHealth(ws);
          const healthBadge = HEALTH_BADGES[healthStatus];
          const progressPercent = ws.total_tasks > 0 
            ? Math.round((ws.completed_tasks / ws.total_tasks) * 100) 
            : 0;
          
          return (
            <button
              key={ws.workstream_id}
              onClick={() => navigate(`/planner/task-list?workstream=${ws.workstream_id}`)}
              className={cn(
                'w-full text-left p-4 rounded-lg border border-slate-100 dark:border-slate-700',
                'hover:border-slate-200 dark:hover:border-slate-600 hover:shadow-sm',
                'transition-all'
              )}
            >
              <div className="flex items-start gap-3">
                {/* Left color bar */}
                <div 
                  className="w-1 h-14 rounded-full flex-shrink-0"
                  style={{ backgroundColor: ws.workstream_color || '#64748b' }}
                />
                
                <div className="flex-1 min-w-0">
                  {/* Title row with badge */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {ws.workstream_name}
                    </span>
                    <span className={cn(
                      'px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide',
                      healthBadge.className
                    )}>
                      {healthBadge.label}
                    </span>
                  </div>
                  
                  {/* Stats row */}
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-2.5">
                    <span>{ws.total_tasks} task{ws.total_tasks !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>{ws.total_tasks - ws.completed_tasks - ws.overdue_tasks} in progress</span>
                    <span>•</span>
                    <span>{ws.completed_tasks} done</span>
                  </div>
                  
                  {/* Progress bar with percentage and late indicator */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-300"
                        style={{ 
                          width: `${progressPercent}%`,
                          backgroundColor: ws.workstream_color || '#64748b'
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-8 text-right">
                      {progressPercent}%
                    </span>
                    {ws.overdue_tasks > 0 && (
                      <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                        <AlertTriangle className="w-3 h-3" />
                        {ws.overdue_tasks} late
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
