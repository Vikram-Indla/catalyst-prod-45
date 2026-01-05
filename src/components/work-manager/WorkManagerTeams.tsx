// src/components/work-manager/WorkManagerTeams.tsx
// Teams Management View - 9.8 Executive UX + Dark Mode Enforcement

import { useMemo, useState } from 'react';
import { Plus, MoreHorizontal, Users, ChevronRight, UserPlus, Trash2 } from 'lucide-react';
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
      {/* Page Header - Executive hierarchy */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Teams</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {teams.length} teams · {users.length} members
          </p>
        </div>
        <Button
          onClick={() => setIsNewTeamDialogOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Plus className="w-4 h-4" />
          New Team
        </Button>
      </div>

      {/* Teams Grid - Clean cards with clear hierarchy */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {teams.map((team) => {
          const stats = getTeamStats(team.id);
          const hasRisk = stats.overdue > 0 || stats.blocked > 0;

          return (
            <div
              key={team.id}
              className={cn(
                "bg-card rounded-lg border overflow-hidden transition-all duration-200 hover:shadow-md group flex flex-col",
                hasRisk ? "border-l-2 border-l-danger border-border" : "border-border"
              )}
            >
              {/* Card content */}
              <div className="p-5 flex-1 flex flex-col">
                {/* Header - Team name DOMINANT */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base text-foreground truncate">
                      {team.name}
                    </h3>
                    {team.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {team.description}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        className="p-1.5 rounded-md hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0" 
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
                
                {/* Members - Secondary info */}
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {team.memberIds.length} members
                  </span>
                  
                  {/* Avatar stack */}
                  <div className="flex -space-x-1.5 ml-auto">
                    {team.memberIds.slice(0, 4).map((memberId, index) => {
                      const member = getUserById(memberId);
                      if (!member) return null;
                      
                      return (
                        <div
                          key={memberId}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold border-2 border-card bg-muted text-muted-foreground"
                          style={{ zIndex: 4 - index }}
                          title={member.name}
                        >
                          {member.initials}
                        </div>
                      );
                    })}
                    {team.memberIds.length > 4 && (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-semibold text-muted-foreground border-2 border-card">
                        +{team.memberIds.length - 4}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Stats - Numbers DOMINANT, clean grid */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border">
                  {/* Open */}
                  <div className="text-center py-2">
                    <div className="text-xl font-bold text-foreground">{stats.open}</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Open</div>
                  </div>
                  
                  {/* Overdue - Red text only for true risk */}
                  <div className="text-center py-2">
                    <div className={cn(
                      "text-xl font-bold",
                      stats.overdue > 0 ? "text-danger" : "text-foreground"
                    )}>
                      {stats.overdue}
                    </div>
                    <div className={cn(
                      "text-[10px] uppercase tracking-wide",
                      stats.overdue > 0 ? "text-danger" : "text-muted-foreground"
                    )}>
                      Overdue
                    </div>
                  </div>
                  
                  {/* Done - Success color, not faded */}
                  <div className="text-center py-2">
                    <div className="text-xl font-bold text-success">{stats.done}</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Done</div>
                  </div>
                </div>
                
                {/* Risk indicators - minimal, text only */}
                {stats.blocked > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-warning font-medium">
                      {stats.blocked} blocked
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Section Divider */}
      <div className="relative py-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Member Directory
          </span>
        </div>
      </div>

      {/* All Members Table - Executive clarity */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-sm text-foreground">All Team Members</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {users.length} members across {teams.length} teams
          </p>
        </div>
        
        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Member
              </th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Role
              </th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Team
              </th>
              <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Workload
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => {
              const userTeam = userTeamMap.get(user.id);
              const userStats = getUserStats(user.id);

              return (
                <tr 
                  key={user.id} 
                  className={cn(
                    "group border-b border-border hover:bg-muted/30 transition-colors cursor-pointer",
                    index % 2 === 1 && "bg-muted/10"
                  )}
                  onClick={() => console.log('Navigate to tasks for', user.name)}
                >
                  {/* Member - Name DOMINANT */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 bg-muted text-foreground">
                        {user.initials}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-foreground">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Role - Secondary */}
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-muted-foreground">{user.role}</span>
                  </td>
                  
                  {/* Team */}
                  <td className="px-5 py-3.5">
                    {userTeam ? (
                      <span className="text-sm text-foreground">{userTeam.name}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  
                  {/* Workload - Risk visible but calm */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-4">
                      <div className="flex items-center gap-3 text-xs">
                        {userStats.overdue > 0 && (
                          <span className="text-danger font-medium">
                            {userStats.overdue} overdue
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          {userStats.open} open
                        </span>
                        <span className="text-success">
                          {userStats.done} done
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