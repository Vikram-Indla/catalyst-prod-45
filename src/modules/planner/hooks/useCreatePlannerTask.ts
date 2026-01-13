// ============================================================
// CREATE PLANNER TASK HOOK
// Creates a new task in the stories table
// ============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TaskStatus, TaskPriority } from '../types';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

interface CreateTaskData {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
}

export function useCreatePlannerTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTaskData) => {
      // Map Planner status to DB status
      const statusMap: Record<TaskStatus, 'todo' | 'in_progress' | 'done'> = {
        backlog: 'todo',
        planned: 'todo',
        'in-progress': 'in_progress',
        review: 'in_progress',
        done: 'done',
      };

      const taskKey = `PLN-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`;

      const { data: result, error } = await supabase
        .from('stories')
        .insert([{
          name: data.title,
          title: data.title,
          description: data.description,
          status: statusMap[data.status],
          state: statusMap[data.status],
          priority: data.priority,
          assignee_id: data.assigneeId || null,
          progress_pct: 0,
          blocked: false,
          feature_id: null,
        }])
        .select()
        .single();

      if (error) throw error;

      return { ...result, key: taskKey };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      toast.success(`Task ${data.key || 'created'} created successfully`);
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    },
  });
}
