// ============================================================
// DASHBOARD WORKSTREAM HEALTH V2 - REDESIGN
// Per Audit: Fixed progress bars, proper health logic, compact
// Rule: On Track = 0 overdue, At Risk = 1+ overdue, Off Track = >20% overdue
// ============================================================

import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { WorkstreamHealth } from '../../types/planner-dashboard';
import { cn } from '@/lib/utils';

interface DashboardWorkstreamHealthV2Props {
  data: WorkstreamHealth[];
}

type HealthStatus = 'on-track' | 'at-risk' | 'off-track';

const HEALTH_CONFIG: Record<HealthStatus, {
  icon: typeof CheckCircle2;
  label: string;
  shortLabel: string;
  textClass: string;
}> = {
  'on-track': {
    icon: CheckCircle2,
    label: 'On Track',
    shortLabel: '✓',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  'at-risk': {
    icon: AlertTriangle,
    label: 'At Risk',
    shortLabel: '⚠',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  'off-track': {
    icon: XCircle,
    label: 'Off Track',
    shortLabel: '✗',
    textClass: 'text-red-600 dark:text-red-400',
  },
};

function calculateHealth(ws: WorkstreamHealth): HealthStatus {
  // Per audit: If ANY task is overdue → At Risk or Off Track
  if (ws.total_tasks === 0) return 'on-track';
  
  const overduePercentage = (ws.overdue_tasks / ws.total_tasks) * 100;
  
  if (overduePercentage > 20) return 'off-track';
  if (ws.overdue_tasks > 0) return 'at-risk';
  return 'on-track';
}

export function DashboardWorkstreamHealthV2({ data }: DashboardWorkstreamHealthV2Props) {
  const navigate = useNavigate();

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Workstream Health
        </h3>
        <div className="flex items-center justify-center py-6 text-sm text-slate-400">
          No active workstreams
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
        Workstream Health
      </h3>

      <div className="space-y-2.5">
        {data.map((ws) => {
          // Per audit: Recalculate health based on correct logic
          const healthStatus = calculateHealth(ws);
          const health = HEALTH_CONFIG[healthStatus];
          
          // Per audit: Progress = completed/total, NOT some random 100%
          const progressPercent = ws.total_tasks > 0 
            ? Math.round((ws.completed_tasks / ws.total_tasks) * 100) 
            : 0;
          
          // Fix "Stand-Alone" → "Standalone" per audit
          const displayName = ws.workstream_name.replace('Stand-Alone', 'Standalone');
          
          return (
            <button
              key={ws.workstream_id}
              onClick={() => navigate(`/planner/task-list?workstream=${ws.workstream_id}`)}
              className={cn(
                'w-full flex items-center gap-3 p-2.5 rounded-md',
                'hover:bg-slate-50 dark:hover:bg-slate-700/50',
                'transition-colors text-left',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
              )}
            >
              {/* Workstream color dot */}
              <div 
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: ws.workstream_color || '#64748b' }}
              />
              
              {/* Name */}
              <span className="flex-1 text-sm font-medium text-slate-900 dark:text-slate-100 truncate min-w-0">
                {displayName}
              </span>
              
              {/* Progress bar - FIXED per audit */}
              <div className="w-20 flex-shrink-0">
                <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      progressPercent === 100 ? 'bg-emerald-500' : 
                      progressPercent > 0 ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                    )}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              
              {/* Completion count */}
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 w-12 text-right flex-shrink-0">
                {ws.completed_tasks}/{ws.total_tasks}
              </span>
              
              {/* Health status */}
              <span className={cn('text-xs font-medium w-16 text-right flex-shrink-0', health.textClass)}>
                {health.shortLabel} {health.label.split(' ')[0]}
              </span>
              
              {/* Overdue indicator */}
              {ws.overdue_tasks > 0 && (
                <span className="text-xs text-red-600 dark:text-red-400 flex-shrink-0">
                  ({ws.overdue_tasks} late)
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
