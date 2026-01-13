// ============================================================
// CREATE PLANNER TASK HOOK
// Creates a new task with optimistic updates for immediate UI
// ============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TaskStatus, TaskPriority, PlannerTask } from '../types';
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

      const taskId = uuidv4();
      const taskKey = `PLN-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`;

      const { data: result, error } = await supabase
        .from('stories')
        .insert([{
          id: taskId,
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

      return { ...result, key: taskKey, id: taskId };
    },
    onMutate: async (data) => {
      // Optimistic update - add task immediately
      await queryClient.cancelQueries({ queryKey: ['planner-tasks'] });
      const previousTasks = queryClient.getQueryData(['planner-tasks']);
      
      const tempId = `temp-${uuidv4()}`;
      const tempKey = `PLN-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`;
      const now = new Date().toISOString();
      
      const optimisticTask: PlannerTask = {
        id: tempId,
        key: tempKey,
        title: data.title,
        description: data.description,
        status: data.status,
        type: 'task',
        priority: data.priority,
        assigneeId: data.assigneeId,
        blocked: false,
        progress: 0,
        comments: 0,
        createdAt: now,
        updatedAt: now,
        dueDate: data.dueDate,
      };
      
      queryClient.setQueryData(['planner-tasks'], (old: PlannerTask[] | undefined) => {
        if (!old) return [optimisticTask];
        return [optimisticTask, ...old];
      });
      
      return { previousTasks, tempId };
    },
    onError: (err, data, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['planner-tasks'], context.previousTasks);
      }
      toast.error('Failed to create task');
    },
    onSuccess: (result, data, context) => {
      // Replace temp task with real one
      queryClient.setQueryData(['planner-tasks'], (old: PlannerTask[] | undefined) => {
        if (!old) return old;
        return old.map(t => t.id === context?.tempId ? { ...t, id: result.id, key: result.key } : t);
      });
      toast.success(`Task ${result.key || 'created'} created successfully`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
    },
  });
}
