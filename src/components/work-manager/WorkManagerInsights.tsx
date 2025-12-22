// src/components/work-manager/WorkManagerInsights.tsx
// Weekly Insights View

import { useState, useMemo } from 'react';
import { CheckCircle, Clock, AlertTriangle, XCircle, FileText, Download, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { users, teams, getUserById, getTeamById } from '@/lib/work-manager-data';
import type { TaskExtended } from './types';
import { cn } from '@/lib/utils';

interface WorkManagerInsightsProps {
  tasks: TaskExtended[];
}

type ViewMode = 'individual' | 'team';

export function WorkManagerInsights({ tasks }: WorkManagerInsightsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('individual');
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || '');
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id || '');
  const [followUpNotes, setFollowUpNotes] = useState('');

  // Get current week range
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const formatDateRange = () => {
    return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  // Compute individual insights
  const individualInsights = useMemo(() => {
    const userTasks = tasks.filter(t => t.assigneeId === selectedUserId);
    
    const completed = userTasks.filter(t => t.status === 'Done');
    const inProgress = userTasks.filter(t => t.status === 'In Progress' || t.status === 'Waiting');
    const overdue = userTasks.filter(t => t.isOverdue && t.status !== 'Done');
    const blocked = userTasks.filter(t => t.blocked);

    // Determine status
    let status: 'on_track' | 'needs_attention' | 'at_risk' = 'on_track';
    if (overdue.length > 2 || blocked.length > 2) {
      status = 'at_risk';
    } else if (overdue.length > 0 || blocked.length > 0) {
      status = 'needs_attention';
    }

    return {
      summary: {
        total: userTasks.length,
        completed: completed.length,
        inProgress: inProgress.length,
        overdue: overdue.length,
        blocked: blocked.length,
      },
      status,
      achieved: completed,
      inProgress,
      notAchieved: overdue,
      blockers: blocked.map(t => ({
        task: t,
        reason: t.blockedReason || 'No reason provided',
        daysSinceBlocked: t.blockedAt 
          ? Math.floor((today.getTime() - new Date(t.blockedAt).getTime()) / (1000 * 60 * 60 * 24))
          : 0
      })),
    };
  }, [tasks, selectedUserId]);

  // Compute team insights
  const teamInsights = useMemo(() => {
    const teamTasks = tasks.filter(t => t.teamId === selectedTeamId);
    const team = getTeamById(selectedTeamId);
    
    const memberStats = team?.memberIds.map(memberId => {
      const memberTasks = teamTasks.filter(t => t.assigneeId === memberId);
      const user = getUserById(memberId);
      return {
        userId: memberId,
        name: user?.name || 'Unknown',
        initials: user?.initials || '??',
        completed: memberTasks.filter(t => t.status === 'Done').length,
        inProgress: memberTasks.filter(t => t.status === 'In Progress').length,
        overdue: memberTasks.filter(t => t.isOverdue).length,
        blocked: memberTasks.filter(t => t.blocked).length,
      };
    }) || [];

    const totalCompleted = teamTasks.filter(t => t.status === 'Done').length;
    const totalOverdue = teamTasks.filter(t => t.isOverdue).length;
    const totalBlocked = teamTasks.filter(t => t.blocked).length;

    return {
      teamName: team?.name || 'Unknown Team',
      totalTasks: teamTasks.length,
      completed: totalCompleted,
      overdue: totalOverdue,
      blocked: totalBlocked,
      memberStats,
      attentionRequired: memberStats.filter(m => m.overdue > 0 || m.blocked > 0),
    };
  }, [tasks, selectedTeamId]);

  const selectedUser = getUserById(selectedUserId);

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[16px] font-semibold text-text-primary">Weekly Insights</h2>
          <p className="text-[13px] text-text-muted">{formatDateRange()}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex rounded-md border border-border-default overflow-hidden">
            <button
              onClick={() => setViewMode('individual')}
              className={cn(
                'px-3 py-1.5 text-[12px] font-medium transition-colors',
                viewMode === 'individual' 
                  ? 'bg-brand-primary text-white' 
                  : 'bg-surface-card text-text-secondary hover:bg-surface-muted'
              )}
            >
              Individual
            </button>
            <button
              onClick={() => setViewMode('team')}
              className={cn(
                'px-3 py-1.5 text-[12px] font-medium transition-colors',
                viewMode === 'team' 
                  ? 'bg-brand-primary text-white' 
                  : 'bg-surface-card text-text-secondary hover:bg-surface-muted'
              )}
            >
              Team
            </button>
          </div>
          
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {viewMode === 'individual' ? (
        <div className="space-y-6">
          {/* Person Selector */}
          <div className="flex items-center gap-4">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-white">
                        {u.initials}
                      </div>
                      {u.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Badge - text only, no backgrounds */}
            {individualInsights.status === 'on_track' && (
              <span className="text-green-400 text-[12px] font-medium flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                On Track
              </span>
            )}
            {individualInsights.status === 'needs_attention' && (
              <span className="text-amber-400 text-[12px] font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Needs Attention
              </span>
            )}
            {individualInsights.status === 'at_risk' && (
              <span className="text-red-400 text-[12px] font-medium flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" />
                At Risk
              </span>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: 'Total Tasks', value: individualInsights.summary.total, icon: FileText, color: 'text-text-primary' },
              { label: 'Completed', value: individualInsights.summary.completed, icon: CheckCircle, color: 'text-status-success' },
              { label: 'In Progress', value: individualInsights.summary.inProgress, icon: Clock, color: 'text-status-warning' },
              { label: 'Overdue', value: individualInsights.summary.overdue, icon: XCircle, color: 'text-status-danger' },
              { label: 'Blocked', value: individualInsights.summary.blocked, icon: AlertTriangle, color: 'text-status-danger' },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-surface-card border border-border-default rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={cn('w-4 h-4', stat.color)} />
                    <span className="text-[11px] font-medium text-text-muted uppercase tracking-wide">{stat.label}</span>
                  </div>
                  <span className={cn('text-[24px] font-semibold', stat.color)}>{stat.value}</span>
                </div>
              );
            })}
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {/* Achieved This Week */}
            <div className="bg-surface-card border border-border-default rounded-lg p-4">
              <h3 className="text-[12px] font-semibold text-text-primary uppercase tracking-wide mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500/60" />
                Achieved This Week
              </h3>
              {individualInsights.achieved.length > 0 ? (
                <ul className="space-y-2">
                  {individualInsights.achieved.map(task => (
                    <li key={task.id} className="text-[13px] text-text-primary flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
                      {task.title}
                      <span className="font-mono text-[11px] text-text-muted">({task.key})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-text-muted italic">No tasks completed this week</p>
              )}
            </div>

            {/* In Progress */}
            <div className="bg-surface-card border border-border-default rounded-lg p-4">
              <h3 className="text-[12px] font-semibold text-text-primary uppercase tracking-wide mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500/60" />
                In Progress
              </h3>
              {individualInsights.inProgress.length > 0 ? (
                <ul className="space-y-2">
                  {individualInsights.inProgress.map(task => (
                    <li key={task.id} className="text-[13px] text-text-primary flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
                      {task.title}
                      <span className="font-mono text-[11px] text-text-muted">({task.key})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-text-muted italic">No tasks in progress</p>
              )}
            </div>

            {/* Not Achieved / Overdue */}
            <div className="bg-surface-card border border-border-default rounded-lg p-4">
              <h3 className="text-[12px] font-semibold text-text-primary uppercase tracking-wide mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500/60" />
                Not Achieved / Overdue
              </h3>
              {individualInsights.notAchieved.length > 0 ? (
                <ul className="space-y-2">
                  {individualInsights.notAchieved.map(task => (
                    <li key={task.id} className="text-[13px] text-text-primary flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
                      {task.title}
                      <span className="font-mono text-[11px] text-text-muted">({task.key})</span>
                      <span className="text-[11px] text-red-400">{task.daysOverdue}d overdue</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-text-muted italic">No overdue tasks</p>
              )}
            </div>

            {/* Blockers */}
            <div className="bg-surface-card border border-border-default rounded-lg p-4">
              <h3 className="text-[12px] font-semibold text-text-primary uppercase tracking-wide mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500/60" />
                Blockers
              </h3>
              {individualInsights.blockers.length > 0 ? (
                <ul className="space-y-3">
                  {individualInsights.blockers.map(({ task, reason, daysSinceBlocked }) => (
                    <li key={task.id} className="text-[13px]">
                      <div className="flex items-center gap-3 text-text-primary">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
                        {task.title}
                        <span className="font-mono text-[11px] text-text-muted">({task.key})</span>
                      </div>
                      <p className="text-[12px] text-gray-500 ml-4 mt-1 italic">
                        {reason}
                      </p>
                      <p className="text-[11px] text-amber-400 ml-4">
                        ({daysSinceBlocked} days blocked)
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-text-muted italic">No blockers</p>
              )}
            </div>

            {/* Manager Follow-up Notes */}
            <div className="bg-surface-card border border-border-default rounded-lg p-4">
              <h3 className="text-[12px] font-semibold text-text-primary uppercase tracking-wide mb-3">
                Manager Follow-up Notes
              </h3>
              <Textarea
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                placeholder="Add notes for follow-up..."
                className="text-[13px] min-h-[100px]"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Team View */
        <div className="space-y-6">
          {/* Team Selector */}
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teams.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Team Summary */}
          <div className="bg-surface-card border border-border-default rounded-lg p-6">
            <h3 className="text-[16px] font-semibold text-text-primary mb-4">{teamInsights.teamName}</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <span className="text-[11px] text-text-muted uppercase tracking-wide">Total Tasks</span>
                <p className="text-[24px] font-semibold text-text-primary">{teamInsights.totalTasks}</p>
              </div>
              <div>
                <span className="text-[11px] text-text-muted uppercase tracking-wide">Completed</span>
                <p className="text-[24px] font-semibold text-status-success">{teamInsights.completed}</p>
              </div>
              <div>
                <span className="text-[11px] text-text-muted uppercase tracking-wide">Overdue</span>
                <p className="text-[24px] font-semibold text-status-danger">{teamInsights.overdue}</p>
              </div>
              <div>
                <span className="text-[11px] text-text-muted uppercase tracking-wide">Blocked</span>
                <p className="text-[24px] font-semibold text-status-danger">{teamInsights.blocked}</p>
              </div>
            </div>
          </div>

          {/* Member Breakdown */}
          <div className="bg-surface-card border border-border-default rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border-default">
              <h3 className="text-[12px] font-semibold text-text-primary uppercase tracking-wide">Team Members</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-surface-muted">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wide">Member</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wide">Completed</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wide">In Progress</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wide">Overdue</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wide">Blocked</th>
                </tr>
              </thead>
              <tbody>
                {teamInsights.memberStats.map((member) => (
                  <tr key={member.userId} className="border-b border-border-subtle">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-white">
                          {member.initials}
                        </div>
                        <span className="text-[13px] text-text-primary">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-[13px] text-text-primary font-medium">{member.completed}</td>
                    <td className="px-4 py-3 text-center text-[13px] text-text-primary font-medium">{member.inProgress}</td>
                    <td className="px-4 py-3 text-center text-[13px] font-medium">{member.overdue > 0 ? <span className="text-red-400">{member.overdue}</span> : <span className="text-text-muted">—</span>}</td>
                    <td className="px-4 py-3 text-center text-[13px] font-medium">{member.blocked > 0 ? <span className="text-amber-400">{member.blocked}</span> : <span className="text-text-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Attention Required */}
          {teamInsights.attentionRequired.length > 0 && (
            <div className="bg-status-warning-bg border border-status-warning/20 rounded-lg p-4">
              <h3 className="text-[12px] font-semibold text-status-warning uppercase tracking-wide mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Attention Required
              </h3>
              <ul className="space-y-2">
                {teamInsights.attentionRequired.map((member) => (
                  <li key={member.userId} className="text-[13px] text-text-primary">
                    <span className="font-medium">{member.name}</span>: 
                    {member.overdue > 0 && <span className="text-status-danger ml-2">{member.overdue} overdue</span>}
                    {member.blocked > 0 && <span className="text-status-danger ml-2">{member.blocked} blocked</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default WorkManagerInsights;