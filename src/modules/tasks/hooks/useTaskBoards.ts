/**
 * Planner Boards Hooks - V9
 * TanStack Query hooks for Kanban board data
 */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  BoardColumn,
  BoardTask,
  CreateTaskInput,
  UpdateTaskInput,
  MoveTaskInput,
  BoardFilters,
} from '../types/planner-boards';

const STALE_TIME = 30 * 1000;

// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useBoardColumns
// ═══════════════════════════════════════════════════════════════════════════════
export function useBoardColumns() {
  return useQuery({
    queryKey: ['tasks', 'board', 'columns'],
    queryFn: async (): Promise<BoardColumn[]> => {
      const { data, error } = await supabase
        .from('task_statuses')
        .select('*')
        .order('position');

      if (error) throw error;
      return (data || []).map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        color: s.color,
        position: s.position,
        is_completed_status: s.is_completed_status ?? false,
        is_system: s.is_default ?? false,
        task_count: 0,
      })) as BoardColumn[];
    },
    staleTime: STALE_TIME,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useBoardTasks
// ═══════════════════════════════════════════════════════════════════════════════
export function useBoardTasks(filters?: BoardFilters) {
  return useQuery({
    queryKey: ['tasks', 'board', 'tasks', filters],
    queryFn: async (): Promise<BoardTask[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabase
        .from('tasks')
        .select(`
          *,
          status:task_statuses(id,name,slug,color,position,is_completed_status),
          workstream:task_workstreams(id,name,slug,color),
          assignee:profiles!tasks_assignee_id_fkey(id,full_name,avatar_url)
        `)
        .is('deleted_at', null);

      if (filters?.workstream_id) {
        query = query.eq('workstream_id', filters.workstream_id);
      }
      if (filters?.assignee_id) {
        query = query.eq('assignee_id', filters.assignee_id);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,key.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((r: any): BoardTask => ({
        id: r.id,
        key: r.key ?? r.task_key ?? '',
        title: r.title,
        description: r.description ?? null,
        priority: r.priority ?? 'medium',
        status_id: r.status_id,
        status_name: r.status?.name ?? '',
        status_slug: r.status?.slug ?? '',
        status_color: r.status?.color ?? 'var(--ds-background-neutral, #F1F2F4)',
        status_position: r.status?.position ?? 0,
        is_completed_status: r.status?.is_completed_status ?? false,
        workstream_id: r.workstream_id ?? null,
        workstream_name: r.workstream?.name ?? null,
        workstream_slug: r.workstream?.slug ?? null,
        workstream_color: r.workstream?.color ?? null,
        assignee_id: r.assignee_id ?? null,
        assignee_name: r.assignee?.full_name ?? null,
        assignee_avatar: r.assignee?.avatar_url ?? null,
        due_date: r.due_date ?? null,
        due_status: r.due_status ?? null,
        days_until_due: r.days_until_due ?? null,
        position: r.position ?? 0,
        progress: r.progress ?? 0,
        blocked: r.blocked ?? false,
        blocked_reason: r.blocked_reason ?? null,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));
    },
    staleTime: STALE_TIME,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useBoardData (Combined)
// ═══════════════════════════════════════════════════════════════════════════════
export function useBoardData(filters?: BoardFilters) {
  const columns = useBoardColumns();
  const tasks = useBoardTasks(filters);
  
  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    if (!tasks.data) return {};
    
    return tasks.data.reduce((acc, task) => {
      const statusSlug = task.status_slug;
      if (!acc[statusSlug]) {
        acc[statusSlug] = [];
      }
      acc[statusSlug].push(task);
      return acc;
    }, {} as Record<string, BoardTask[]>);
  }, [tasks.data]);
  
  const columnsWithCount = useMemo(() => {
    const raw = columns.data ?? [];
    return raw.map((col) => ({
      ...col,
      task_count: (tasksByStatus[col.slug] ?? []).length,
    }));
  }, [columns.data, tasksByStatus]);

  return {
    columns: columnsWithCount,
    tasks: tasks.data ?? [],
    tasksByStatus,
    isLoading: columns.isLoading || tasks.isLoading,
    isError: columns.isError || tasks.isError,
    refetch: () => {
      columns.refetch();
      tasks.refetch();
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mutation: useCreateBoardTask
// ═══════════════════════════════════════════════════════════════════════════════
export function useCreateBoardTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      // Key is assigned by the DB trigger (uniform TSK-N) — single source of
      // truth. Do NOT compute a key client-side (caused detail-view drift).

      // Get max position in target status
      const { data: maxPos } = await supabase
        .from('tasks')
        .select('position')
        .eq('status_id', input.status_id)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const newPosition = (maxPos?.position ?? -1) + 1;
      
      // Insert task
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title: input.title,
          description: input.description,
          status_id: input.status_id,
          priority: input.priority ?? 'medium',
          workstream_id: input.workstream_id,
          assignee_id: input.assignee_id,
          due_date: input.due_date,
          position: newPosition,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'board'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'dashboard'] });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mutation: useUpdateBoardTask
// ═══════════════════════════════════════════════════════════════════════════════
export function useUpdateBoardTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: UpdateTaskInput) => {
      const { id, ...updates } = input;
      
      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'board'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'dashboard'] });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mutation: useMoveBoardTask
// ═══════════════════════════════════════════════════════════════════════════════
export function useMoveBoardTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ task_id, target_status_id, target_position }: MoveTaskInput) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status_id: target_status_id,
          position: target_position,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task_id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onMutate: async ({ task_id, target_status_id }) => {
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: ['tasks', 'board', 'tasks'] });
      
      const previousTasks = queryClient.getQueryData<BoardTask[]>(['tasks', 'board', 'tasks']);
      
      if (previousTasks) {
        const columns = queryClient.getQueryData<BoardColumn[]>(['tasks', 'board', 'columns']);
        const targetColumn = columns?.find(c => c.id === target_status_id);
        
        // Optimistic update
        queryClient.setQueryData<BoardTask[]>(
          ['tasks', 'board', 'tasks'],
          previousTasks.map(task => 
            task.id === task_id 
              ? { 
                  ...task, 
                  status_id: target_status_id,
                  status_slug: targetColumn?.slug ?? task.status_slug,
                }
              : task
          )
        );
      }
      
      return { previousTasks };
    },
    onError: (_, __, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', 'board', 'tasks'], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'board'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'dashboard'] });
      // 2026-06-16: also invalidate the canonical planner-tasks + kanban-tasks
      // caches so the PragmaticBoard / list view refresh after a drop. The
      // legacy hook only invalidated ['tasks', 'board'] which the canonical
      // surfaces don't read from.
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mutation: useDeleteBoardTask
// ═══════════════════════════════════════════════════════════════════════════════
export function useDeleteBoardTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (taskId: string) => {
      // Soft delete
      const { error } = await supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'board'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'dashboard'] });
    },
  });
}
