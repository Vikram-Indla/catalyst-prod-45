// ============================================================
// PLANNER TASKS HOOK
// Fetches tasks from stories table and transforms to Planner format
// Falls back to seed data when database is empty
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PlannerTask, TaskStatus, TaskPriority } from '../types';
import { SEED_TASKS } from '../data/seedData';

// Map DB status/state to Planner status
const mapStatus = (dbStatus: string | null, dbState: string | null): TaskStatus => {
  const status = dbStatus?.toLowerCase();
  const state = dbState?.toLowerCase();

  // "todo" is overloaded in this schema; state differentiates backlog vs planned
  if (status === 'todo') {
    if (state === 'backlog') return 'backlog';
    // default "todo" bucket maps to Planned
    return 'planned';
  }

  if (status === 'in_progress') {
    // use state to represent the Review column
    if (state === 'review' || state === 'in_review' || state === 'testing') return 'review';
    return 'in-progress';
  }

  if (status === 'done') return 'done';

  // Fallbacks for unexpected values
  switch (status) {
    case 'completed':
    case 'accepted':
      return 'done';
    case 'active':
      return 'in-progress';
    case 'planned':
    case 'ready':
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
  status: mapStatus(row.status || row.state, row.state),
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
      // Query stories without the profiles join since there's no FK relationship
      let query = supabase
        .from('stories')
        .select('*')
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

      // Get unique assignee IDs to fetch names separately
      const assigneeIds = [...new Set((data || []).map(s => s.assignee_id).filter(Boolean))];
      
      let profilesMap: Record<string, string> = {};
      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', assigneeIds);
        
        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.full_name || '';
          return acc;
        }, {} as Record<string, string>);
      }

      const transformedData = (data || []).map(row => ({
        ...transformStory(row),
        assigneeName: row.assignee_id ? profilesMap[row.assignee_id] : undefined,
        assigneeInitials: row.assignee_id && profilesMap[row.assignee_id] 
          ? profilesMap[row.assignee_id].split(' ').map(n => n[0]).join('').slice(0, 2)
          : undefined,
      }));
      
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
      // Map Planner status back to DB status/state
      const dbUpdates: any = {};

      if (updates.status) {
        const statusToDb: Record<TaskStatus, { status: 'todo' | 'in_progress' | 'done'; state: string }> = {
          backlog: { status: 'todo', state: 'backlog' },
          planned: { status: 'todo', state: 'todo' },
          'in-progress': { status: 'in_progress', state: 'in_progress' },
          review: { status: 'in_progress', state: 'review' },
          done: { status: 'done', state: 'done' },
        };

        const mapped = statusToDb[updates.status];
        dbUpdates.status = mapped.status;
        dbUpdates.state = mapped.state;
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
      // Optimistic update (covers both ['planner-tasks'] and ['planner-tasks', teamId] queries)
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
