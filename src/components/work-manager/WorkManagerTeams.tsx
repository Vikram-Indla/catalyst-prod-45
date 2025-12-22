// src/components/work-manager/WorkManagerTeams.tsx
// Teams Management View

import { useMemo, useState } from 'react';
import { Plus, MoreHorizontal, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NewTeamDialog } from './NewTeamDialog';
import { getUserById } from '@/lib/work-manager-data';
import type { TaskExtended, Team, User } from './types';

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
      completed: teamTasks.filter(t => t.status === 'Done').length,
    };
  };

  const userTeamMap = useMemo(() => {
    const map = new Map<string, Team | undefined>();
    users.forEach(u => map.set(u.id, teams.find(t => t.memberIds.includes(u.id))));
    return map;
  }, [teams, users]);

  const openTasksByUser = useMemo(() => {
    const map = new Map<string, number>();
    users.forEach(u => {
      const openCount = tasks.filter(t => t.assigneeId === u.id && t.status !== 'Done').length;
      map.set(u.id, openCount);
    });
    return map;
  }, [tasks, users]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-semibold text-text-primary">Teams</h2>
          <p className="text-[13px] text-text-muted">Manage your work teams and members</p>
        </div>
        <Button
          onClick={() => setIsNewTeamDialogOpen(true)}
          className="bg-brand-primary hover:bg-brand-primary-hover text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          New Team
        </Button>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => {
          const stats = getTeamStats(team.id);
          const members = team.memberIds.map(id => getUserById(id)).filter(Boolean);

          return (
            <div
              key={team.id}
              className="bg-surface-card border border-border-default rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Card Header */}
              <div className="p-4 border-b border-border-default">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-[14px] font-semibold text-text-primary">{team.name}</h3>
                    {team.description && (
                      <p className="text-[12px] text-text-muted mt-1 line-clamp-2">{team.description}</p>
                    )}
                  </div>
                  <button className="p-1 rounded hover:bg-surface-muted" type="button">
                    <MoreHorizontal className="w-4 h-4 text-text-muted" />
                  </button>
                </div>
              </div>

              {/* Members */}
              <div className="p-4 border-b border-border-subtle">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-text-muted" />
                  <span className="text-[11px] font-medium text-text-muted uppercase tracking-wide">
                    {members.length} Members
                  </span>
                </div>
                <div className="flex items-center -space-x-2">
                  {members.slice(0, 5).map((member) => (
                    <div
                      key={member!.id}
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white border-2 border-surface-card',
                        member!.avatarColor || 'bg-brand-primary'
                      )}
                      title={member!.name}
                    >
                      {member!.initials}
                    </div>
                  ))}
                  {members.length > 5 && (
                    <div className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center text-[11px] font-medium text-text-muted border-2 border-surface-card">
                      +{members.length - 5}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <span className="block text-[18px] font-semibold text-text-primary">{stats.open}</span>
                    <span className="text-[10px] text-text-muted uppercase tracking-wide">Open</span>
                  </div>
                  <div>
                    <span
                      className={cn(
                        'block text-[18px] font-semibold',
                        stats.overdue > 0 ? 'text-status-danger' : 'text-text-primary'
                      )}
                    >
                      {stats.overdue}
                    </span>
                    <span className="text-[10px] text-text-muted uppercase tracking-wide">Overdue</span>
                  </div>
                  <div>
                    <span className="block text-[18px] font-semibold text-status-success">{stats.completed}</span>
                    <span className="text-[10px] text-text-muted uppercase tracking-wide">Done</span>
                  </div>
                </div>

                {(stats.overdue > 0 || stats.blocked > 0) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {stats.overdue > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-status-danger-bg text-status-danger text-[11px] font-medium rounded">
                        <AlertCircle className="w-3 h-3" />
                        {stats.overdue} overdue
                      </span>
                    )}
                    {stats.blocked > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-status-warning-bg text-status-warning text-[11px] font-medium rounded">
                        <AlertCircle className="w-3 h-3" />
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

      {/* All Members Section */}
      <div className="mt-8">
        <h3 className="text-[14px] font-semibold text-text-primary mb-4">All Team Members</h3>
        <div className="bg-surface-card border border-border-default rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-muted">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wide">Member</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wide">Team</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wide">Email</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wide">Tasks</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const userTeam = userTeamMap.get(user.id);
                const openTasks = openTasksByUser.get(user.id) ?? 0;

                return (
                  <tr key={user.id} className="border-b border-border-subtle hover:bg-surface-muted">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white',
                            user.avatarColor || 'bg-brand-primary'
                          )}
                        >
                          {user.initials}
                        </div>
                        <span className="text-[13px] font-medium text-text-primary">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-text-secondary">{user.role}</td>
                    <td className="px-4 py-3 text-[13px] text-text-secondary">{userTeam?.name || '—'}</td>
                    <td className="px-4 py-3 text-[13px] text-text-muted">{user.email}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 bg-surface-muted text-text-secondary text-[12px] font-medium rounded">
                        {openTasks} open
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
