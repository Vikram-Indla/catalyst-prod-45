// ============================================================
// UNCOMPLETE MY TASK HOOK
// Planner V9: Restore completed task to original section
// ============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { myTasksKeys } from './useMyTasks';
import { toast } from 'sonner';
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
        .from('planner_statuses')
        .select('id')
        .eq('slug', 'progress')
        .single();

      const { data, error } = await supabase
        .from('planner_tasks')
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
      await supabase.from('planner_activity_log').insert({
        task_id: taskId,
        user_id: user?.id,
        action: 'status_changed',
        old_value: { status: 'done' },
        new_value: { status: 'in_progress' },
      });

      return data;
    },

    onSuccess: () => {
      toast.success('Task restored');
    },

    onError: () => {
      toast.error('Failed to restore task');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: myTasksKeys.all });
    },
  });
}
