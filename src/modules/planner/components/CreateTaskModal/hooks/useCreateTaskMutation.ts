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

// Generate unique task key using database sequence
async function generateTaskKey(): Promise<string> {
  // Use database function for guaranteed unique sequential keys
  const { data, error } = await supabase.rpc('generate_planner_task_key');
  
  if (error || !data) {
    console.error('Error generating task key:', error);
    // Fallback: query max and increment (but DB sequence is preferred)
    const { data: maxTask } = await supabase
      .from('planner_tasks')
      .select('task_key')
      .like('task_key', 'PLN-%')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (maxTask && maxTask.length > 0) {
      // Find the highest valid number (exclude sub-tasks like PLN-45-2 and timestamps)
      let maxNum = 0;
      for (const t of maxTask) {
        const match = t.task_key?.match(/^PLN-(\d{1,4})$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum && num < 10000) maxNum = num;
        }
      }
      return `PLN-${maxNum + 1}`;
    }
    return `PLN-1`;
  }
  
  return data;
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
