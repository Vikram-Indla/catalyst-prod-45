// src/components/work-manager/WorkManagerTeams.tsx
// Teams Management View - Dark Mode Optimized

import { useMemo, useState } from 'react';
import { Plus, MoreHorizontal, Users, AlertTriangle, ChevronRight, UserPlus, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NewTeamDialog } from './NewTeamDialog';
import { getUserById } from '@/lib/work-manager-data';
import type { TaskExtended, Team, User } from './types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AddTeamMemberDialog } from '@/components/teams/AddTeamMemberDialog';
import { useDeleteTeams } from '@/hooks/useTeams';
import { toast } from 'sonner';

// Team accent colors - kept but with opacity in dark mode
const teamColors: Record<string, string> = {
  'investment': '#5c7c5c',
  'portfolio': '#8b7355',
  'compliance': '#c69c6d',
};

interface WorkManagerTeamsProps {
  tasks: TaskExtended[];
  teams: Team[];
  users: User[];
  onCreateTeam: (team: Omit<Team, 'id'>) => void;
}

export function WorkManagerTeams({ tasks, teams, users, onCreateTeam }: WorkManagerTeamsProps) {
  const [isNewTeamDialogOpen, setIsNewTeamDialogOpen] = useState(false);
  const [addMemberTeamId, setAddMemberTeamId] = useState<string | null>(null);
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);
  const deleteTeams = useDeleteTeams();

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

  const handleDeleteTeam = async () => {
    if (!deleteTeamId) return;
    try {
      await deleteTeams.mutateAsync([deleteTeamId]);
      setDeleteTeamId(null);
    } catch (error) {
      console.error('Error deleting team:', error);
    }
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
          <h2 className="text-[18px] font-semibold text-foreground">Teams</h2>
          <p className="text-[13px] text-muted-foreground mt-1">
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
              {/* Color accent bar at top - slightly muted in dark */}
              <div 
                className="h-1.5 w-full opacity-80 dark:opacity-60"
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        className="p-1.5 rounded-lg hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity" 
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setAddMemberTeamId(team.id)}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Member
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTeamId(team.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Team
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {/* Members section - monochrome avatars */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      <Users className="w-4 h-4" />
                      {team.memberIds.length} Members
                    </div>
                    
                    {/* Avatar stack - monochrome */}
                    <div className="flex -space-x-2">
                      {team.memberIds.slice(0, 5).map((memberId, index) => {
                        const member = getUserById(memberId);
                        if (!member) return null;
                        
                        return (
                          <div
                            key={memberId}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-card bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300"
                            style={{ zIndex: 5 - index }}
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
                
                {/* Stats section - neutral backgrounds, colored text only */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="grid grid-cols-3 gap-3">
                    {/* Open */}
                    <div className="p-3 rounded-lg bg-stone-100 dark:bg-white/5 text-center">
                      <div className="text-xl font-bold text-foreground">{stats.open}</div>
                      <div className="text-[10px] uppercase tracking-wide text-stone-500 dark:text-muted-foreground mt-0.5">Open</div>
                    </div>
                    
                    {/* Overdue - text color only */}
                    <div className="p-3 rounded-lg bg-stone-100 dark:bg-white/5 text-center">
                      <div className={cn(
                        "text-xl font-bold",
                        stats.overdue > 0 ? 'text-red-500 dark:text-red-400' : 'text-foreground'
                      )}>
                        {stats.overdue}
                      </div>
                      <div className={cn(
                        "text-[10px] uppercase tracking-wide mt-0.5",
                        stats.overdue > 0 ? 'text-red-500 dark:text-red-400' : 'text-stone-500 dark:text-muted-foreground'
                      )}>
                        Overdue
                      </div>
                    </div>
                    
                    {/* Done - text color only */}
                    <div className="p-3 rounded-lg bg-stone-100 dark:bg-white/5 text-center">
                      <div className="text-xl font-bold text-green-600 dark:text-green-400">{stats.done}</div>
                      <div className="text-[10px] uppercase tracking-wide text-stone-500 dark:text-muted-foreground mt-0.5">Done</div>
                    </div>
                  </div>
                </div>
                
                {/* Warning badges - text only, no backgrounds */}
                {(stats.overdue > 0 || stats.blocked > 0) && (
                  <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-3">
                    {stats.overdue > 0 && (
                      <span className="text-red-500 dark:text-red-400 text-[11px]">
                        {stats.overdue} overdue
                      </span>
                    )}
                    {stats.blocked > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 text-[11px]">
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
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-4 text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
            Member Directory
          </span>
        </div>
      </div>

      {/* All Members Section */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-[15px] text-foreground">All Team Members</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {users.length} members across {teams.length} teams • Click a row to view tasks
          </p>
        </div>
        
        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Member
              </th>
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Role
              </th>
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Team
              </th>
              <th className="text-right px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Workload
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => {
              const userTeam = userTeamMap.get(user.id);
              const userStats = getUserStats(user.id);
              const teamColor = userTeam ? teamColors[userTeam.id] : undefined;

              return (
                <tr 
                  key={user.id} 
                  className={cn(
                    "group border-b border-border hover:bg-muted/50 transition-colors cursor-pointer",
                    index % 2 === 1 && "bg-muted/20"
                  )}
                  onClick={() => console.log('Navigate to tasks for', user.name)}
                >
                  {/* Member Cell - monochrome avatar */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-white"
                        title={user.name}
                      >
                        {user.initials}
                      </div>
                      <div>
                        <div className="font-medium text-[13px] text-foreground">{user.name}</div>
                        <div className="text-[11px] text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Role Cell */}
                  <td className="px-5 py-4">
                    <span className="text-[13px] text-muted-foreground">{user.role}</span>
                  </td>
                  
                  {/* Team Cell - With color indicator */}
                  <td className="px-5 py-4">
                    {userTeam ? (
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2.5 h-2.5 rounded-full shrink-0 opacity-80"
                          style={{ backgroundColor: teamColor }}
                        />
                        <span className="text-[13px] text-foreground">{userTeam.name}</span>
                      </div>
                    ) : (
                      <span className="text-[13px] text-muted-foreground">—</span>
                    )}
                  </td>
                  
                  {/* Workload Cell - minimal colors */}
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-3">
                      <div className="flex items-center gap-2">
                        {userStats.overdue > 0 && (
                          <span className="text-red-400 text-[11px] font-medium">
                            {userStats.overdue} overdue
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {userStats.open} open
                        </span>
                      </div>
                      
                      {/* Arrow on hover */}
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

      {/* Add Member Dialog */}
      {addMemberTeamId && (
        <AddTeamMemberDialog
          teamId={addMemberTeamId}
          open={!!addMemberTeamId}
          onOpenChange={(open) => !open && setAddMemberTeamId(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTeamId} onOpenChange={(open) => !open && setDeleteTeamId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTeam}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default WorkManagerTeams;
