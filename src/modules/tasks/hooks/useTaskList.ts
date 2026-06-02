/**
 * Task List Data Hook - Planner V9
 * Fetches from planner_task_list view with filters and sorting
 * Respects workstream access control (RLS enforced at DB level)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useUserRole } from '@/hooks/useUserRole';
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
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, isLoading: roleLoading } = useUserRole();
  
  // Check if user can access all workstreams
  const canAccessAll = isAdmin || isSuperAdmin;

  return useQuery({
    queryKey: ['planner-task-list', filters, sorting, user?.id, canAccessAll],
    queryFn: async () => {
      // Build filters array for simpler query construction
      const filterConditions: string[] = [];

      // Apply user-specified filters directly without additional queries
      if (filters.workstream) {
        filterConditions.push(`workstream_id.eq.${filters.workstream}`);
      }
      if (filters.status) {
        filterConditions.push(`status_id.eq.${filters.status}`);
      }
      if (filters.priority) {
        filterConditions.push(`priority.eq.${filters.priority}`);
      }
      if (filters.assignee) {
        filterConditions.push(`assignee_id.eq.${filters.assignee}`);
      }
      if (filters.overdueOnly) {
        filterConditions.push(`is_overdue.eq.true`);
      }
      if (filters.blockedOnly) {
        filterConditions.push(`blocked.eq.true`);
      }

      // Build base query
      let query = supabase
        .from('planner_task_list')
        .select('*');

      // Apply all filters at once using .and() or individual filters
      if (filters.workstream) {
        query = query.eq('workstream_id', filters.workstream);
      }
      if (filters.status) {
        query = query.eq('status_id', filters.status);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters.assignee) {
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
      } else {
        // Default sort by updated_at desc for fast initial load
        query = query.order('updated_at', { ascending: false });
      }

      // Limit for initial fast load
      query = query.limit(200);

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching task list:', error);
        throw error;
      }

      return (data || []) as TaskListTask[];
    },
    enabled: !!user && !roleLoading,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    gcTime: 5 * 60 * 1000, // 5 min cache
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
