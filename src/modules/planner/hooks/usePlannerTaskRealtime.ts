/**
 * TASK-LEVEL REALTIME SUBSCRIPTION
 * Subscribes to updates for a specific task and syncs with React Query cache
 */

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UsePlannerTaskRealtimeOptions {
  taskId: string | null;
  onUpdate?: (task: any) => void;
  onDelete?: () => void;
}

export function usePlannerTaskRealtime({ taskId, onUpdate, onDelete }: UsePlannerTaskRealtimeOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!taskId) return;

    const channel = supabase
      .channel(`task-detail-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'planner_tasks',
          filter: `id=eq.${taskId}`,
        },
        (payload) => {
          const updatedTask = payload.new;
          
          // Update React Query cache for the task detail
          queryClient.setQueryData(['task-detail', taskId], (old: any) => {
            if (!old) return old;
            return { ...old, ...updatedTask };
          });
          
          // Also update the tasks list cache
          queryClient.setQueryData(['planner-tasks'], (old: any[] | undefined) => {
            if (!old) return old;
            return old.map(t => t.id === taskId ? { ...t, ...updatedTask } : t);
          });

          // Also update kanban tasks cache
          queryClient.setQueryData(['kanban-tasks'], (old: any[] | undefined) => {
            if (!old) return old;
            return old.map(t => t.id === taskId ? { ...t, ...updatedTask } : t);
          });
          
          onUpdate?.(updatedTask);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'planner_tasks',
          filter: `id=eq.${taskId}`,
        },
        () => {
          // Remove from all caches
          queryClient.removeQueries({ queryKey: ['task-detail', taskId] });
          queryClient.setQueryData(['planner-tasks'], (old: any[] | undefined) => {
            if (!old) return old;
            return old.filter(t => t.id !== taskId);
          });
          queryClient.setQueryData(['kanban-tasks'], (old: any[] | undefined) => {
            if (!old) return old;
            return old.filter(t => t.id !== taskId);
          });
          
          toast.info('This task was deleted');
          onDelete?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, queryClient, onUpdate, onDelete]);
}

export default usePlannerTaskRealtime;
