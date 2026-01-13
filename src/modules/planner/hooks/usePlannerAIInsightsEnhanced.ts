// ============================================================
// PLANNER AI INSIGHTS HOOK - ENHANCED
// Generates comprehensive insights: overdue, due soon, stale, by team, unassigned
// ============================================================

import { useMemo, useState, useCallback } from 'react';
import { differenceInDays, addDays, isBefore, isAfter } from 'date-fns';
import type { 
  PlannerTask, 
  PlannerUser, 
  PlannerTeam,
  AIInsightsResult,
  AIInsightsSummary,
  TaskInsight,
  TeamInsight,
  ResourceInsight,
  UnassignedTask,
  AIInsight,
  TaskStatus,
} from '../types';
import { AVATAR_COLORS } from '../types';

const STALE_DAYS = 7;
const DUE_SOON_DAYS = 7;

interface UsePlannerAIInsightsEnhancedOptions {
  tasks: PlannerTask[];
  users: PlannerUser[];
  teams: PlannerTeam[];
}

export function usePlannerAIInsightsEnhanced({
  tasks,
  users,
  teams,
}: UsePlannerAIInsightsEnhancedOptions): AIInsightsResult {
  const [isLoading, setIsLoading] = useState(false);

  const now = useMemo(() => new Date(), []);

  // Active tasks only (not done)
  const activeTasks = useMemo(() => 
    tasks.filter(t => t.status !== 'done'),
    [tasks]
  );

  // OVERDUE TASKS
  const overdueTasks = useMemo(() => {
    return activeTasks
      .filter(t => t.dueDate && isBefore(new Date(t.dueDate), now))
      .map(t => toTaskInsight(t, users, teams, 'overdue', now))
      .sort((a, b) => {
        const aDays = parseDaysFromInfo(a.dueInfo);
        const bDays = parseDaysFromInfo(b.dueInfo);
        return bDays - aDays; // Most overdue first
      });
  }, [activeTasks, users, teams, now]);

  // DUE SOON TASKS
  const dueSoonTasks = useMemo(() => {
    const weekFromNow = addDays(now, DUE_SOON_DAYS);
    return activeTasks
      .filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return isAfter(due, now) && isBefore(due, weekFromNow);
      })
      .map(t => toTaskInsight(t, users, teams, 'due-soon', now))
      .sort((a, b) => parseDaysFromInfo(a.dueInfo) - parseDaysFromInfo(b.dueInfo));
  }, [activeTasks, users, teams, now]);

  // STALE TASKS
  const staleTasks = useMemo(() => {
    const threshold = addDays(now, -STALE_DAYS);
    return activeTasks
      .filter(t => isBefore(new Date(t.updatedAt), threshold))
      .map(t => toTaskInsight(t, users, teams, 'stale', now))
      .sort((a, b) => {
        const aDays = parseDaysFromInfo(a.dueInfo);
        const bDays = parseDaysFromInfo(b.dueInfo);
        return bDays - aDays; // Oldest first
      });
  }, [activeTasks, users, teams, now]);

  // BY TEAM
  const byTeam = useMemo(() => {
    return teams.map(team => {
      const teamTasks = activeTasks.filter(t => t.teamId === team.id);
      
      // Get members of this team (users who have tasks on this team)
      const teamMemberIds = new Set(
        teamTasks.filter(t => t.assigneeId).map(t => t.assigneeId!)
      );
      
      const overdue = teamTasks.filter(t => t.dueDate && isBefore(new Date(t.dueDate), now));
      const dueSoon = teamTasks.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return isAfter(due, now) && isBefore(due, addDays(now, DUE_SOON_DAYS));
      });

      const members: ResourceInsight[] = Array.from(teamMemberIds)
        .map(userId => {
          const user = users.find(u => u.id === userId);
          if (!user) return null;

          const memberTasks = teamTasks.filter(t => t.assigneeId === userId);
          const memberOverdue = memberTasks.filter(t => t.dueDate && isBefore(new Date(t.dueDate), now));
          const memberDueSoon = memberTasks.filter(t => {
            if (!t.dueDate) return false;
            const due = new Date(t.dueDate);
            return isAfter(due, now) && isBefore(due, addDays(now, DUE_SOON_DAYS));
          });

          return {
            userId: user.id,
            name: user.name,
            initials: user.initials,
            color: getAvatarColor(user.id),
            totalTasks: memberTasks.length,
            overdueCount: memberOverdue.length,
            dueSoonCount: memberDueSoon.length,
          };
        })
        .filter((m): m is ResourceInsight => m !== null)
        .sort((a, b) => {
          // Sort by overdue first, then by total tasks
          if (a.overdueCount !== b.overdueCount) return b.overdueCount - a.overdueCount;
          return b.totalTasks - a.totalTasks;
        });

      return {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color,
        activeCount: teamTasks.length,
        overdueCount: overdue.length,
        dueSoonCount: dueSoon.length,
        members,
      } as TeamInsight;
    }).filter(t => t.activeCount > 0 || t.members.length > 0);
  }, [teams, activeTasks, users, now]);

  // UNASSIGNED TASKS
  const unassignedTasks = useMemo(() => {
    return activeTasks
      .filter(t => !t.assigneeId)
      .map(t => {
        const team = teams.find(tm => tm.id === t.teamId);
        return {
          id: t.id,
          taskKey: t.key,
          title: t.title,
          status: t.status,
          teamId: team?.id,
          teamName: team?.name,
        } as UnassignedTask;
      });
  }, [activeTasks, teams]);

  // SUMMARY
  const summary = useMemo((): AIInsightsSummary => ({
    overdue: overdueTasks.length,
    dueSoon: dueSoonTasks.length,
    stale: staleTasks.length,
    totalActive: activeTasks.length,
    unassigned: unassignedTasks.length,
  }), [overdueTasks, dueSoonTasks, staleTasks, activeTasks, unassignedTasks]);

  // LEGACY INSIGHTS (for backward compatibility)
  const legacyInsights = useMemo(() => {
    const insights: AIInsight[] = [];
    
    // Blocked tasks
    tasks.filter(t => t.blocked).forEach(task => {
      insights.push({
        id: `blocked-${task.id}`,
        type: 'critical',
        title: 'Blocked Task Detected',
        message: `${task.key} "${task.title}" is blocked. ${task.blockedReason || 'Immediate attention required.'}`,
        action: 'View Task',
        taskId: task.key,
        createdAt: new Date().toISOString(),
      });
    });

    // Overdue summary
    if (overdueTasks.length > 0) {
      insights.push({
        id: 'overdue-summary',
        type: 'warning',
        title: `${overdueTasks.length} Overdue Tasks`,
        message: `You have ${overdueTasks.length} tasks past their due date. Review and update timelines.`,
        action: 'View Overdue',
        createdAt: new Date().toISOString(),
      });
    }

    // Due soon summary
    if (dueSoonTasks.length > 0) {
      insights.push({
        id: 'due-soon-summary',
        type: 'info',
        title: `${dueSoonTasks.length} Due Soon`,
        message: `${dueSoonTasks.length} tasks due within the next week.`,
        createdAt: new Date().toISOString(),
      });
    }

    // Positive insight - completed this week
    const completedThisWeek = tasks.filter(t => {
      if (t.status !== 'done') return false;
      const updated = new Date(t.updatedAt);
      const weekAgo = addDays(now, -7);
      return updated > weekAgo;
    }).length;
    
    if (completedThisWeek > 0) {
      insights.push({
        id: 'velocity',
        type: 'success',
        title: 'Good Velocity',
        message: `${completedThisWeek} tasks completed this week. Team is maintaining good momentum.`,
        createdAt: new Date().toISOString(),
      });
    }

    return insights;
  }, [tasks, overdueTasks, dueSoonTasks, now]);

  // REFRESH
  const refresh = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 300);
  }, []);

  return {
    summary,
    overdueTasks,
    dueSoonTasks,
    staleTasks,
    byTeam,
    unassignedTasks,
    legacyInsights,
    isLoading,
    refresh,
  };
}

