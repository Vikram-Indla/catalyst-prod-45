// ============================================================
// PLANNER TEAM PERFORMANCE VIEW
// Team health scores, member table, and AI insights
// ============================================================

import { useMemo } from 'react';
import { Sparkles, TrendingUp, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlannerTask, PlannerUser } from '../types';
import { motion } from 'framer-motion';

interface PlannerTeamPerformanceProps {
  tasks: PlannerTask[];
  onTaskClick: (task: PlannerTask) => void;
}

interface MemberStats {
  id: string;
  name: string;
  initials: string;
  role: string;
  healthScore: number;
  totalTasks: number;
  completed: number;
  overdue: number;
  blocked: number;
  onTimePercentage: number;
}

export function PlannerTeamPerformance({ tasks, onTaskClick }: PlannerTeamPerformanceProps) {
  // Calculate member statistics
  const memberStats = useMemo((): MemberStats[] => {
    const statsMap = new Map<string, MemberStats>();

    tasks.forEach(task => {
      if (!task.assigneeId) return;

      const existing = statsMap.get(task.assigneeId) || {
        id: task.assigneeId,
        name: task.assigneeName || 'Unknown',
        initials: task.assigneeInitials || '??',
        role: 'Team Member',
        healthScore: 100,
        totalTasks: 0,
        completed: 0,
        overdue: 0,
        blocked: 0,
        onTimePercentage: 100,
      };

      existing.totalTasks++;
      
      if (task.status === 'done') {
        existing.completed++;
      }
      
      if (task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done') {
        existing.overdue++;
      }
      
      if (task.blocked) {
        existing.blocked++;
      }

      // Calculate health score: 100 - (overdue * 15) - (blocked * 10)
      existing.healthScore = Math.max(0, 100 - (existing.overdue * 15) - (existing.blocked * 10));
      
      // Calculate on-time percentage
      if (existing.completed > 0) {
        existing.onTimePercentage = Math.round(
          ((existing.completed - existing.overdue) / existing.completed) * 100
        );
      }

      statsMap.set(task.assigneeId, existing);
    });

    return Array.from(statsMap.values()).sort((a, b) => b.healthScore - a.healthScore);
  }, [tasks]);

  // Calculate team-level KPIs
  const teamKPIs = useMemo(() => {
    const totalMembers = memberStats.length || 1;
    const avgHealth = memberStats.reduce((sum, m) => sum + m.healthScore, 0) / totalMembers;
    const totalCompleted = memberStats.reduce((sum, m) => sum + m.completed, 0);
    const totalBlocked = memberStats.reduce((sum, m) => sum + m.blocked, 0);
    const avgCompleted = totalCompleted / totalMembers;

    return {
      teamHealthScore: Math.round(avgHealth),
      avgCompleted: Math.round(avgCompleted * 10) / 10,
      totalTasks: tasks.filter(t => t.status === 'done').length,
      blockedItems: totalBlocked,
    };
  }, [memberStats, tasks]);

  // Generate AI insight
  const aiInsight = useMemo(() => {
    const lowPerformers = memberStats.filter(m => m.healthScore < 70);
    const highPerformers = memberStats.filter(m => m.healthScore >= 90);
    const blockedCount = teamKPIs.blockedItems;

    if (lowPerformers.length > 0) {
      return {
        message: `${lowPerformers.map(m => m.name.split(' ')[0]).join(' and ')} ${lowPerformers.length === 1 ? 'has' : 'have'} below-average health scores. Consider redistributing workload or addressing blockers.`,
        type: 'warning' as const,
      };
    }
    
    if (blockedCount > 2) {
      return {
        message: `There are ${blockedCount} blocked items across the team. Prioritize unblocking these to improve velocity.`,
        type: 'warning' as const,
      };
    }
    
    if (highPerformers.length === memberStats.length && memberStats.length > 0) {
      return {
        message: 'Team is performing excellently! All members have healthy workloads and are on track.',
        type: 'success' as const,
      };
    }

    return {
      message: 'Team performance is steady. Continue monitoring blocked items and overdue tasks.',
      type: 'info' as const,
    };
  }, [memberStats, teamKPIs]);

  return (
    <div className="h-full overflow-y-auto bg-surface-0">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-0 px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Team Performance</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Sprint 12 • Jan 6 - Jan 19
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { 
              label: 'Team Health Score', 
              value: `${teamKPIs.teamHealthScore}%`,
              icon: TrendingUp,
              color: teamKPIs.teamHealthScore >= 80 ? '#10b981' : teamKPIs.teamHealthScore >= 60 ? '#d97706' : '#ef4444',
            },
            { 
              label: 'Avg. Completed/Member', 
              value: teamKPIs.avgCompleted.toString(),
              icon: CheckCircle2,
              color: '#3b82f6',
            },
            { 
              label: 'Total Tasks Done', 
              value: teamKPIs.totalTasks.toString(),
              icon: Users,
              color: '#10b981',
            },
            { 
              label: 'Blocked Items', 
              value: teamKPIs.blockedItems.toString(),
              icon: AlertCircle,
              color: teamKPIs.blockedItems > 0 ? '#d97706' : '#6b7280',
            },
          ].map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-surface-1 rounded-xl p-4 border border-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-muted">{kpi.label}</span>
                  <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
                <span className="text-3xl font-bold text-text-primary">{kpi.value}</span>
              </motion.div>
            );
          })}
        </div>

        {/* AI Team Insight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={cn(
            "rounded-xl p-4 border",
            aiInsight.type === 'success' && "bg-green-50 border-green-200",
            aiInsight.type === 'warning' && "bg-orange-50 border-orange-200",
            aiInsight.type === 'info' && "bg-blue-50 border-blue-200"
          )}
        >
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
              aiInsight.type === 'success' && "bg-green-600",
              aiInsight.type === 'warning' && "bg-orange-600",
              aiInsight.type === 'info' && "bg-blue-600"
            )}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className={cn(
                "font-semibold mb-1",
                aiInsight.type === 'success' && "text-green-900",
                aiInsight.type === 'warning' && "text-orange-900",
                aiInsight.type === 'info' && "text-blue-900"
              )}>
                AI Team Insight
              </h3>
              <p className={cn(
                "text-sm",
                aiInsight.type === 'success' && "text-green-800",
                aiInsight.type === 'warning' && "text-orange-800",
                aiInsight.type === 'info' && "text-blue-800"
              )}>
                {aiInsight.message}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Member Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-surface-1 rounded-xl border border-border overflow-hidden"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="text-left px-4 py-3 font-semibold text-text-muted">Member</th>
                <th className="text-left px-4 py-3 font-semibold text-text-muted">Health</th>
                <th className="text-center px-4 py-3 font-semibold text-text-muted">Tasks</th>
                <th className="text-center px-4 py-3 font-semibold text-text-muted">Completed</th>
                <th className="text-center px-4 py-3 font-semibold text-text-muted">Overdue</th>
                <th className="text-center px-4 py-3 font-semibold text-text-muted">Blocked</th>
                <th className="text-center px-4 py-3 font-semibold text-text-muted">On-Time %</th>
              </tr>
            </thead>
            <tbody>
              {memberStats.map((member, index) => (
                <motion.tr
                  key={member.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.05 }}
                  className="border-b border-border last:border-0 hover:bg-surface-0 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium">
                        {member.initials}
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{member.name}</p>
                        <p className="text-xs text-text-muted">{member.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-surface-2 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all",
                            member.healthScore >= 80 && "bg-green-500",
                            member.healthScore >= 60 && member.healthScore < 80 && "bg-yellow-500",
                            member.healthScore < 60 && "bg-red-500"
                          )}
                          style={{ width: `${member.healthScore}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-muted w-8">{member.healthScore}%</span>
                    </div>
                  </td>
                  <td className="text-center px-4 py-3 text-text-primary">
                    {member.totalTasks}
                  </td>
                  <td className="text-center px-4 py-3">
                    <span className="text-green-600 font-medium">{member.completed}</span>
                  </td>
                  <td className="text-center px-4 py-3">
                    {member.overdue > 0 ? (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                        {member.overdue}
                      </span>
                    ) : (
                      <span className="text-text-muted">0</span>
                    )}
                  </td>
                  <td className="text-center px-4 py-3">
                    {member.blocked > 0 ? (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                        {member.blocked}
                      </span>
                    ) : (
                      <span className="text-text-muted">0</span>
                    )}
                  </td>
                  <td className="text-center px-4 py-3">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      member.onTimePercentage >= 80 && "bg-green-100 text-green-700",
                      member.onTimePercentage >= 60 && member.onTimePercentage < 80 && "bg-yellow-100 text-yellow-700",
                      member.onTimePercentage < 60 && "bg-red-100 text-red-700"
                    )}>
                      {member.onTimePercentage}%
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {memberStats.length === 0 && (
            <div className="flex items-center justify-center py-12 text-text-muted">
              No team members with assigned tasks
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
