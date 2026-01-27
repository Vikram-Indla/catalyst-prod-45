/**
 * Create Task Mutation Hook
 * Handles task creation with optimistic updates
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
  task_key: string;
}

// Generate unique task key
async function generateTaskKey(): Promise<string> {
  // Get latest task key to increment
  const { data } = await supabase
    .from('planner_tasks')
    .select('task_key')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (data?.task_key) {
    // Extract number from PLN-XXX format
    const match = data.task_key.match(/PLN-(\d+)/);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      return `PLN-${String(nextNum).padStart(3, '0')}`;
    }
  }
  
  return `PLN-${String(Math.floor(Math.random() * 1000) + 1).padStart(3, '0')}`;
}

export function useCreateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskInput): Promise<CreateTaskResult> => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate task key
      const taskKey = await generateTaskKey();
      
      // Get backlog status ID if not provided
      let statusId = input.status_id;
      if (!statusId) {
        const { data: backlogStatus } = await supabase
          .from('planner_statuses')
          .select('id')
          .eq('slug', 'backlog')
          .single();
        statusId = backlogStatus?.id || undefined;
      }
      
      // Insert task
      const { data, error } = await supabase
        .from('planner_tasks')
        .insert({
          task_key: taskKey,
          title: input.title,
          description: input.description || null,
          workstream_id: input.workstream_id || null,
          assignee_id: input.assignee_id || null,
          priority: input.priority,
          due_date: input.due_date || null,
          start_date: input.start_date,
          status_id: statusId || null,
          created_by: user?.id || null,
        })
        .select('id, task_key')
        .single();

      if (error) {
        console.error('Error creating task:', error);
        throw new Error(error.message);
      }

      return {
        id: data.id,
        task_key: data.task_key,
      };
    },
    onSuccess: (result) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner-board-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      
      toast.success(`Task ${result.task_key} created successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create task: ${error.message}`);
    },
  });
}
