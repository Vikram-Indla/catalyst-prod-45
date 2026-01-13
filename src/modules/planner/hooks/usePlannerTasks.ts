// ============================================================
// PLANNER TASKS HOOK
// Fetches tasks from stories table and transforms to Planner format
// Falls back to seed data when database is empty
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PlannerTask, TaskStatus, TaskPriority } from '../types';
import { SEED_TASKS } from '../data/seedData';

// Map DB status to Planner status
const mapStatus = (dbStatus: string | null): TaskStatus => {
  switch (dbStatus?.toLowerCase()) {
    case 'done':
    case 'completed':
    case 'accepted':
      return 'done';
    case 'in_progress':
    case 'in-progress':
    case 'active':
      return 'in-progress';
    case 'review':
    case 'in_review':
    case 'testing':
      return 'review';
    case 'planned':
    case 'ready':
    case 'todo':
      return 'planned';
    default:
      return 'backlog';
  }
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

// Transform DB row to PlannerTask
const transformStory = (row: any): PlannerTask => ({
  id: row.id,
  key: row.story_key || `PLN-${row.id.slice(0, 4).toUpperCase()}`,
  title: row.title || row.name || 'Untitled',
  description: row.description,
  status: mapStatus(row.status || row.state),
  type: 'task',
  priority: mapPriority(row.priority),
  assigneeId: row.assignee_id || row.owner_id,
  assigneeName: row.profiles?.full_name,
  assigneeInitials: row.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2),
  teamId: row.team_id,
  startDate: row.created_at,
  dueDate: row.accepted_at,
  blocked: row.blocked || false,
  blockedReason: row.blocked_reason,
  progress: row.progress_pct || 0,
  comments: 0,
  linkedItemId: row.feature_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function usePlannerTasks(teamId?: string | null) {
  return useQuery({
    queryKey: ['planner-tasks', teamId],
    queryFn: async () => {
      let query = supabase
        .from('stories')
        .select(`
          *,
          profiles:assignee_id(full_name)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200);

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching planner tasks:', error);
        // Return seed data on error
        return SEED_TASKS;
      }

      const transformedData = (data || []).map(transformStory);
      
      // If no data from DB, return seed data
      if (transformedData.length === 0) {
        return SEED_TASKS;
      }

      return transformedData;
    },
  });
}

export function useUpdatePlannerTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PlannerTask> }) => {
      // Map Planner status back to DB status
      const dbUpdates: any = {};
      
      if (updates.status) {
        const statusMap: Record<TaskStatus, string> = {
          backlog: 'todo',
          planned: 'todo',
          'in-progress': 'in_progress',
          review: 'in_progress',
          done: 'done',
        };
        dbUpdates.status = statusMap[updates.status];
        dbUpdates.state = statusMap[updates.status];
      }
      
      if (updates.priority) {
        dbUpdates.priority = updates.priority;
      }
      
      if (updates.blocked !== undefined) {
        dbUpdates.blocked = updates.blocked;
        dbUpdates.blocked_reason = updates.blockedReason;
      }

      if (updates.progress !== undefined) {
        dbUpdates.progress_pct = updates.progress;
      }

      if (updates.assigneeId !== undefined) {
        dbUpdates.assignee_id = updates.assigneeId || null;
      }

      if (updates.dueDate !== undefined) {
        dbUpdates.accepted_at = updates.dueDate || null;
      }

      const { error } = await supabase
        .from('stories')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async ({ id, updates }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['planner-tasks'] });
      const previousTasks = queryClient.getQueryData(['planner-tasks']);
      
      queryClient.setQueryData(['planner-tasks'], (old: PlannerTask[] | undefined) => {
        if (!old) return old;
        return old.map(t => t.id === id ? { ...t, ...updates } : t);
      });
      
      return { previousTasks };
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['planner-tasks'], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
    },
  });
}

export function useDeletePlannerTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting deleted_at
      const { error } = await supabase
        .from('stories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async (id) => {
      // Optimistic update - remove from list
      await queryClient.cancelQueries({ queryKey: ['planner-tasks'] });
      const previousTasks = queryClient.getQueryData(['planner-tasks']);
      
      queryClient.setQueryData(['planner-tasks'], (old: PlannerTask[] | undefined) => {
        if (!old) return old;
        return old.filter(t => t.id !== id);
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
    },
  });
}
