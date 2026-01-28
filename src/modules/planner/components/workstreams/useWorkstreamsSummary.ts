// ============================================================
// WORKSTREAMS SUMMARY HOOK
// Fetches aggregated workstream data with task counts and health
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WorkstreamData, WorkstreamsSummary, WorkstreamMember } from './types';
import { calculateHealth, getWorkstreamCode } from './types';

interface RawWorkstreamRow {
  id: string;
  name: string;
  color: string | null;
}

interface TaskAggregation {
  workstream_id: string;
  task_count: number;
  overdue_count: number;
  completed_count: number;
  in_progress_count: number;
  backlog_count: number;
  members: WorkstreamMember[];
}

export function useWorkstreamsSummary() {
  return useQuery({
    queryKey: ['workstreams-summary'],
    queryFn: async (): Promise<{ workstreams: WorkstreamData[]; summary: WorkstreamsSummary }> => {
      // Fetch workstreams with color from database
      const { data: workstreamsRaw, error: wsError } = await supabase
        .from('planner_workstreams')
        .select('id, name, color')
        .order('sort_order');

      if (wsError) throw wsError;

      // Fetch tasks with aggregations per workstream
      const { data: tasksRaw, error: tasksError } = await supabase
        .from('planner_tasks')
        .select(`
          id,
          workstream_id,
          status_id,
          due_date,
          assignee_id,
          planner_statuses(slug),
          assignee:profiles!planner_tasks_assignee_id_fkey(id, full_name)
        `)
        .is('deleted_at', null);

      if (tasksError) throw tasksError;

      // Aggregate by workstream
      const aggregations = new Map<string, TaskAggregation>();
      const membersByWorkstream = new Map<string, Map<string, WorkstreamMember>>();

      const today = new Date().toISOString().split('T')[0];

      (tasksRaw || []).forEach((task: any) => {
        const wsId = task.workstream_id;
        if (!wsId) return;

        const statusSlug = task.planner_statuses?.slug || 'backlog';
        const isOverdue = task.due_date && task.due_date < today && statusSlug !== 'done';
        const isDone = statusSlug === 'done';
        const isInProgress = statusSlug === 'in-progress';
        const isBacklog = statusSlug === 'backlog' || statusSlug === 'planned';

        // Get or create aggregation
        let agg = aggregations.get(wsId);
        if (!agg) {
          agg = {
            workstream_id: wsId,
            task_count: 0,
            overdue_count: 0,
            completed_count: 0,
            in_progress_count: 0,
            backlog_count: 0,
            members: [],
          };
          aggregations.set(wsId, agg);
        }

        agg.task_count++;
        if (isOverdue) agg.overdue_count++;
        if (isDone) agg.completed_count++;
        if (isInProgress) agg.in_progress_count++;
        if (isBacklog) agg.backlog_count++;

        // Track unique members
        if (task.assignee_id && task.assignee) {
          let wsMembers = membersByWorkstream.get(wsId);
          if (!wsMembers) {
            wsMembers = new Map();
            membersByWorkstream.set(wsId, wsMembers);
          }
          if (!wsMembers.has(task.assignee_id)) {
            const fullName = task.assignee.full_name || 'Unknown';
            const nameParts = fullName.split(' ');
            const initials = nameParts.length >= 2
              ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
              : fullName.slice(0, 2).toUpperCase();
            
            // Generate a color based on the assignee id
            const colors = ['#2563eb', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1'];
            const colorIndex = task.assignee_id.charCodeAt(0) % colors.length;
            
            wsMembers.set(task.assignee_id, {
              id: task.assignee_id,
              initials,
              color: colors[colorIndex],
            });
          }
        }
      });

      // Build workstream data
      const workstreams: WorkstreamData[] = (workstreamsRaw || []).map((ws: RawWorkstreamRow) => {
        const agg = aggregations.get(ws.id);
        const members = membersByWorkstream.get(ws.id);
        
        const taskCount = agg?.task_count || 0;
        const overdueCount = agg?.overdue_count || 0;
        const completedCount = agg?.completed_count || 0;
        const inProgressCount = agg?.in_progress_count || 0;
        const backlogCount = agg?.backlog_count || 0;
        const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;
        const health = calculateHealth(overdueCount, taskCount, completedCount, backlogCount);

        return {
          id: ws.id,
          name: ws.name,
          code: getWorkstreamCode(ws.name),
          color: ws.color || '#64748b', // Use database color, fallback to slate
          task_count: taskCount,
          overdue_count: overdueCount,
          completed_count: completedCount,
          in_progress_count: inProgressCount,
          backlog_count: backlogCount,
          progress,
          members: members ? Array.from(members.values()) : [],
          health,
        };
      });

      // Calculate summary
      const totalTasks = workstreams.reduce((sum, ws) => sum + ws.task_count, 0);
      const totalCompleted = workstreams.reduce((sum, ws) => sum + ws.completed_count, 0);
      const overallProgress = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
      const criticalCount = workstreams.filter(ws => ws.health === 'critical').length;
      const atRiskCount = workstreams.filter(ws => ws.health === 'at-risk').length;
      const healthyCount = workstreams.filter(ws => ws.health === 'healthy').length;

      const summary: WorkstreamsSummary = {
        totalWorkstreams: workstreams.length,
        totalTasks,
        overallProgress,
        atRiskCount,
        criticalCount,
        healthyCount,
      };

      return { workstreams, summary };
    },
    staleTime: 60000,
  });
}