// ============================================================
// HELPERS
// ============================================================

function toTaskInsight(
  task: PlannerTask,
  users: PlannerUser[],
  teams: PlannerTeam[],
  type: 'overdue' | 'due-soon' | 'stale',
  now: Date
): TaskInsight {
  const user = users.find(u => u.id === task.assigneeId);
  const team = teams.find(t => t.id === task.teamId);

  let dueInfo = '';
  if (type === 'overdue' && task.dueDate) {
    const days = differenceInDays(now, new Date(task.dueDate));
    dueInfo = days === 1 ? '1 day overdue' : `${days} days overdue`;
  } else if (type === 'due-soon' && task.dueDate) {
    const days = differenceInDays(new Date(task.dueDate), now);
    if (days === 0) dueInfo = 'Due today';
    else if (days === 1) dueInfo = 'Due tomorrow';
    else dueInfo = `Due in ${days} days`;
  } else if (type === 'stale') {
    const days = differenceInDays(now, new Date(task.updatedAt));
    dueInfo = `No activity for ${days} days`;
  }

  return {
    id: `${type}-${task.id}`,
    taskId: task.id,
    taskKey: task.key,
    title: task.title,
    type,
    dueInfo,
    assigneeId: user?.id,
    assigneeName: user?.name,
    assigneeInitials: user?.initials,
    assigneeColor: user ? getAvatarColor(user.id) : undefined,
    teamId: team?.id,
    teamName: team?.name,
    teamColor: team?.color,
    status: task.status,
  };
}

function parseDaysFromInfo(dueInfo: string): number {
  if (dueInfo.includes('today')) return 0;
  if (dueInfo.includes('tomorrow')) return 1;
  const match = dueInfo.match(/(\d+)/);
  return match ? parseInt(match[1]) : 999;
}

function getAvatarColor(userId: string): string {
  // Generate consistent color based on user id
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
