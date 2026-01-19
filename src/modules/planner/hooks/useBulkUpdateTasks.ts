import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BulkUpdateInput {
  taskIds: string[];
  updates: Record<string, any>;
}

export function useBulkUpdateTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskIds, updates }: BulkUpdateInput) => {
      const { data, error } = await supabase
        .from('planner_tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .in('id', taskIds)
        .select();

      if (error) throw error;
      return data;
    },

    onMutate: async ({ taskIds, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['planner-tasks'] });
      await queryClient.cancelQueries({ queryKey: ['kanban-tasks'] });

      // Snapshot previous values
      const previousTasks = queryClient.getQueryData(['planner-tasks']);
      const previousKanban = queryClient.getQueryData(['kanban-tasks']);

      // Optimistic update for planner-tasks
      queryClient.setQueryData(['planner-tasks'], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map(task =>
          taskIds.includes(task.id) ? { ...task, ...updates } : task
        );
      });

      // Optimistic update for kanban-tasks
      queryClient.setQueryData(['kanban-tasks'], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map(task =>
          taskIds.includes(task.id) ? { ...task, ...updates } : task
        );
      });

      return { previousTasks, previousKanban };
    },

    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['planner-tasks'], context.previousTasks);
      }
      if (context?.previousKanban) {
        queryClient.setQueryData(['kanban-tasks'], context.previousKanban);
      }
      toast.error(`Failed to update ${variables.taskIds.length} tasks`);
    },

    onSuccess: (data, variables) => {
      toast.success(`Updated ${variables.taskIds.length} task${variables.taskIds.length > 1 ? 's' : ''}`);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
    },
  });
}
