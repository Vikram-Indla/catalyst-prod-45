// ============================================================
// MY TASKS HOOKS - TanStack Query Hooks
// Planner V9: Personal Task Management
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { 
  MyTask, 
  TaskSummary, 
  CreateTaskPayload, 
  UpdateTaskPayload,
  BulkUpdatePayload,
  FilterConfig,
  ActivityLogEntry,
  CalendarTaskDay,
} from '../types/my-tasks';

// Query keys
export const myTasksKeys = {
  all: ['planner', 'my-tasks'] as const,
  list: (filters: FilterConfig) => [...myTasksKeys.all, 'list', filters] as const,
  summary: () => [...myTasksKeys.all, 'summary'] as const,
  calendar: (month: string) => [...myTasksKeys.all, 'calendar', month] as const,
  activity: () => [...myTasksKeys.all, 'activity'] as const,
  detail: (id: string) => [...myTasksKeys.all, 'detail', id] as const,
};

/**
 * Fetch all my tasks with optional filters
 */
export function useMyTasks(filters: FilterConfig = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: myTasksKeys.list(filters),
    queryFn: async (): Promise<MyTask[]> => {
      // The view already filters by auth.uid() for user involvement
      let query = supabase
        .from('planner_my_tasks')
        .select('*')
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('sort_order', { ascending: true });

      // Apply filters
      if (filters.timeSection) {
        query = query.eq('time_section', filters.timeSection);
      }
      if (filters.statuses?.length) {
        query = query.in('status_slug', filters.statuses);
      }
      if (filters.workstreams?.length) {
        query = query.in('workstream_slug', filters.workstreams);
      }
      if (filters.priorities?.length) {
        query = query.in('priority', filters.priorities);
      }
      if (filters.searchQuery) {
        query = query.or(`title.ilike.%${filters.searchQuery}%,task_key.ilike.%${filters.searchQuery}%`);
      }
      if (filters.involvement && filters.involvement !== 'all') {
        query = query.eq('involvement_type', filters.involvement);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MyTask[];
    },
    enabled: !!user?.id,
  });
}

/**
 * Fetch task summary stats
 */
export function useMyTasksSummary() {
  const { user } = useAuth();

  return useQuery({
    queryKey: myTasksKeys.summary(),
    queryFn: async (): Promise<TaskSummary> => {
      // The view already filters by auth.uid()
      const { data, error } = await supabase
        .from('planner_my_tasks_summary')
        .select('*')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return (data || {
        user_id: user?.id || null,
        total_tasks: 0,
        overdue_count: 0,
        today_count: 0,
        this_week_count: 0,
        upcoming_count: 0,
        someday_count: 0,
        completed_today: 0,
        assigned_count: 0,
        created_count: 0,
        needs_review_count: 0,
        watching_count: 0,
      }) as TaskSummary;
    },
    enabled: !!user?.id,
  });
}

/**
 * Fetch calendar task distribution
 */
export function useMyTasksCalendar(month: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: myTasksKeys.calendar(month),
    queryFn: async () => {
      const startDate = `${month}-01`;
      const endDate = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0)
        .toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('planner_calendar_tasks')
        .select('*')
        .eq('assignee_id', user?.id)
        .gte('due_date', startDate)
        .lte('due_date', endDate);

      if (error) throw error;
      return data as CalendarTaskDay[];
    },
    enabled: !!user?.id,
  });
}

/**
 * Fetch recent activity
 */
export function useMyTasksActivity(limit = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: myTasksKeys.activity(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planner_activity_log')
        .select(`
          *,
          planner_tasks!inner(task_key, title, assignee_id)
        `)
        .eq('planner_tasks.assignee_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as ActivityLogEntry[];
    },
    enabled: !!user?.id,
  });
}

/**
 * Create new task
 */
export function useCreateMyTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: CreateTaskPayload) => {
      // Generate task key
      const { data: lastTask } = await supabase
        .from('planner_tasks')
        .select('task_key')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const lastNum = lastTask?.task_key 
        ? parseInt(lastTask.task_key.replace('PLN-', '')) 
        : 0;
      const newKey = `PLN-${String(lastNum + 1).padStart(3, '0')}`;

      const { data, error } = await supabase
        .from('planner_tasks')
        .insert({
          ...payload,
          key: newKey,
          task_key: newKey,
          assignee_id: user?.id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('planner_activity_log').insert({
        task_id: data.id,
        user_id: user?.id,
        action: 'created',
        new_value: { title: payload.title },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myTasksKeys.all });
    },
  });
}

/**
 * Update task
 */
export function useUpdateMyTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTaskPayload) => {
      // Get old values for activity log
      const { data: oldTask } = await supabase
        .from('planner_tasks')
        .select('*')
        .eq('id', id)
        .single();

      const updateData: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() };
      
      // If status changed to done, set completed_at
      if (updates.status_id) {
        const { data: status } = await supabase
          .from('planner_statuses')
          .select('is_done')
          .eq('id', updates.status_id)
          .single();
        
        if (status?.is_done) {
          updateData.completed_at = new Date().toISOString();
        } else {
          updateData.completed_at = null;
        }
      }

      const { data, error } = await supabase
        .from('planner_tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      const changedFields = Object.keys(updates);
      let action = 'updated';
      if (changedFields.includes('status_id')) action = 'status_changed';
      if (changedFields.includes('priority')) action = 'priority_changed';
      if (updateData.completed_at) action = 'completed';

      await supabase.from('planner_activity_log').insert({
        task_id: id,
        user_id: user?.id,
        action,
        old_value: oldTask,
        new_value: updates,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myTasksKeys.all });
    },
  });
}

/**
 * Bulk update tasks
 */
export function useBulkUpdateMyTasks() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ task_ids, updates }: BulkUpdatePayload) => {
      const updateData: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() };

      // Handle completion status
      if (updates.status_id) {
        const { data: status } = await supabase
          .from('planner_statuses')
          .select('is_done')
          .eq('id', updates.status_id)
          .single();
        
        if (status?.is_done) {
          updateData.completed_at = new Date().toISOString();
        } else {
          updateData.completed_at = null;
        }
      }

      const { data, error } = await supabase
        .from('planner_tasks')
        .update(updateData)
        .in('id', task_ids)
        .select();

      if (error) throw error;

      // Log bulk activity
      await supabase.from('planner_activity_log').insert(
        task_ids.map(task_id => ({
          task_id,
          user_id: user?.id,
          action: 'updated',
          new_value: { bulk_update: true, ...updates },
        }))
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myTasksKeys.all });
    },
  });
}

/**
 * Delete task
 */
export function useDeleteMyTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('planner_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myTasksKeys.all });
    },
  });
}

/**
 * Mark task complete (quick action)
 */
export function useCompleteMyTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (taskId: string) => {
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

      // Log completion
      await supabase.from('planner_activity_log').insert({
        task_id: taskId,
        user_id: user?.id,
        action: 'completed',
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myTasksKeys.all });
    },
  });
}

/**
 * Reorder task (drag & drop)
 */
export function useReorderMyTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      newIndex, 
      sectionTasks 
    }: { 
      taskId: string; 
      newIndex: number; 
      sectionTasks: MyTask[];
    }) => {
      // Calculate new sort orders
      const updates = sectionTasks.map((task, index) => ({
        id: task.id,
        sort_order: index === newIndex ? newIndex : index < newIndex ? index : index + 1,
      }));

      // Batch update
      for (const update of updates) {
        await supabase
          .from('planner_tasks')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myTasksKeys.all });
    },
  });
}
