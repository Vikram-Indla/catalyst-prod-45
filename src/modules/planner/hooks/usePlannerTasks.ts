// ============================================================
// PLANNER TASKS HOOK
// Fetches tasks from planner_tasks table and transforms to Planner format
// Now unified with Kanban to use the same data source
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PlannerTask, TaskStatus, TaskPriority } from '../types';

// Map planner_statuses to Planner TaskStatus
const mapStatusFromPlannerStatuses = (statusName: string | null): TaskStatus => {
  const name = statusName?.toLowerCase() || '';
  
  if (name.includes('backlog')) return 'backlog';
  if (name.includes('planned') || name.includes('to do') || name.includes('todo')) return 'planned';
  if (name.includes('progress') || name.includes('active') || name.includes('doing')) return 'in-progress';
  if (name.includes('review') || name.includes('testing') || name.includes('qa')) return 'review';
  if (name.includes('done') || name.includes('complete') || name.includes('closed')) return 'done';
  
  return 'backlog';
};

// Map DB priority to Planner priority
const mapPriority = (dbPriority: string | null): TaskPriority => {
  switch (dbPriority?.toLowerCase()) {
    case 'critical':
    case 'highest':
      return 'critical';
    case 'high':
      return 'high';
    case 'medium':
    case 'normal':
      return 'medium';
    case 'low':
    case 'lowest':
      return 'low';
    default:
      return 'medium';
  }
};

// Transform planner_tasks row to PlannerTask
const transformPlannerTask = (row: any): PlannerTask => ({
  id: row.id,
  // Use task_key first (proper sequential key), then fallback to key, then generate from UUID
  key: row.task_key || row.key || `PLN-${row.id.slice(0, 4).toUpperCase()}`,
  title: row.title || 'Untitled',
  description: row.description || '',
  status: mapStatusFromPlannerStatuses(row.status?.name),
  type: 'task',
  priority: mapPriority(row.priority),
  assigneeId: row.assignee_id,
  assigneeName: row.assignee?.full_name,
  assigneeInitials: row.assignee?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2),
  teamId: row.workstream_id,
  teamName: row.workstream?.name,
  teamColor: row.workstream?.color || '#6366f1',
  startDate: row.start_date,
  dueDate: row.due_date,
  blocked: row.blocked || false,
  blockedReason: row.blocked_reason,
  progress: row.progress || 0,
  comments: 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function usePlannerTasks(teamId?: string | null) {
  return useQuery({
    // Cache-buster: ensures UI picks up task_key mapping changes immediately
    queryKey: ['planner-tasks', teamId, 'v2-task-key'],
    queryFn: async () => {
      let query = supabase
        .from('planner_tasks')
        .select(`
          *,
          status:planner_statuses(*),
          workstream:planner_workstreams(id, name, color, slug),
          assignee:profiles!planner_tasks_assignee_id_fkey(id, full_name, email, avatar_url)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200);

      if (teamId) {
        query = query.eq('workstream_id', teamId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching planner tasks:', error);
        return [];
      }

      return (data || []).map(transformPlannerTask);
    },
    // GUARDRAIL: Treat as "reference-ish" list to avoid flicker during field edits.
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useUpdatePlannerTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PlannerTask> }) => {
      const dbUpdates: any = {};
      
      if (updates.priority) {
        dbUpdates.priority = updates.priority;
      }
      
      if (updates.blocked !== undefined) {
        dbUpdates.blocked = updates.blocked;
        dbUpdates.blocked_reason = updates.blockedReason;
      }

      if (updates.progress !== undefined) {
        dbUpdates.progress = updates.progress;
      }

      if (updates.assigneeId !== undefined) {
        dbUpdates.assignee_id = updates.assigneeId || null;
      }

      if (updates.dueDate !== undefined) {
        dbUpdates.due_date = updates.dueDate || null;
      }

      if (updates.startDate !== undefined) {
        dbUpdates.start_date = updates.startDate || null;
      }

      if (updates.title !== undefined) {
        dbUpdates.title = updates.title;
      }

      if (updates.description !== undefined) {
        dbUpdates.description = updates.description;
      }

      const { error } = await supabase
        .from('planner_tasks')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['planner-tasks'] });

      const previous = queryClient.getQueriesData<PlannerTask[]>({ queryKey: ['planner-tasks'] });

      queryClient.setQueriesData<PlannerTask[]>({ queryKey: ['planner-tasks'] }, (old) => {
        if (!old) return old;
        return old.map((t) => (t.id === id ? { ...t, ...updates } : t));
      });

      return { previous };
    },
    onError: (err, variables, context) => {
      context?.previous?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
    },
  });
}

export function useDeletePlannerTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete via backend function (bypasses RLS edge-cases)
      const { error } = await supabase
        .rpc('soft_delete_planner_task', { p_task_id: id });

      if (error) throw error;
      return { id };
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['planner-tasks'] });
      const previousTasks = queryClient.getQueryData(['planner-tasks']);

      queryClient.setQueryData(['planner-tasks'], (old: PlannerTask[] | undefined) => {
        if (!old) return old;
        return old.filter((t) => t.id !== id);
      });

      return { previousTasks };
    },
    onError: (err, id, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['planner-tasks'], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
    },
  });
}

// Helper to check if ID is a seed data ID (not a valid UUID)
const isSeedId = (id: string): boolean => {
  return id.startsWith('seed-') || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export function useBulkDeletePlannerTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('planner_tasks')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;

      return { deletedIds: ids };
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ['planner-tasks'] });
      const previousTasks = queryClient.getQueriesData<PlannerTask[]>({ queryKey: ['planner-tasks'] });

      queryClient.setQueriesData<PlannerTask[]>({ queryKey: ['planner-tasks'] }, (old) => {
        if (!old) return old;
        return old.filter((t) => !ids.includes(t.id));
      });

      return { previousTasks };
    },
    onError: (err, ids, context) => {
      context?.previousTasks?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
    },
  });
}

export function useDuplicatePlannerTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: PlannerTask) => {
      // Get the first status as default
      const { data: statuses } = await supabase
        .from('planner_statuses')
        .select('id')
        .order('position', { ascending: true })
        .limit(1);
      
      const defaultStatusId = statuses?.[0]?.id;
      if (!defaultStatusId) throw new Error('No statuses found');

      const newKey = `PLN-${Date.now()}`;
      
      const { data, error } = await supabase
        .from('planner_tasks')
        .insert([{
          key: newKey,
          task_key: newKey,
          title: `${task.title} (Copy)`,
          description: task.description || null,
          status_id: defaultStatusId,
          priority: task.priority,
          assignee_id: task.assigneeId || null,
          workstream_id: task.teamId || null,
          progress: 0,
          blocked: false,
          due_date: task.dueDate || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
    },
  });
}
