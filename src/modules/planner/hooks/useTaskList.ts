/**
 * Task List Data Hook - Planner V9
 * Fetches from planner_task_list view with filters and sorting
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TaskPriority } from '../types';

export interface TaskListFilters {
  search?: string;
  workstream?: string | null;
  status?: string | null;
  priority?: TaskPriority | null;
  assignee?: string | null;
  overdueOnly?: boolean;
  blockedOnly?: boolean;
}

export interface TaskListSorting {
  field: string;
  direction: 'asc' | 'desc';
}

export interface TaskListTask {
  id: string;
  task_key: string;
  title: string;
  description: string | null;
  status_id: string | null;
  status_name: string | null;
  status_slug: string | null;
  status_color: string | null;
  status_is_done: boolean;
  priority: TaskPriority;
  workstream_id: string | null;
  workstream_name: string | null;
  workstream_slug: string | null;
  workstream_color: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_avatar: string | null;
  due_date: string | null;
  start_date: string | null;
  progress: number;
  blocked: boolean;
  blocked_reason: string | null;
  time_estimate_minutes: number | null;
  time_logged_minutes: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  creator_name: string | null;
  sort_order: number;
  is_overdue: boolean;
  is_due_today: boolean;
  is_due_soon: boolean;
}

export function useTaskList(filters: TaskListFilters = {}, sorting?: TaskListSorting) {
  return useQuery({
    queryKey: ['planner-task-list', filters, sorting],
    queryFn: async () => {
      let query = supabase
        .from('planner_task_list')
        .select('*');

      // Apply filters
      if (filters.workstream) {
        query = query.eq('workstream_id', filters.workstream);
      }
      if (filters.status) {
        // Support filtering by status slug or status id
        query = query.or(`status_id.eq.${filters.status},status_slug.eq.${filters.status}`);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters.assignee === null) {
        // Unassigned tasks
        query = query.is('assignee_id', null);
      } else if (filters.assignee) {
        query = query.eq('assignee_id', filters.assignee);
      }
      if (filters.overdueOnly) {
        query = query.eq('is_overdue', true);
      }
      if (filters.blockedOnly) {
        query = query.eq('blocked', true);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,task_key.ilike.%${filters.search}%`);
      }

      // Apply sorting
      if (sorting) {
        query = query.order(sorting.field, { ascending: sorting.direction === 'asc' });
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching task list:', error);
        throw error;
      }

      return (data || []) as TaskListTask[];
    },
    staleTime: 30000, // 30 seconds
  });
}

export function useTaskListStats(workstreamId?: string | null, assigneeId?: string | null) {
  return useQuery({
    queryKey: ['planner-task-list-stats', workstreamId, assigneeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('planner_task_list_stats', {
          p_workstream_id: workstreamId || null,
          p_assignee_id: assigneeId || null,
        });

      if (error) {
        console.error('Error fetching task list stats:', error);
        return { total_count: 0, overdue_count: 0, in_progress_count: 0, done_count: 0 };
      }

      return data?.[0] || { total_count: 0, overdue_count: 0, in_progress_count: 0, done_count: 0 };
    },
    staleTime: 30000,
  });
}
