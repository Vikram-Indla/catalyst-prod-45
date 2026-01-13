// ============================================================
// CREATE PLANNER TASK HOOK
// Creates a new task with optimistic updates for immediate UI
// ============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TaskStatus, TaskPriority, PlannerTask } from '../types';
import { catalystToast } from '@/lib/catalystToast';
import { v4 as uuidv4 } from 'uuid';

interface CreateTaskData {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  featureId?: string;
  teamId?: string;
}

// Default team ID for tasks created without team context
const DEFAULT_TEAM_ID = '20000000-0001-0001-0001-000000000001';

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

      // Default start_date to today if not provided
      const today = new Date().toISOString().split('T')[0];

      const { data: result, error } = await supabase
        .from('stories')
        .insert([{
          id: taskId,
          name: data.title,
          title: data.title,
          description: data.description || null,
          status: statusMap[data.status],
          state: statusMap[data.status],
          priority: data.priority,
          assignee_id: data.assigneeId || null,
          progress_pct: 0,
          blocked: false,
          feature_id: data.featureId || null,
          team_id: data.teamId || DEFAULT_TEAM_ID,
          story_key: taskKey,
          start_date: today,
        }])
        .select()
        .single();

      if (error) throw error;

      return { ...result, key: taskKey, id: taskId, assigneeName: data.assigneeName };
    },
    onMutate: async (data) => {
      // Optimistic update - add task immediately
      await queryClient.cancelQueries({ queryKey: ['planner-tasks'] });
      const previousTasks = queryClient.getQueryData(['planner-tasks']);
      
      const tempId = `temp-${uuidv4()}`;
      const tempKey = `PLN-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`;
      const now = new Date().toISOString();
      const today = new Date().toISOString().split('T')[0];
      
      const optimisticTask: PlannerTask = {
        id: tempId,
        key: tempKey,
        title: data.title,
        description: data.description,
        status: data.status,
        type: 'task',
        priority: data.priority,
        assigneeId: data.assigneeId,
        assigneeName: data.assigneeName,
        blocked: false,
        progress: 0,
        comments: 0,
        createdAt: now,
        updatedAt: now,
        startDate: today,
        dueDate: data.dueDate,
      };
      
      queryClient.setQueryData(['planner-tasks'], (old: PlannerTask[] | undefined) => {
        if (!old) return [optimisticTask];
        return [optimisticTask, ...old];
      });
      
      return { previousTasks, tempId };
    },
    onError: (err, data, context) => {
      console.error('Create task error:', err);
      if (context?.previousTasks) {
        queryClient.setQueryData(['planner-tasks'], context.previousTasks);
      }
      catalystToast.error('Failed to create task', 'Please try again.');
    },
    onSuccess: (result, data, context) => {
      // Replace temp task with real one
      queryClient.setQueryData(['planner-tasks'], (old: PlannerTask[] | undefined) => {
        if (!old) return old;
        return old.map(t => t.id === context?.tempId ? { ...t, id: result.id, key: result.key } : t);
      });
      
      // Show single Catalyst toast with task key and assignee
      const assigneeText = result.assigneeName ? ` assigned to ${result.assigneeName}` : '';
      catalystToast.success(
        `Task ${result.key} created`,
        `Task has been created successfully${assigneeText}.`
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
    },
  });
}
