/**
 * Create Task Mutation Hook
 * Handles task creation with optimistic updates
 *
 * 2026-06-17 (Vikram): the `tasks` relation in the live DB does not expose
 * a `task_key` column ("column tasks.task_key does not exist"). Catalyst
 * tasks are identified by the `key` column (PLN-N), which is auto-filled
 * by a BEFORE-INSERT trigger on the base table. Drop all references to
 * `task_key` here — read & write only `key`.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import type { TaskPriority } from '../../../types';

export interface CreateTaskInput {
  title: string;
  description?: string;
  workstream_id: string;
  assignee_id?: string;
  priority: TaskPriority;
  due_date?: string;
  start_date: string;
  status_id?: string;
}

interface CreateTaskResult {
  id: string;
  key: string;
}

export function useCreateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskInput): Promise<CreateTaskResult> => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Get backlog status ID if not provided
      let statusId = input.status_id;
      if (!statusId) {
        const { data: backlogStatus } = await supabase
          .from('task_statuses')
          .select('id')
          .eq('slug', 'backlog')
          .single();
        statusId = backlogStatus?.id || undefined;
      }

      // Insert task. `key` is auto-filled by the BEFORE-INSERT trigger
      // (set_planner_task_key) to 'PLN-N', so we don't pass it.
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: input.title,
          description: input.description || null,
          workstream_id: input.workstream_id || null,
          assignee_id: input.assignee_id || null,
          priority: input.priority,
          due_date: input.due_date || null,
          start_date: input.start_date,
          status_id: statusId || null,
          created_by: user?.id || null,
        } as never)
        .select('id, key')
        .single();

      if (error) {
        console.error('Error creating task:', error);
        throw new Error(error.message);
      }

      return {
        id: (data as { id: string }).id,
        key: (data as { key: string | null }).key ?? '',
      };
    },
    onSuccess: (result) => {
      // Invalidate relevant queries for all views
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner-board-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['timeline-tasks-v2'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner-task-list'] });
      queryClient.invalidateQueries({ queryKey: ['planner-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });

      catalystToast.success(`Task ${result.key || 'created'} successfully`);
    },
    onError: (error: Error) => {
      catalystToast.error(`Failed to create task: ${error.message}`);
    },
  });
}
