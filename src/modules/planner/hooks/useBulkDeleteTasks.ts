import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useBulkDeleteTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskIds: string[]) => {
      // Soft delete by setting deleted_at
      const { error } = await supabase
        .from('planner_tasks')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', taskIds);

      if (error) throw error;
      return taskIds;
    },

    onMutate: async (taskIds) => {
      await queryClient.cancelQueries({ queryKey: ['planner-tasks'] });
      await queryClient.cancelQueries({ queryKey: ['kanban-tasks'] });

      const previousTasks = queryClient.getQueryData(['planner-tasks']);
      const previousKanban = queryClient.getQueryData(['kanban-tasks']);

      // Optimistically remove from UI
      queryClient.setQueryData(['planner-tasks'], (old: any[] | undefined) => {
        if (!old) return old;
        return old.filter(task => !taskIds.includes(task.id));
      });

      queryClient.setQueryData(['kanban-tasks'], (old: any[] | undefined) => {
        if (!old) return old;
        return old.filter(task => !taskIds.includes(task.id));
      });

      return { previousTasks, previousKanban };
    },

    onError: (err, taskIds, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['planner-tasks'], context.previousTasks);
      }
      if (context?.previousKanban) {
        queryClient.setQueryData(['kanban-tasks'], context.previousKanban);
      }
      toast.error(`Failed to delete ${taskIds.length} tasks`);
    },

    onSuccess: (taskIds) => {
      toast.success(`Deleted ${taskIds.length} task${taskIds.length > 1 ? 's' : ''}`);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
    },
  });
}
