// ============================================================
// DASHBOARD WORKSTREAM HEALTH - V9
// Health status per workstream with completion bars
// ============================================================

import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { WorkstreamHealth } from '../../types/planner-dashboard';
import { cn } from '@/lib/utils';

interface DashboardWorkstreamHealthProps {
  data: WorkstreamHealth[];
}

const HEALTH_CONFIG = {
  'on-track': {
    icon: CheckCircle2,
    label: 'On Track',
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/30',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    barClass: 'bg-emerald-500',
  },
  'at-risk': {
    icon: AlertTriangle,
    label: 'At Risk',
    bgClass: 'bg-amber-50 dark:bg-amber-900/30',
    textClass: 'text-amber-600 dark:text-amber-400',
    barClass: 'bg-amber-500',
  },
  'critical': {
    icon: AlertCircle,
    label: 'Critical',
    bgClass: 'bg-red-50 dark:bg-red-900/30',
    textClass: 'text-red-600 dark:text-red-400',
    barClass: 'bg-red-500',
  },
};

export function DashboardWorkstreamHealth({ data }: DashboardWorkstreamHealthProps) {
  const navigate = useNavigate();

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Workstream Health
        </h3>
        <div className="flex items-center justify-center py-8 text-slate-400">
          No active workstreams
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
        Workstream Health
      </h3>

      <div className="space-y-4">
        {data.map((ws) => {
          const health = HEALTH_CONFIG[ws.health_status] || HEALTH_CONFIG['on-track'];
          const HealthIcon = health.icon;
          
          return (
            <button
              key={ws.workstream_id}
              onClick={() => navigate(`/taskhub/boards?workstream=${ws.workstream_slug}`)}
              className={cn(
                'w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700',
                'hover:border-slate-300 dark:hover:border-slate-600',
                'hover:shadow-sm transition-all text-left',
                'focus:outline-none focus:ring-2 focus:ring-blue-500'
              )}
            >
              {/* Top row: Name + Health Badge */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: ws.workstream_color }}
                  />
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {ws.workstream_name}
                  </span>
                </div>
                
                <div className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                  health.bgClass,
                  health.textClass
                )}>
                  <HealthIcon className="w-3 h-3" />
                  {health.label}
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                <div 
                  className={cn('h-full rounded-full transition-all duration-500', health.barClass)}
                  style={{ width: `${ws.completion_percentage}%` }}
                />
              </div>

              {/* Stats row */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {ws.completed_tasks}/{ws.total_tasks} completed
                </span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                  {ws.completion_percentage}%
                </span>
              </div>

              {/* Overdue warning */}
              {ws.overdue_tasks > 0 && (
                <div className="flex items-center gap-1 mt-2 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="w-3 h-3" />
                  {ws.overdue_tasks} overdue task{ws.overdue_tasks !== 1 ? 's' : ''}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
