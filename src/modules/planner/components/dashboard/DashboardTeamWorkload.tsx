// ============================================================
// DASHBOARD TEAM WORKLOAD - V9
// Team member task distribution with workload status
// ============================================================

import { useNavigate } from 'react-router-dom';
import { Users, UserX, AlertCircle } from 'lucide-react';
import type { TeamWorkload } from '../../types/planner-dashboard';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface DashboardTeamWorkloadProps {
  data: TeamWorkload[];
  unassignedCount: number;
}

const WORKLOAD_CONFIG = {
  overloaded: {
    label: 'Overloaded',
    bgClass: 'bg-red-100 dark:bg-red-900/40',
    textClass: 'text-red-700 dark:text-red-300',
    barClass: 'bg-red-500',
  },
  busy: {
    label: 'Busy',
    bgClass: 'bg-amber-100 dark:bg-amber-900/40',
    textClass: 'text-amber-700 dark:text-amber-300',
    barClass: 'bg-amber-500',
  },
  available: {
    label: 'Available',
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/40',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    barClass: 'bg-emerald-500',
  },
};

// Max tasks for bar visualization
const MAX_TASKS_FOR_BAR = 30;

export function DashboardTeamWorkload({ data, unassignedCount }: DashboardTeamWorkloadProps) {
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Team Workload
          </h3>
        </div>
        {unassignedCount > 0 && (
          <button
            onClick={() => navigate('/planner/boards?assignee=unassigned')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium',
              'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
              'hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors'
            )}
          >
            <UserX className="w-3.5 h-3.5" />
            {unassignedCount} Unassigned
          </button>
        )}
      </div>

      {/* Team list */}
      {data.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-slate-400">
          No team members with assigned tasks
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-auto">
          {data.map((member) => {
            const workload = WORKLOAD_CONFIG[member.workload_status] || WORKLOAD_CONFIG.available;
            const barWidth = Math.min((member.assigned_tasks / MAX_TASKS_FOR_BAR) * 100, 100);
            
            return (
              <button
                key={member.profile_id}
                onClick={() => navigate(`/planner/boards?assignee=${member.profile_id}`)}
                className={cn(
                  'w-full p-3 rounded-lg border text-left',
                  'border-slate-200 dark:border-slate-700',
                  'hover:border-slate-300 dark:hover:border-slate-600',
                  'hover:shadow-sm transition-all',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500'
                )}
              >
                {/* Top row: Avatar + Name + Status */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-slate-100 dark:bg-slate-700">
                        {getInitials(member.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                      {member.full_name}
                    </span>
                  </div>
                  
                  <div className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    workload.bgClass,
                    workload.textClass
                  )}>
                    {workload.label}
                  </div>
                </div>

                {/* Workload bar */}
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                  <div 
                    className={cn('h-full rounded-full transition-all duration-300', workload.barClass)}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                {/* Stats row */}
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-3">
                    <span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {member.assigned_tasks}
                      </span>{' '}
                      assigned
                    </span>
                    <span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {member.in_progress_count}
                      </span>{' '}
                      in progress
                    </span>
                  </div>
                  
                  {member.overdue_count > 0 && (
                    <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <AlertCircle className="w-3 h-3" />
                      {member.overdue_count} overdue
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
