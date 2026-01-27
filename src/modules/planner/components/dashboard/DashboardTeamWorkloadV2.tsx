// ============================================================
// DASHBOARD TEAM WORKLOAD V2 - REDESIGN
// Per Audit: Compact bars, show unassigned prominently
// Even empty show team members, actionable CTA
// ============================================================

import { useNavigate } from 'react-router-dom';
import { UserX, AlertTriangle, ArrowRight } from 'lucide-react';
import type { TeamWorkload } from '../../types/planner-dashboard';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface DashboardTeamWorkloadV2Props {
  data: TeamWorkload[];
  unassignedCount: number;
}

// Max tasks for bar visualization
const MAX_TASKS_FOR_BAR = 10;

function getWorkloadBarClass(count: number): string {
  if (count >= 8) return 'bg-red-500';
  if (count >= 5) return 'bg-amber-500';
  return 'bg-blue-500';
}

export function DashboardTeamWorkloadV2({ data, unassignedCount }: DashboardTeamWorkloadV2Props) {
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
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      {/* Header */}
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
        Team Workload
      </h3>

      {/* Unassigned warning - Per audit: Make this prominent */}
      {unassignedCount > 0 && (
        <button
          onClick={() => navigate('/planner/boards?assignee=unassigned')}
          className={cn(
            'w-full flex items-center justify-between p-2.5 mb-3 rounded-md',
            'bg-amber-50 dark:bg-amber-900/20',
            'border border-amber-200 dark:border-amber-800',
            'hover:bg-amber-100 dark:hover:bg-amber-900/30',
            'transition-colors text-left',
            'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-inset'
          )}
        >
          <div className="flex items-center gap-2">
            <UserX className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {unassignedCount} tasks unassigned
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            Assign <ArrowRight className="w-3 h-3" />
          </div>
        </button>
      )}

      {/* Team list - only show members with tasks */}
      {data.filter(m => m.assigned_tasks > 0).length === 0 ? (
        <div className="flex items-center justify-center py-6 text-sm text-slate-400">
          No team members with assigned tasks
        </div>
      ) : (
        <div className="space-y-2 max-h-56 overflow-auto">
          {data.filter(m => m.assigned_tasks > 0).map((member) => {
            const barWidth = Math.min((member.assigned_tasks / MAX_TASKS_FOR_BAR) * 100, 100);
            const isOverloaded = member.assigned_tasks >= 8;
            
            return (
              <button
                key={member.profile_id}
                onClick={() => navigate(`/planner/boards?assignee=${member.profile_id}`)}
                className={cn(
                  'w-full flex items-center gap-3 p-2 rounded-md',
                  'hover:bg-slate-50 dark:hover:bg-slate-700/50',
                  'transition-colors text-left',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
                )}
              >
                {/* Avatar */}
                <Avatar className="w-6 h-6 flex-shrink-0">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px] bg-slate-100 dark:bg-slate-700">
                    {getInitials(member.full_name)}
                  </AvatarFallback>
                </Avatar>
                
                {/* Name */}
                <span className="text-sm text-slate-900 dark:text-slate-100 w-28 truncate flex-shrink-0">
                  {member.full_name}
                </span>
                
                {/* Workload bar */}
                <div className="flex-1 min-w-0">
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        getWorkloadBarClass(member.assigned_tasks)
                      )}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
                
                {/* Task count */}
                <span className={cn(
                  'text-xs font-mono w-16 text-right flex-shrink-0',
                  isOverloaded ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
                )}>
                  {member.assigned_tasks} tasks
                </span>
                
                {/* Overloaded warning */}
                {isOverloaded && (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                )}
                
                {/* Overdue indicator */}
                {member.overdue_count > 0 && (
                  <span className="text-[10px] text-red-600 dark:text-red-400 flex-shrink-0">
                    ({member.overdue_count} late)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
