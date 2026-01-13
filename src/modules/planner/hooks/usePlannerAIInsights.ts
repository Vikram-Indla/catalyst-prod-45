// ============================================================
// PLANNER AI INSIGHTS HOOK
// Generates AI-style insights based on task data
// ============================================================

import { useMemo } from 'react';
import type { PlannerTask, AIInsight } from '../types';

export function usePlannerAIInsights(tasks: PlannerTask[]): AIInsight[] {
  return useMemo(() => {
    const insights: AIInsight[] = [];
    const now = new Date();

    // Find blocked tasks
    const blockedTasks = tasks.filter(t => t.blocked);
    blockedTasks.forEach(task => {
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

    // Find overdue tasks
    const overdueTasks = tasks.filter(t => 
      t.dueDate && 
      new Date(t.dueDate) < now && 
      t.status !== 'done'
    );
    overdueTasks.slice(0, 2).forEach(task => {
      insights.push({
        id: `overdue-${task.id}`,
        type: 'warning',
        title: 'Overdue Task',
        message: `${task.key} is past its due date. Consider re-prioritizing or updating the timeline.`,
        action: 'Update Due Date',
        taskId: task.key,
        createdAt: new Date().toISOString(),
      });
    });

    // WIP limit warnings
    const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
    if (inProgressCount > 5) {
      insights.push({
        id: 'wip-warning',
        type: 'warning',
        title: 'WIP Limit Exceeded',
        message: `${inProgressCount} tasks are in progress. Consider completing existing work before starting new items.`,
        createdAt: new Date().toISOString(),
      });
    }

    // Review bottleneck
    const reviewCount = tasks.filter(t => t.status === 'review').length;
    if (reviewCount > 3) {
      insights.push({
        id: 'review-bottleneck',
        type: 'info',
        title: 'Review Bottleneck',
        message: `${reviewCount} tasks are waiting for review. Schedule a review session to maintain flow.`,
        createdAt: new Date().toISOString(),
      });
    }

    // Positive insight
    const completedThisWeek = tasks.filter(t => {
      if (t.status !== 'done') return false;
      const updated = new Date(t.updatedAt);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
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
  }, [tasks]);
}
