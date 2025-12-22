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
              className="bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group flex flex-col"
            >
              {/* Color accent bar at top */}
              <div 
                className="h-1.5 w-full"
                style={{ backgroundColor: teamColor }}
              />
              
              {/* Card content */}
              <div className="p-5 flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h3 className="font-semibold text-[15px] text-foreground group-hover:text-[#5c7c5c] transition-colors">
                      {team.name}
                    </h3>
                    {team.description && (
                      <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2">
                        {team.description}
                      </p>
                    )}
                  </div>
                  <button 
                    className="p-1.5 rounded-lg hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity" 
                    type="button"
                  >
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                
                {/* Members section */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      <Users className="w-4 h-4" />
                      {team.memberIds.length} Members
                    </div>
                    
                    {/* Avatar stack */}
                    <div className="flex -space-x-2">
                      {team.memberIds.slice(0, 5).map((memberId, index) => {
                        const member = getUserById(memberId);
                        if (!member) return null;
                        const color = avatarColors[memberId] || '#5c7c5c';
                        
                        return (
                          <div
                            key={memberId}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold text-white border-2 border-card ring-0 hover:ring-2 hover:ring-offset-1 transition-all duration-200"
                            style={{ backgroundColor: color, zIndex: 5 - index }}
                            title={member.name}
                          >
                            {member.initials}
                          </div>
                        );
                      })}
                      
                      {/* Show +N if more than 5 members */}
                      {team.memberIds.length > 5 && (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground border-2 border-card">
                          +{team.memberIds.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Stats section - PREMIUM DESIGN */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="grid grid-cols-3 gap-3">
                    {/* Open */}
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <div className="text-xl font-bold text-foreground">{stats.open}</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">Open</div>
                    </div>
                    
                    {/* Overdue */}
                    <div className={cn(
                      "p-3 rounded-lg text-center",
                      stats.overdue > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-muted/50'
                    )}>
                      <div className={cn(
                        "text-xl font-bold",
                        stats.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                      )}>
                        {stats.overdue}
                      </div>
                      <div className={cn(
                        "text-[10px] uppercase tracking-wide mt-0.5",
                        stats.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                      )}>
                        Overdue
                      </div>
                    </div>
                    
                    {/* Done */}
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                      <div className="text-xl font-bold text-green-600 dark:text-green-400">{stats.done}</div>
                      <div className="text-[10px] uppercase tracking-wide text-green-600 dark:text-green-400 mt-0.5">Done</div>
                    </div>
                  </div>
                </div>
                
                {/* Warning badges - only show if there are warnings */}
                {(stats.overdue > 0 || stats.blocked > 0) && (
                  <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2">
                    {stats.overdue > 0 && (
                      <div className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 text-red-700 dark:text-red-300 rounded-lg text-[11px] font-semibold border border-red-200 dark:border-red-800 shadow-sm hover:scale-105 transition-transform cursor-pointer">
                        <div className="relative">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <div className="absolute inset-0 w-2 h-2 rounded-full bg-red-500 animate-ping opacity-75" />
                        </div>
                        <span>{stats.overdue} overdue</span>
                      </div>
                    )}
                    {stats.blocked > 0 && (
                      <div className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 text-amber-700 dark:text-amber-300 rounded-lg text-[11px] font-semibold border border-amber-200 dark:border-amber-800 shadow-sm hover:scale-105 transition-transform cursor-pointer">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{stats.blocked} blocked</span>
                      </div>
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
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-4 text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
            Member Directory
          </span>
        </div>
      </div>

      {/* All Members Section */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-[14px] font-semibold text-foreground">All Team Members</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">Click a row to view their tasks</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Member</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Team</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Workload</th>
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
                  className="group border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
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
                        <div className="text-[13px] font-medium text-foreground">{user.name}</div>
                        <div className="text-[11px] text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Role Cell */}
                  <td className="px-5 py-4 text-[13px] text-muted-foreground">{user.role}</td>
                  
                  {/* Team Cell - With color indicator */}
                  <td className="px-5 py-4">
                    {userTeam ? (
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: teamColor }}
                        />
                        <span className="text-[13px] text-muted-foreground">{userTeam.name}</span>
                      </div>
                    ) : (
                      <span className="text-[13px] text-muted-foreground">—</span>
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
                        <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[11px] font-medium rounded-full">
                          {userStats.open} open
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
