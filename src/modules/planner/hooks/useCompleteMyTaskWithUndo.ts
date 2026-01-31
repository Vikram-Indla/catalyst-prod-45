// ============================================================
// COMPLETE MY TASK WITH UNDO - Enhanced completion hook
// Planner V9: Completion with animation support and undo
// ============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { myTasksKeys } from './useMyTasks';
import { useMyTasksUndo, UndoAction } from './useMyTasksUndo';
import { useUncompleteMyTask } from './useUncompleteMyTask';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import type { TimeSection, MyTask } from '../types/my-tasks';

interface CompleteTaskParams {
  taskId: string;
  taskTitle: string;
  originalSection: TimeSection;
}

export function useCompleteMyTaskWithUndo() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const undoStore = useMyTasksUndo();
  const uncompleteTask = useUncompleteMyTask();

  const handleUndo = (action: UndoAction) => {
    uncompleteTask.mutate({
      taskId: action.taskId,
      originalSection: action.originalSection,
    });
  };

  return useMutation({
    mutationFn: async ({ taskId }: CompleteTaskParams) => {
      // Get done status
      const { data: doneStatus } = await supabase
        .from('planner_statuses')
        .select('id')
        .eq('is_done', true)
        .single();

      const { data, error } = await supabase
        .from('planner_tasks')
        .update({
          status_id: doneStatus?.id,
          completed_at: new Date().toISOString(),
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
        action: 'completed',
      });

      return data;
    },

    onMutate: async ({ taskId, taskTitle, originalSection }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: myTasksKeys.all });

      // Snapshot previous state for rollback
      const previousTasks = queryClient.getQueryData(myTasksKeys.list({}));

      // Push to undo stack
      const undoAction: UndoAction = {
        type: 'complete',
        taskId,
        taskTitle,
        originalSection: originalSection as UndoAction['originalSection'],
        timestamp: Date.now(),
      };
      undoStore.pushUndo(undoAction);

      return { previousTasks, undoAction };
    },

    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(myTasksKeys.list({}), context.previousTasks);
      }
      // Pop from undo stack since it failed
      undoStore.popUndo();
      toast.error('Failed to complete task');
    },

    onSuccess: (data, { taskTitle }, context) => {
      // Show toast with undo
      toast.success(`"${taskTitle}" completed`, {
        action: {
          label: 'Undo',
          onClick: () => {
            if (context?.undoAction) {
              handleUndo(context.undoAction);
            }
          },
        },
        duration: 5000,
      });
    },

    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: myTasksKeys.all });
    },
  });
}
