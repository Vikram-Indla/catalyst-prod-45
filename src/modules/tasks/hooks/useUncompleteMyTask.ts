// ============================================================
// UNCOMPLETE MY TASK HOOK
// Planner V9: Restore completed task to original section
// ============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { myTasksKeys } from './useMyTasks';
import { catalystToast } from '@/lib/catalystToast';
import { useAuth } from '@/hooks/useAuth';

interface UncompleteTaskParams {
  taskId: string;
  originalSection?: string;
}

export function useUncompleteMyTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ taskId }: UncompleteTaskParams) => {
      // Get the "In Progress" status (or any non-done status)
      const { data: inProgressStatus } = await supabase
        .from('task_statuses')
        .select('id')
        .eq('slug', 'progress')
        .single();

      const { data, error } = await supabase
        .from('tasks')
        .update({
          status_id: inProgressStatus?.id,
          completed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('task_activity').insert({
        task_id: taskId,
        actor_id: user?.id,
        action_type: 'status_changed',
        old_value: { status: 'done' },
        new_value: { status: 'in_progress' },
      });

      return data;
    },

    onSuccess: () => {
      catalystToast.success('Task restored');
    },

    onError: () => {
      catalystToast.error('Failed to restore task');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: myTasksKeys.all });
    },
  });
}
