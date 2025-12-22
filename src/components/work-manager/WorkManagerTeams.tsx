// src/components/work-manager/WorkManagerTeams.tsx
// Teams Management View - Premium Enterprise Grade

import { useMemo, useState } from 'react';
import { Plus, MoreHorizontal, Users, AlertTriangle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NewTeamDialog } from './NewTeamDialog';
import { getUserById } from '@/lib/work-manager-data';
import type { TaskExtended, Team, User } from './types';

// Avatar colors for each user
const avatarColors: Record<string, string> = {
  'u1': '#5c7c5c', // Sarah Ahmed - olive
  'u2': '#8b7355', // Mohammed Al-Rashid - bronze
  'u3': '#c69c6d', // Layla Hassan - gold
  'u4': '#2563eb', // Omar Khalid - blue
  'u5': '#16a34a', // Fatima Al-Saud - green
  'u6': '#ea580c', // Ahmed Mansour - orange
  'u7': '#dc2626', // Nadia Qureshi - red
  'u8': '#ca8a04', // Khalid Ibrahim - amber
};

// Team accent colors
const teamColors: Record<string, string> = {
  'investment': '#5c7c5c',   // Olive
  'portfolio': '#8b7355',    // Bronze
  'compliance': '#c69c6d',   // Gold
};

interface WorkManagerTeamsProps {
  tasks: TaskExtended[];
  teams: Team[];
  users: User[];
  onCreateTeam: (team: Omit<Team, 'id'>) => void;
}

export function WorkManagerTeams({ tasks, teams, users, onCreateTeam }: WorkManagerTeamsProps) {
  const [isNewTeamDialogOpen, setIsNewTeamDialogOpen] = useState(false);

  const getTeamStats = (teamId: string) => {
    const teamTasks = tasks.filter(t => t.teamId === teamId);
    return {
      total: teamTasks.length,
      open: teamTasks.filter(t => t.status !== 'Done').length,
      overdue: teamTasks.filter(t => t.isOverdue).length,
      blocked: teamTasks.filter(t => t.blocked).length,
      done: teamTasks.filter(t => t.status === 'Done').length,
    };
  };

  const getUserStats = (userId: string) => {
    const userTasks = tasks.filter(t => t.assigneeId === userId);
    return {
      open: userTasks.filter(t => t.status !== 'Done').length,
      overdue: userTasks.filter(t => t.isOverdue).length,
      done: userTasks.filter(t => t.status === 'Done').length,
    };
  };

  const userTeamMap = useMemo(() => {
    const map = new Map<string, Team | undefined>();
    users.forEach(u => map.set(u.id, teams.find(t => t.memberIds.includes(u.id))));
    return map;
  }, [teams, users]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-semibold text-gray-900 dark:text-gray-100">Teams</h2>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
            Manage your work teams and members • {teams.length} teams • {users.length} members
          </p>
        </div>
        <Button
          onClick={() => setIsNewTeamDialogOpen(true)}
          className="bg-[#5c7c5c] hover:bg-[#4a6a4a] text-white gap-2 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          New Team
        </Button>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => {
          const stats = getTeamStats(team.id);
          const teamColor = teamColors[team.id] || '#5c7c5c';

          return (
            <div
              key={team.id}
              className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
            >
              {/* Color accent bar at top */}
              <div 
                className="h-1.5 w-full"
                style={{ backgroundColor: teamColor }}
              />
              
              {/* Card content */}
              <div className="p-5 flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 group-hover:text-[#5c7c5c] transition-colors">
                      {team.name}
                    </h3>
                    {team.description && (
                      <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {team.description}
                      </p>
                    )}
                  </div>
                  <button 
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-all duration-200" 
                    type="button"
                  >
                    <MoreHorizontal className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                
                {/* Members section */}
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {team.memberIds.length} Members
                      </span>
                    </div>
                    
                    {/* Avatar stack */}
                    <div className="flex items-center -space-x-2">
                      {team.memberIds.slice(0, 5).map((memberId, index) => {
                        const member = getUserById(memberId);
                        if (!member) return null;
                        const color = avatarColors[memberId] || '#5c7c5c';
                        
                        return (
                          <div
                            key={memberId}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold text-white border-2 border-white dark:border-gray-800 ring-0 hover:ring-2 hover:ring-offset-1 transition-all duration-200"
                            style={{ backgroundColor: color, zIndex: 5 - index }}
                            title={member.name}
                          >
                            {member.initials}
                          </div>
                        );
                      })}
                      
                      {/* Show +N if more than 5 members */}
                      {team.memberIds.length > 5 && (
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-semibold text-gray-600 dark:text-gray-300 border-2 border-white dark:border-gray-800">
                          +{team.memberIds.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Stats section */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                    <span className="block text-[18px] font-bold text-gray-900 dark:text-gray-100">
                      {stats.open}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Open
                    </span>
                  </div>
                  <div className={cn(
                    "rounded-lg p-3 text-center",
                    stats.overdue > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-700/50'
                  )}>
                    <span className={cn(
                      "block text-[18px] font-bold",
                      stats.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
                    )}>
                      {stats.overdue}
                    </span>
                    <span className={cn(
                      "text-[10px] uppercase tracking-wide",
                      stats.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
                    )}>
                      Overdue
                    </span>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                    <span className="block text-[18px] font-bold text-green-600 dark:text-green-400">
                      {stats.done}
                    </span>
                    <span className="text-[10px] text-green-600 dark:text-green-400 uppercase tracking-wide">
                      Done
                    </span>
                  </div>
                </div>
                
                {/* Warning badges - only show when needed */}
                {(stats.overdue > 0 || stats.blocked > 0) && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                    {stats.overdue > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[11px] font-medium rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        {stats.overdue} overdue
                      </span>
                    )}
                    {stats.blocked > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[11px] font-medium rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        {stats.blocked} blocked
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Section Divider */}
      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-gray-100 dark:bg-gray-900 px-4 text-[12px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Member Directory
          </span>
        </div>
      </div>

      {/* All Members Section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">All Team Members</h3>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">Click a row to view their tasks</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50">
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Member</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Role</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Team</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Workload</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const userTeam = userTeamMap.get(user.id);
              const userStats = getUserStats(user.id);
              const color = avatarColors[user.id] || '#5c7c5c';
              const teamColor = userTeam ? teamColors[userTeam.id] : undefined;

              return (
                <tr 
                  key={user.id} 
                  className="group border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                >
                  {/* Member Cell - Avatar + Name + Email */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold text-white shrink-0"
                        style={{ backgroundColor: color }}
                        title={user.name}
                      >
                        {user.initials}
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{user.name}</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Role Cell */}
                  <td className="px-5 py-4 text-[13px] text-gray-600 dark:text-gray-300">{user.role}</td>
                  
                  {/* Team Cell - With color indicator */}
                  <td className="px-5 py-4">
                    {userTeam ? (
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: teamColor }}
                        />
                        <span className="text-[13px] text-gray-600 dark:text-gray-300">{userTeam.name}</span>
                      </div>
                    ) : (
                      <span className="text-[13px] text-gray-400">—</span>
                    )}
                  </td>
                  
                  {/* Workload Cell */}
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {userStats.overdue > 0 && (
                          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[11px] font-medium rounded-full">
                            {userStats.overdue} overdue
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[11px] font-medium rounded-full">
                          {userStats.open} open
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <NewTeamDialog
        open={isNewTeamDialogOpen}
        onOpenChange={setIsNewTeamDialogOpen}
        users={users}
        onCreateTeam={onCreateTeam}
      />
    </div>
  );
}

export default WorkManagerTeams;
