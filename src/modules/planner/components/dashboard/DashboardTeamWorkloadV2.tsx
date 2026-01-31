// ============================================================
// DASHBOARD TEAM WORKLOAD V3 - Design Spec
// Member cards with avatar, workstream pills, task counts
// Unassigned row at top with dashed border
// ============================================================

import { useNavigate } from 'react-router-dom';
import { Users, UserMinus } from 'lucide-react';
import type { TeamWorkload } from '../../types/planner-dashboard';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface DashboardTeamWorkloadV2Props {
  data: TeamWorkload[];
  unassignedCount: number;
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

  // Get random color for avatar based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500', 
      'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  const membersWithTasks = data.filter(m => m.assigned_tasks > 0);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
      {/* Header with unassigned badge */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Team Workload
        </h3>
        {unassignedCount > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-full">
            <Users className="w-3.5 h-3.5" />
            {unassignedCount} unassigned
          </span>
        )}
      </div>

      <div className="space-y-2">
        {/* Unassigned Tasks Row - special styling with dashed border */}
        {unassignedCount > 0 && (
          <button
            onClick={() => navigate('/taskhub/task-list?assignee=unassigned')}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg',
              'border-2 border-dashed border-amber-300 dark:border-amber-700',
              'bg-amber-50/50 dark:bg-amber-900/10',
              'hover:bg-amber-100/50 dark:hover:bg-amber-900/20',
              'transition-colors text-left'
            )}
          >
            {/* Unassigned icon */}
            <div className="w-10 h-10 rounded-full bg-slate-600 dark:bg-slate-500 flex items-center justify-center flex-shrink-0">
              <UserMinus className="w-5 h-5 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                Unassigned Tasks
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Click to view and assign
              </div>
            </div>
            
            {/* Count */}
            <div className="text-right flex-shrink-0">
              <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                {unassignedCount} tasks
              </div>
            </div>
          </button>
        )}

        {/* Team member rows */}
        {membersWithTasks.length === 0 && unassignedCount === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-slate-400">
            No assigned tasks
          </div>
        ) : (
          membersWithTasks.map((member) => (
            <button
              key={member.profile_id}
              onClick={() => navigate(`/taskhub/task-list?assignee=${member.profile_id}`)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg',
                'bg-slate-50/50 dark:bg-slate-800/50',
                'hover:bg-slate-100 dark:hover:bg-slate-700/50',
                'transition-colors text-left'
              )}
            >
              {/* Avatar */}
              <Avatar className={cn("w-10 h-10 flex-shrink-0", !member.avatar_url && getAvatarColor(member.full_name))}>
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className="text-white font-medium text-sm bg-transparent">
                  {getInitials(member.full_name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-slate-900 dark:text-slate-100">
                  {member.full_name}
                </div>
              </div>
              
              {/* Count + late */}
              <div className="text-right flex-shrink-0">
                <div className={cn(
                  "font-semibold text-sm",
                  member.assigned_tasks === 0 ? "text-slate-400" : "text-slate-900 dark:text-slate-100"
                )}>
                  {member.assigned_tasks} task{member.assigned_tasks !== 1 ? 's' : ''}
                </div>
                {member.overdue_count > 0 && (
                  <div className="text-xs text-red-600 dark:text-red-400">
                    {member.overdue_count} late
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
