// src/components/work-manager/WorkManagerInsights.tsx
// Weekly Insights View

import { useState, useMemo, useRef } from 'react';
import { CheckCircle, Clock, AlertTriangle, XCircle, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { ManagerFollowUpNotes } from './ManagerFollowUpNotes';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

interface WorkManagerInsightsProps {
  tasks: TaskExtended[];
}

type ViewMode = 'individual' | 'team';

export function WorkManagerInsights({ tasks }: WorkManagerInsightsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('individual');
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || '');
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id || '');

  // Get current week range
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const formatDateRange = () => {
    return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  // Export PDF function
  const handleExportPdf = (insights: any, teamData: any) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Work Manager - Weekly Insights', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Date range
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDateRange(), pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      if (viewMode === 'individual') {
        const user = getUserById(selectedUserId);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Individual Report: ${user?.name || 'Unknown'}`, 20, yPos);
        yPos += 12;

        // Summary stats
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Completed: ${insights.summary.completed}`, 20, yPos);
        yPos += 7;
        doc.text(`In Progress: ${insights.summary.inProgress}`, 20, yPos);
        yPos += 7;
        doc.text(`Overdue: ${insights.summary.overdue}`, 20, yPos);
        yPos += 7;
        doc.text(`Blocked: ${insights.summary.blocked}`, 20, yPos);
        yPos += 15;

        // Completed tasks
        if (insights.achieved.length > 0) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Completed This Week:', 20, yPos);
          yPos += 8;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          insights.achieved.slice(0, 10).forEach((task: TaskExtended) => {
            if (yPos > 270) { doc.addPage(); yPos = 20; }
            doc.text(`• ${task.title}`, 25, yPos);
            yPos += 6;
          });
          yPos += 5;
        }

        // In progress tasks
        if (insights.inProgress.length > 0) {
          if (yPos > 250) { doc.addPage(); yPos = 20; }
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('In Progress:', 20, yPos);
          yPos += 8;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          insights.inProgress.slice(0, 10).forEach((task: TaskExtended) => {
            if (yPos > 270) { doc.addPage(); yPos = 20; }
            doc.text(`• ${task.title}`, 25, yPos);
            yPos += 6;
          });
        }
      } else {
        const team = getTeamById(selectedTeamId);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Team Report: ${team?.name || 'Unknown'}`, 20, yPos);
        yPos += 12;

        // Team summary
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Tasks: ${teamData.totalTasks}`, 20, yPos);
        yPos += 7;
        doc.text(`Completed: ${teamData.completed}`, 20, yPos);
        yPos += 7;
        doc.text(`Overdue: ${teamData.overdue}`, 20, yPos);
        yPos += 7;
        doc.text(`Blocked: ${teamData.blocked}`, 20, yPos);
        yPos += 15;

        // Member breakdown
        if (teamData.memberStats.length > 0) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Team Members:', 20, yPos);
          yPos += 8;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          teamData.memberStats.forEach((member: any) => {
            if (yPos > 270) { doc.addPage(); yPos = 20; }
            doc.text(`• ${member.name}: ${member.completed} done, ${member.inProgress} active, ${member.overdue} overdue`, 25, yPos);
            yPos += 6;
          });
        }
      }

      // Save PDF
      const filename = viewMode === 'individual' 
        ? `insights-${getUserById(selectedUserId)?.name?.replace(/\s+/g, '-').toLowerCase() || 'report'}-${today.toISOString().split('T')[0]}.pdf`
        : `insights-${getTeamById(selectedTeamId)?.name?.replace(/\s+/g, '-').toLowerCase() || 'team'}-${today.toISOString().split('T')[0]}.pdf`;
      
      doc.save(filename);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
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
    <div className="max-w-4xl animate-fade-in">
      {/* Header - Premium treatment */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-primary to-success rounded-full" />
          <div>
            <h2 className="text-xl font-bold text-foreground tracking-tight">Weekly Insights</h2>
            <p className="text-[13px] text-muted-foreground mt-0.5">{formatDateRange()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle - Premium */}
          <div className="flex rounded-lg border border-border dark:border-gray-700 overflow-hidden shadow-xs">
            <button
              onClick={() => setViewMode('individual')}
              className={cn(
                'px-4 py-2 text-[12px] font-semibold transition-all duration-200',
                viewMode === 'individual' 
                  ? 'bg-primary text-primary-foreground shadow-brand' 
                  : 'bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              Individual
            </button>
            <button
              onClick={() => setViewMode('team')}
              className={cn(
                'px-4 py-2 text-[12px] font-semibold transition-all duration-200',
                viewMode === 'team' 
                  ? 'bg-primary text-primary-foreground shadow-brand' 
                  : 'bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              Team
            </button>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 shadow-xs hover:shadow-sm transition-shadow"
            onClick={() => handleExportPdf(individualInsights, teamInsights)}
          >
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
              <SelectTrigger className="w-[280px] shadow-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="shadow-elevated">
                {users.map((u, idx) => {
                  // Distinct avatar colors cycling through brand palette (CSS variables)
                  const avatarColors = ['hsl(var(--success))', 'hsl(var(--primary))', 'hsl(var(--muted-foreground))', 'hsl(var(--warning))', 'hsl(var(--brand-teal))'];
                  const avatarColor = avatarColors[idx % avatarColors.length];
                  return (
                    <SelectItem key={u.id} value={u.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {u.initials}
                        </div>
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Status Badge - Premium treatment */}
            {individualInsights.status === 'on_track' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success border border-success/20 rounded-lg text-[12px] font-semibold shadow-xs">
                <CheckCircle className="w-4 h-4" />
                On Track
              </span>
            )}
            {individualInsights.status === 'needs_attention' && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-warning/10 border border-warning/30 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="text-warning text-[13px] font-medium">Needs Attention</span>
              </div>
            )}
            {individualInsights.status === 'at_risk' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-danger/10 text-danger border border-danger/20 rounded-lg text-[12px] font-semibold shadow-xs">
                <XCircle className="w-4 h-4" />
                At Risk
              </span>
            )}
          </div>

          {/* Summary Stats - Clean minimal cards */}
          <div className="bg-surface-card border border-border-default rounded-xl p-6 shadow-card">
            <div className="grid grid-cols-4 gap-8">
              {[
                { label: 'TOTAL TASKS', value: individualInsights.summary.total, textColor: 'text-foreground' },
                { label: 'COMPLETED', value: individualInsights.summary.completed, textColor: 'text-success' },
                { label: 'OVERDUE', value: individualInsights.summary.overdue, textColor: 'text-danger' },
                { label: 'BLOCKED', value: individualInsights.summary.blocked, textColor: 'text-warning' },
              ].map((stat) => (
                <div key={stat.label}>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                  <div className={cn('text-3xl font-bold tracking-tight mt-1', stat.textColor)}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {/* Achieved This Week */}
            <div className="bg-surface-card border border-border-default rounded-lg p-4">
              <h3 className="text-[12px] font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Achieved This Week
              </h3>
              {individualInsights.achieved.length > 0 ? (
                <ul className="space-y-2">
                  {individualInsights.achieved.map(task => (
                    <li key={task.id} className="text-[13px] text-foreground flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
                      {task.title}
                      <span className="font-mono text-[11px] text-muted-foreground">({task.key})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-muted-foreground italic">No tasks completed this week</p>
              )}
            </div>

            {/* In Progress */}
            <div className="bg-surface-card border border-border-default rounded-lg p-4">
              <h3 className="text-[12px] font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-warning" />
                In Progress
              </h3>
              {individualInsights.inProgress.length > 0 ? (
                <ul className="space-y-2">
                  {individualInsights.inProgress.map(task => (
                    <li key={task.id} className="text-[13px] text-foreground flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
                      {task.title}
                      <span className="font-mono text-[11px] text-muted-foreground">({task.key})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-muted-foreground italic">No tasks in progress</p>
              )}
            </div>

            {/* Not Achieved / Overdue */}
            <div className="bg-surface-card border border-border-default rounded-lg p-4">
              <h3 className="text-[12px] font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-danger" />
                Not Achieved / Overdue
              </h3>
              {individualInsights.notAchieved.length > 0 ? (
                <ul className="space-y-2">
                  {individualInsights.notAchieved.map(task => (
                    <li key={task.id} className="text-[13px] text-foreground flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
                      {task.title}
                      <span className="font-mono text-[11px] text-muted-foreground">({task.key})</span>
                      <span className="text-[11px] text-danger font-medium">{task.daysOverdue}d overdue</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-muted-foreground italic">No overdue tasks</p>
              )}
            </div>

            {/* Blockers */}
            <div className="bg-surface-card border border-border-default rounded-lg p-4">
              <h3 className="text-[12px] font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Blockers
              </h3>
              {individualInsights.blockers.length > 0 ? (
                <ul className="space-y-3">
                  {individualInsights.blockers.map(({ task, reason, daysSinceBlocked }) => (
                    <li key={task.id} className="text-[13px]">
                      <div className="flex items-center gap-3 text-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
                        {task.title}
                        <span className="font-mono text-[11px] text-muted-foreground">({task.key})</span>
                      </div>
                      <p className="text-[12px] text-muted-foreground ml-4 mt-1 italic">
                        {reason}
                      </p>
                      <p className="text-[11px] text-danger font-medium ml-4">
                        ({daysSinceBlocked} days blocked)
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-muted-foreground italic">No blockers</p>
              )}
            </div>

            {/* Manager Follow-up Notes */}
            <ManagerFollowUpNotes
              userId={selectedUserId}
              teamId={selectedUser ? teams.find(t => t.memberIds.includes(selectedUserId))?.id || null : null}
              weekStart={weekStart}
              memberName={selectedUser?.name}
            />
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
            <h3 className="text-[16px] font-semibold text-foreground mb-4">{teamInsights.teamName}</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Total Tasks</span>
                <p className="text-[24px] font-semibold text-foreground">{teamInsights.totalTasks}</p>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Completed</span>
                <p className="text-[24px] font-semibold text-status-success">{teamInsights.completed}</p>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Overdue</span>
                <p className="text-[24px] font-semibold text-status-danger">{teamInsights.overdue}</p>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Blocked</span>
                <p className="text-[24px] font-semibold text-status-danger">{teamInsights.blocked}</p>
              </div>
            </div>
          </div>

          {/* Member Breakdown */}
          <div className="bg-surface-card border border-border-default rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border-default">
              <h3 className="text-[12px] font-semibold text-foreground uppercase tracking-wide">Team Members</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-surface-muted">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Member</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Completed</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">In Progress</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Overdue</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Blocked</th>
                </tr>
              </thead>
              <tbody>
                {teamInsights.memberStats.map((member, idx) => {
                  // Distinct avatar colors cycling through brand palette (CSS variables)
                  const avatarColors = ['hsl(var(--success))', 'hsl(var(--primary))', 'hsl(var(--muted-foreground))', 'hsl(var(--warning))', 'hsl(var(--brand-teal))'];
                  const avatarColor = avatarColors[idx % avatarColors.length];
                  return (
                    <tr key={member.userId} className="border-b border-border-subtle hover:bg-muted/50 transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                            style={{ backgroundColor: avatarColor }}
                          >
                            {member.initials}
                          </div>
                          <span className="text-[13px] text-foreground">{member.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-[13px] text-foreground font-medium">{member.completed}</td>
                      <td className="px-4 py-3 text-center text-[13px] text-foreground font-medium">{member.inProgress}</td>
                      <td className="px-4 py-3 text-center text-[13px] font-medium">{member.overdue > 0 ? <span className="text-danger">{member.overdue}</span> : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-3 text-center text-[13px] font-medium">{member.blocked > 0 ? <span className="text-warning">{member.blocked}</span> : <span className="text-muted-foreground">—</span>}</td>
                    </tr>
                  );
                })}
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
                  <li key={member.userId} className="text-[13px] text-foreground">
                    <span className="font-medium">{member.name}</span>: 
                    {member.overdue > 0 && <span className="text-danger ml-2">{member.overdue} overdue</span>}
                    {member.blocked > 0 && <span className="text-warning ml-2">{member.blocked} blocked</span>}
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