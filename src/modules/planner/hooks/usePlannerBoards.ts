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
    queryKey: ['planner', 'board', 'columns'],
    queryFn: async (): Promise<BoardColumn[]> => {
      const { data, error } = await supabase
        .from('planner_board_columns')
        .select('*')
        .order('position');
      
      if (error) throw error;
      return (data || []) as BoardColumn[];
    },
    staleTime: STALE_TIME,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useBoardTasks
// ═══════════════════════════════════════════════════════════════════════════════
export function useBoardTasks(filters?: BoardFilters) {
  return useQuery({
    queryKey: ['planner', 'board', 'tasks', filters],
    queryFn: async (): Promise<BoardTask[]> => {
      let query = supabase
        .from('planner_board_tasks')
        .select('*');
      
      // Apply filters
      if (filters?.workstream_id) {
        query = query.eq('workstream_id', filters.workstream_id);
      }
      if (filters?.assignee_id) {
        query = query.eq('assignee_id', filters.assignee_id);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.due_status) {
        query = query.eq('due_status', filters.due_status);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,key.ilike.%${filters.search}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as BoardTask[];
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
  
  return {
    columns: columns.data ?? [],
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
      // Generate next task key
      const { data: lastTask } = await supabase
        .from('planner_tasks')
        .select('key')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const lastNumber = lastTask?.key 
        ? parseInt(lastTask.key.replace('PLN-', ''), 10) 
        : 0;
      const newKey = `PLN-${lastNumber + 1}`;
      
      // Get max position in target status
      const { data: maxPos } = await supabase
        .from('planner_tasks')
        .select('position')
        .eq('status_id', input.status_id)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const newPosition = (maxPos?.position ?? -1) + 1;
      
      // Insert task
      const { data, error } = await supabase
        .from('planner_tasks')
        .insert({
          key: newKey,
          title: input.title,
          description: input.description,
          status_id: input.status_id,
          priority: input.priority ?? 'medium',
          workstream_id: input.workstream_id,
          assignee_id: input.assignee_id,
          due_date: input.due_date,
          position: newPosition,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', 'board'] });
      queryClient.invalidateQueries({ queryKey: ['planner', 'dashboard'] });
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
        .from('planner_tasks')
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
      queryClient.invalidateQueries({ queryKey: ['planner', 'board'] });
      queryClient.invalidateQueries({ queryKey: ['planner', 'dashboard'] });
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
        .from('planner_tasks')
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
      await queryClient.cancelQueries({ queryKey: ['planner', 'board', 'tasks'] });
      
      const previousTasks = queryClient.getQueryData<BoardTask[]>(['planner', 'board', 'tasks']);
      
      if (previousTasks) {
        const columns = queryClient.getQueryData<BoardColumn[]>(['planner', 'board', 'columns']);
        const targetColumn = columns?.find(c => c.id === target_status_id);
        
        // Optimistic update
        queryClient.setQueryData<BoardTask[]>(
          ['planner', 'board', 'tasks'],
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
        queryClient.setQueryData(['planner', 'board', 'tasks'], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', 'board'] });
      queryClient.invalidateQueries({ queryKey: ['planner', 'dashboard'] });
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
        .from('planner_tasks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', 'board'] });
      queryClient.invalidateQueries({ queryKey: ['planner', 'dashboard'] });
    },
  });
}
