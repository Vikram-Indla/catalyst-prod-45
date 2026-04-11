// ============================================================
// KANBAN TASKS HOOK
// CRUD for planner_tasks with filters and drag-drop support
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import type { KanbanTask, KanbanTaskFilters } from '../types/kanban';
import { toast } from 'sonner';
import { useEffect } from 'react';

const QUERY_KEY = ['kanban-tasks'];

/**
 * Fetch all Kanban tasks with optional filters
 */
export function useKanbanTasks(filters?: KanbanTaskFilters) {
  return useQuery({
    queryKey: [...QUERY_KEY, filters],
    queryFn: async () => {
      let query = typedQuery('planner_tasks')
        .select(`
          *,
          status:planner_statuses(*),
          workstream:planner_workstreams(id, name),
          assignee:profiles!planner_tasks_assignee_id_fkey(id, full_name, email, avatar_url)
        `)
        .is('deleted_at', null)
        .order('position', { ascending: true });
      
      // Apply filters
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,key.ilike.%${filters.search}%`);
      }
      
      if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }
      
      if (filters?.assignee_id && filters.assignee_id !== 'all') {
        query = query.eq('assignee_id', filters.assignee_id);
      }
      
      if (filters?.workstream_id && filters.workstream_id !== 'all') {
        query = query.eq('workstream_id', filters.workstream_id);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching tasks:', error);
        throw error;
      }

      // Filter by status slug client-side (PostgREST doesn't support filtering on joined columns)
      let result = data as unknown as KanbanTask[];
      if (filters?.status_slug) {
        result = result.filter(task => task.status?.slug === filters.status_slug);
      }

      return result;
    },
  });
}

/**
 * Subscribe to realtime changes on planner_tasks
 */
export function useKanbanTasksRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('kanban-tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'planner_tasks',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Create a new task
 */
export function useCreateKanbanTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (task: Partial<KanbanTask>) => {
      const { data: userData } = await supabase.auth.getUser();
      
      // Get max position in target column
      const { data: existing } = await supabase
        .from('planner_tasks')
        .select('position')
        .eq('status_id', task.status_id)
        .is('deleted_at', null)
        .order('position', { ascending: false })
        .limit(1);
      
      const nextPosition = (existing?.[0]?.position ?? -1) + 1;
      
      // Generate a temporary key - the DB trigger will override with proper PLN-XXX
      const tempKey = `PLN-${Date.now()}`;
      
      const { data, error } = await typedQuery('planner_tasks')
        .insert([{
          key: tempKey,
          task_key: tempKey,
          title: task.title!,
          description: task.description || null,
          status_id: task.status_id!,
          priority: task.priority || 'medium',
          workstream_id: task.workstream_id || null,
          assignee_id: task.assignee_id || null,
          start_date: task.start_date || null,
          due_date: task.due_date || null,
          position: nextPosition,
          created_by: userData.user?.id || null,
        }])
        .select(`
          *,
          status:planner_statuses(*),
          workstream:planner_workstreams(id, name),
          assignee:profiles!planner_tasks_assignee_id_fkey(id, full_name, email, avatar_url)
        `)
        .single();
      
      if (error) throw error;
      
      // Create a default checklist item with the task title
      const { error: checklistError } = await supabase
        .from('planner_task_checklist_items')
        .insert([{
          task_id: data.id,
          content: task.title!,
          is_completed: false,
          sort_order: 0,
        }]);
      
      if (checklistError) {
        console.error('Failed to create default checklist item:', checklistError);
      }
      
      return data as unknown as KanbanTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Task created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create task: ' + error.message);
    },
  });
}

/**
 * Update a task
 */
export function useUpdateKanbanTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<KanbanTask> & { id: string }) => {
      const { data, error } = await typedQuery('planner_tasks')
        .update(updates as any)
        .eq('id', id)
        .select(`
          *,
          status:planner_statuses(*),
          workstream:planner_workstreams(id, name),
          assignee:profiles!planner_tasks_assignee_id_fkey(id, full_name, email, avatar_url)
        `)
        .single();
      
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, ...updates }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      
      const previous = queryClient.getQueriesData<KanbanTask[]>({ queryKey: QUERY_KEY });
      
      queryClient.setQueriesData<KanbanTask[]>({ queryKey: QUERY_KEY }, (old) => {
        if (!old) return old;
        return old.map((t) => (t.id === id ? { ...t, ...updates } : t));
      });
      
      return { previous };
    },
    onError: (err, variables, context) => {
      context?.previous?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error('Failed to update task');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/**
 * Delete a task (soft delete)
 */
export function useDeleteKanbanTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .rpc('soft_delete_planner_task', { p_task_id: id });
      
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<KanbanTask[]>(QUERY_KEY);
      
      queryClient.setQueryData<KanbanTask[]>(QUERY_KEY, (old) => {
        if (!old) return old;
        return old.filter((t) => t.id !== id);
      });
      
      return { previous };
    },
    onError: (err, id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
      toast.error('Failed to delete task');
    },
    onSuccess: () => {
      toast.success('Task deleted');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/**
 * Move task (drag & drop) - handles position and status changes
 */
export function useMoveKanbanTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      taskId,
      newStatusId,
      newPosition,
    }: {
      taskId: string;
      newStatusId: string;
      newPosition: number;
    }) => {
      // Get current task
      const { data: task, error: fetchError } = await supabase
        .from('planner_tasks')
        .select('status_id, position')
        .eq('id', taskId)
        .single();
      
      if (fetchError || !task) throw fetchError || new Error('Task not found');
      
      const oldStatusId = task.status_id;
      const oldPosition = task.position;
      
      // If moving within same column
      if (oldStatusId === newStatusId) {
        if (oldPosition < newPosition) {
          // Moving down
          await supabase.rpc('reorder_planner_tasks_down', {
            p_status_id: newStatusId,
            p_old_position: oldPosition,
            p_new_position: newPosition,
          });
        } else if (oldPosition > newPosition) {
          // Moving up
          await supabase.rpc('reorder_planner_tasks_up', {
            p_status_id: newStatusId,
            p_old_position: oldPosition,
            p_new_position: newPosition,
          });
        }
      } else {
        // Moving to different column - use RPC functions for atomic updates
        // For cross-column moves, we just update positions directly
        // The RPC functions handle within-column reordering
      }
      
      // Update the task
      const { error } = await supabase
        .from('planner_tasks')
        .update({
          status_id: newStatusId,
          position: newPosition,
        })
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onMutate: async ({ taskId, newStatusId, newPosition }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      
      const previousTasks = queryClient.getQueryData<KanbanTask[]>(QUERY_KEY);
      
      queryClient.setQueryData<KanbanTask[]>(QUERY_KEY, (old) => {
        if (!old) return old;
        return old.map((task) =>
          task.id === taskId
            ? { ...task, status_id: newStatusId, position: newPosition }
            : task
        );
      });
      
      return { previousTasks };
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(QUERY_KEY, context.previousTasks);
      }
      toast.error('Failed to move task');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
