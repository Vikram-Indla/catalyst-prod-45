/**
 * UPDATE PLANNER TASK FIELD HOOK
 * Optimistic updates with rollback + debounced text field updates
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCallback, useRef } from 'react';

interface UpdateTaskFieldInput {
  taskId: string;
  field: string;
  value: any;
}

export function useUpdatePlannerTaskField() {
  const queryClient = useQueryClient();
  const pendingUpdates = useRef<Map<string, Record<string, any>>>(new Map());
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const mutation = useMutation({
    mutationFn: async ({ taskId, field, value }: UpdateTaskFieldInput) => {
      const { data, error } = await supabase
        .from('planner_tasks')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .select(`
          *,
          status:planner_statuses(*),
          assignee:profiles!planner_tasks_assignee_id_fkey(id, full_name, email, avatar_url),
          workstream:planner_workstreams(id, name)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    
    // Optimistic update
    onMutate: async ({ taskId, field, value }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['task-detail', taskId] });
      await queryClient.cancelQueries({ queryKey: ['planner-tasks'] });
      await queryClient.cancelQueries({ queryKey: ['kanban-tasks'] });

      // Snapshot previous values
      const previousTask = queryClient.getQueryData(['task-detail', taskId]);
      const previousTasks = queryClient.getQueryData(['planner-tasks']);
      const previousKanban = queryClient.getQueryData(['kanban-tasks']);

      // Optimistically update single task
      queryClient.setQueryData(['task-detail', taskId], (old: any) => {
        if (!old) return old;
        return { ...old, [field]: value };
      });

      // Optimistically update tasks list
      queryClient.setQueryData(['planner-tasks'], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map(t => t.id === taskId ? { ...t, [field]: value } : t);
      });

      // Optimistically update kanban list
      queryClient.setQueryData(['kanban-tasks'], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map(t => t.id === taskId ? { ...t, [field]: value } : t);
      });

      return { previousTask, previousTasks, previousKanban, taskId };
    },

    // Rollback on error
    onError: (err, { taskId }, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(['task-detail', taskId], context.previousTask);
      }
      if (context?.previousTasks) {
        queryClient.setQueryData(['planner-tasks'], context.previousTasks);
      }
      if (context?.previousKanban) {
        queryClient.setQueryData(['kanban-tasks'], context.previousKanban);
      }
      toast.error('Failed to save changes');
    },

    onSuccess: (data, { taskId }) => {
      // Sync with server response
      queryClient.setQueryData(['task-detail', taskId], data);
    },
  });

  // Immediate update (for dropdowns, checkboxes, etc.)
  const updateNow = useCallback((taskId: string, field: string, value: any) => {
    // Clear any pending debounced update for this field
    const timerKey = `${taskId}-${field}`;
    const timer = debounceTimers.current.get(timerKey);
    if (timer) {
      clearTimeout(timer);
      debounceTimers.current.delete(timerKey);
    }
    
    mutation.mutate({ taskId, field, value });
  }, [mutation]);

  // Debounced update (for text fields - 500ms delay)
  const updateDebounced = useCallback((taskId: string, field: string, value: any, delay = 500) => {
    const timerKey = `${taskId}-${field}`;
    
    // Clear existing timer
    const existingTimer = debounceTimers.current.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Store pending update
    const pending = pendingUpdates.current.get(taskId) || {};
    pending[field] = value;
    pendingUpdates.current.set(taskId, pending);

    // Optimistically update UI immediately
    queryClient.setQueryData(['task-detail', taskId], (old: any) => {
      if (!old) return old;
      return { ...old, [field]: value };
    });

    // Set new timer
    const timer = setTimeout(() => {
      const updates = pendingUpdates.current.get(taskId);
      if (updates && updates[field] !== undefined) {
        mutation.mutate({ taskId, field, value: updates[field] });
        delete updates[field];
        if (Object.keys(updates).length === 0) {
          pendingUpdates.current.delete(taskId);
        }
      }
      debounceTimers.current.delete(timerKey);
    }, delay);

    debounceTimers.current.set(timerKey, timer);
  }, [mutation, queryClient]);

  // Flush all pending updates immediately (call before closing)
  const flushPending = useCallback((taskId: string) => {
    const updates = pendingUpdates.current.get(taskId);
    if (!updates) return;

    // Clear all timers for this task
    for (const [key, timer] of debounceTimers.current.entries()) {
      if (key.startsWith(taskId)) {
        clearTimeout(timer);
        debounceTimers.current.delete(key);
      }
    }

    // Send all pending updates
    for (const [field, value] of Object.entries(updates)) {
      mutation.mutate({ taskId, field, value });
    }

    pendingUpdates.current.delete(taskId);
  }, [mutation]);

  return {
    updateNow,
    updateDebounced,
    flushPending,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
