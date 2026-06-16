/**
 * Planner Dashboard Hooks - V9
 * TanStack Query hooks for dashboard data — properly aggregated from raw task rows.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  DashboardMetrics,
  StatusDistribution,
  WorkstreamHealth,
  UpcomingDeadline,
  TeamWorkload,
} from '../types/planner-dashboard';

const STALE_TIME = 60 * 1000;
const REFETCH_INTERVAL = 2 * 60 * 1000;
const REFETCH_BG = false;

// Raw task shape returned by Supabase with joins
interface RawTask {
  id: string;
  key: string;
  title: string;
  priority: string | null;
  due_date: string | null;
  assignee_id: string | null;
  status_id: string | null;
  workstream_id: string | null;
  deleted_at: string | null;
  status: {
    id: string;
    name: string;
    slug: string;
    color: string;
    position: number;
  } | null;
  workstream: {
    id: string;
    name: string;
    slug: string;
    color: string;
  } | null;
  assignee: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

// Fetch all active tasks with status, workstream, and assignee joined
async function fetchAllTasks(): Promise<RawTask[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      id,
      key,
      title,
      priority,
      due_date,
      assignee_id,
      status_id,
      workstream_id,
      deleted_at,
      status:task_statuses(id, name, slug, color, position),
      workstream:task_workstreams(id, name, slug, color),
      assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as RawTask[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useDashboardMetrics
// ═══════════════════════════════════════════════════════════════════════════════
export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['tasks', 'dashboard', 'metrics'],
    queryFn: async (): Promise<DashboardMetrics> => {
      const tasks = await fetchAllTasks();
      const now = new Date();

      const overdue = tasks.filter(t =>
        t.due_date &&
        new Date(t.due_date) < now &&
        t.status?.slug !== 'done'
      );

      return {
        total_tasks: tasks.length,
        overdue_count: overdue.length,
        blocked_count: 0, // no blocked concept in current schema
        completed_this_week: tasks.filter(t => t.status?.slug === 'done').length,
        critical_count: tasks.filter(t => t.priority === 'critical').length,
        high_count: tasks.filter(t => t.priority === 'high').length,
        medium_count: tasks.filter(t => t.priority === 'medium').length,
        low_count: tasks.filter(t => t.priority === 'low').length,
      };
    },
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    refetchIntervalInBackground: REFETCH_BG,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useStatusDistribution
// ═══════════════════════════════════════════════════════════════════════════════
export function useStatusDistribution() {
  return useQuery({
    queryKey: ['tasks', 'dashboard', 'status-distribution'],
    queryFn: async (): Promise<StatusDistribution[]> => {
      const tasks = await fetchAllTasks();

      // Group tasks by status
      const statusMap = new Map<string, {
        status: RawTask['status'];
        count: number;
      }>();

      for (const task of tasks) {
        if (!task.status) continue;
        const key = task.status.id;
        const existing = statusMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          statusMap.set(key, { status: task.status, count: 1 });
        }
      }

      const total = tasks.length;

      return Array.from(statusMap.values())
        .sort((a, b) => (a.status?.position ?? 0) - (b.status?.position ?? 0))
        .map(({ status, count }) => ({
          status_id: status!.id,
          status_name: status!.name,
          status_slug: status!.slug as StatusDistribution['status_slug'],
          status_color: status!.color,
          position: status!.position,
          task_count: count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        }));
    },
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    refetchIntervalInBackground: REFETCH_BG,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useWorkstreamHealth
// ═══════════════════════════════════════════════════════════════════════════════
export function useWorkstreamHealth() {
  return useQuery({
    queryKey: ['tasks', 'dashboard', 'workstream-health'],
    queryFn: async (): Promise<WorkstreamHealth[]> => {
      const tasks = await fetchAllTasks();
      const now = new Date();

      // Group by workstream
      const wsMap = new Map<string, {
        workstream: RawTask['workstream'];
        total: number;
        completed: number;
        overdue: number;
      }>();

      for (const task of tasks) {
        if (!task.workstream) continue;
        const key = task.workstream.id;
        const isCompleted = task.status?.slug === 'done';
        const isOverdue =
          !isCompleted &&
          !!task.due_date &&
          new Date(task.due_date) < now;

        const existing = wsMap.get(key);
        if (existing) {
          existing.total++;
          if (isCompleted) existing.completed++;
          if (isOverdue) existing.overdue++;
        } else {
          wsMap.set(key, {
            workstream: task.workstream,
            total: 1,
            completed: isCompleted ? 1 : 0,
            overdue: isOverdue ? 1 : 0,
          });
        }
      }

      return Array.from(wsMap.values()).map(({ workstream, total, completed, overdue }) => {
        const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        const overduePercentage = total > 0 ? (overdue / total) * 100 : 0;

        let health_status: WorkstreamHealth['health_status'] = 'on-track';
        if (overduePercentage > 30 || (completionPercentage < 25 && (total - completed) > 5)) {
          health_status = 'critical';
        } else if (overduePercentage > 15 || completionPercentage < 50) {
          health_status = 'at-risk';
        }

        return {
          workstream_id: workstream!.id,
          workstream_name: workstream!.name,
          workstream_slug: workstream!.slug,
          workstream_color: workstream!.color,
          total_tasks: total,
          completed_tasks: completed,
          overdue_tasks: overdue,
          completion_percentage: completionPercentage,
          health_status,
        };
      });
    },
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    refetchIntervalInBackground: REFETCH_BG,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useUpcomingDeadlines
// ═══════════════════════════════════════════════════════════════════════════════
export function useUpcomingDeadlines() {
  return useQuery({
    queryKey: ['tasks', 'dashboard', 'upcoming-deadlines'],
    queryFn: async (): Promise<UpcomingDeadline[]> => {
      const tasks = await fetchAllTasks();
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrowStart = new Date(todayStart.getTime() + 86400000);
      const weekEnd = new Date(todayStart.getTime() + 7 * 86400000);

      // Tasks with due_date, not yet done, ordered by due_date
      return tasks
        .filter(t => t.due_date && t.status?.slug !== 'done')
        .map(t => {
          const dueDate = new Date(t.due_date!);
          const dueStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
          const msPerDay = 86400000;
          const daysUntilDue = Math.round((dueStart.getTime() - todayStart.getTime()) / msPerDay);

          let due_status: UpcomingDeadline['due_status'];
          if (daysUntilDue < 0) due_status = 'overdue';
          else if (daysUntilDue === 0) due_status = 'today';
          else if (daysUntilDue === 1) due_status = 'tomorrow';
          else due_status = 'upcoming';

          return {
            id: t.id,
            key: t.key,
            title: t.title,
            due_date: t.due_date!,
            priority: (t.priority ?? 'low') as UpcomingDeadline['priority'],
            status_name: t.status?.name ?? 'Unknown',
            status_slug: t.status?.slug ?? '',
            status_color: t.status?.color ?? '',
            workstream_name: t.workstream?.name ?? null,
            workstream_slug: t.workstream?.slug ?? null,
            workstream_color: t.workstream?.color ?? null,
            assignee_name: t.assignee?.full_name ?? null,
            assignee_avatar: t.assignee?.avatar_url ?? null,
            due_status,
            days_until_due: daysUntilDue,
          };
        })
        .filter(t => t.due_status === 'overdue' || new Date(t.due_date) <= weekEnd)
        .sort((a, b) => a.days_until_due - b.days_until_due)
        .slice(0, 20);
    },
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    refetchIntervalInBackground: REFETCH_BG,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useTeamWorkload
// ═══════════════════════════════════════════════════════════════════════════════
export function useTeamWorkload() {
  return useQuery({
    queryKey: ['tasks', 'dashboard', 'team-workload'],
    queryFn: async (): Promise<TeamWorkload[]> => {
      const tasks = await fetchAllTasks();
      const now = new Date();

      // Only tasks with an assignee
      const assigned = tasks.filter(t => t.assignee_id && t.assignee);

      // Group by profile_id
      const profileMap = new Map<string, {
        assignee: RawTask['assignee'];
        total: number;
        in_progress: number;
        overdue: number;
      }>();

      for (const task of assigned) {
        const key = task.assignee_id!;
        const isDone = task.status?.slug === 'done';
        const isInProgress = !isDone && task.status?.slug === 'progress';
        const isOverdue =
          !isDone &&
          !!task.due_date &&
          new Date(task.due_date) < now;

        const existing = profileMap.get(key);
        if (existing) {
          existing.total++;
          if (isInProgress) existing.in_progress++;
          if (isOverdue) existing.overdue++;
        } else {
          profileMap.set(key, {
            assignee: task.assignee,
            total: 1,
            in_progress: isInProgress ? 1 : 0,
            overdue: isOverdue ? 1 : 0,
          });
        }
      }

      return Array.from(profileMap.values()).map(({ assignee, total, in_progress, overdue }) => {
        let workload_status: TeamWorkload['workload_status'] = 'available';
        if (total >= 10 || overdue > 2) workload_status = 'overloaded';
        else if (total >= 5 || overdue > 0) workload_status = 'busy';

        return {
          profile_id: assignee!.id,
          full_name: assignee!.full_name ?? 'Unknown',
          avatar_url: assignee!.avatar_url ?? null,
          assigned_tasks: total,
          in_progress_count: in_progress,
          overdue_count: overdue,
          workload_status,
        };
      }).sort((a, b) => b.assigned_tasks - a.assigned_tasks);
    },
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    refetchIntervalInBackground: REFETCH_BG,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useUnassignedCount
// ═══════════════════════════════════════════════════════════════════════════════
export function useUnassignedCount() {
  return useQuery({
    queryKey: ['tasks', 'dashboard', 'unassigned-count'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .is('assignee_id', null);

      if (error) throw error;
      return count ?? 0;
    },
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    refetchIntervalInBackground: REFETCH_BG,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useDashboardData (Combined)
// ═══════════════════════════════════════════════════════════════════════════════
export function useDashboardData() {
  const queryClient = useQueryClient();

  const metrics = useDashboardMetrics();
  const statusDistribution = useStatusDistribution();
  const workstreamHealth = useWorkstreamHealth();
  const upcomingDeadlines = useUpcomingDeadlines();
  const teamWorkload = useTeamWorkload();
  const unassignedCount = useUnassignedCount();

  const refetchAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['tasks', 'dashboard'] });
  };

  const isLoading =
    metrics.isLoading ||
    statusDistribution.isLoading ||
    workstreamHealth.isLoading ||
    upcomingDeadlines.isLoading ||
    teamWorkload.isLoading;

  const isError =
    metrics.isError ||
    statusDistribution.isError ||
    workstreamHealth.isError ||
    upcomingDeadlines.isError ||
    teamWorkload.isError;

  return {
    metrics: metrics.data,
    statusDistribution: statusDistribution.data ?? [],
    workstreamHealth: workstreamHealth.data ?? [],
    upcomingDeadlines: upcomingDeadlines.data ?? [],
    teamWorkload: teamWorkload.data ?? [],
    unassignedCount: unassignedCount.data ?? 0,
    isLoading,
    isError,
    refetchAll,
  };
}
