// src/hooks/useWorkManagerTasks.ts
// Hooks for Work Manager Tasks CRUD operations with real-time sync

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { Task, TaskStatus, Priority, TaskType, RecurrenceType, LinkedItem } from '@/components/work-manager/types';

// Database row type
interface WorkManagerTaskRow {
  id: string;
  key: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  status: string;
  assignee_id: string | null;
  reporter_id: string | null;
  team_id: string | null;
  board_id: string | null;
  column_position: number;
  due_date: string | null;
  blocked: boolean;
  blocked_reason: string | null;
  blocked_at: string | null;
  linked_item_type: string | null;
  linked_item_key: string | null;
  linked_item_title: string | null;
  recurrence: string;
  tags: string[] | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Transform database row to Task type
function rowToTask(row: WorkManagerTaskRow): Task {
  return {
    id: row.id,
    key: row.key,
    title: row.title,
    description: row.description || undefined,
    type: row.type as TaskType,
    priority: row.priority as Priority,
    status: row.status as TaskStatus,
    assigneeId: row.assignee_id || '',
    reporterId: row.reporter_id || undefined,
    teamId: row.team_id || '',
    boardId: row.board_id || '',
    columnPosition: row.column_position,
    dueDate: row.due_date || undefined,
    blocked: row.blocked,
    blockedReason: row.blocked_reason || undefined,
    blockedAt: row.blocked_at || undefined,
    linkedItem: row.linked_item_type && row.linked_item_key ? {
      type: row.linked_item_type as LinkedItem['type'],
      key: row.linked_item_key,
      title: row.linked_item_title || undefined,
    } : null,
    recurrence: row.recurrence as RecurrenceType,
    tags: row.tags || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at || undefined,
  };
}

// Fetch all tasks for Work Manager
export function useWorkManagerTasks(teamId?: string | null) {
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('work-manager-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_manager_tasks',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['work-manager-tasks'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['work-manager-tasks', teamId],
    queryFn: async () => {
      let query = supabase
        .from('work_manager_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(row => rowToTask(row as WorkManagerTaskRow));
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

// Create a new task
export function useCreateWorkManagerTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: Omit<Task, 'id' | 'key' | 'createdAt' | 'updatedAt'>) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const insertData = {
        title: task.title,
        description: task.description || null,
        type: task.type,
        priority: task.priority,
        status: task.status,
        assignee_id: task.assigneeId || null,
        reporter_id: task.reporterId || userData.user?.id || null,
        team_id: task.teamId || null,
        board_id: task.boardId || null,
        column_position: task.columnPosition || 0,
        due_date: task.dueDate || null,
        blocked: task.blocked || false,
        blocked_reason: task.blockedReason || null,
        blocked_at: task.blockedAt || null,
        linked_item_type: task.linkedItem?.type || null,
        linked_item_key: task.linkedItem?.key || null,
        linked_item_title: task.linkedItem?.title || null,
        recurrence: task.recurrence || 'None',
        tags: task.tags || [],
        created_by: userData.user?.id || null,
      };

      const { data, error } = await supabase
        .from('work_manager_tasks')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return rowToTask(data as WorkManagerTaskRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-manager-tasks'] });
      toast.success('Task created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create task: ${error.message}`);
    },
  });
}

// Update a task
export function useUpdateWorkManagerTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      const updateData: Record<string, unknown> = {};
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.status !== undefined) {
        updateData.status = updates.status;
        if (updates.status === 'Done') {
          updateData.completed_at = new Date().toISOString();
        }
      }
      if (updates.assigneeId !== undefined) updateData.assignee_id = updates.assigneeId || null;
      if (updates.reporterId !== undefined) updateData.reporter_id = updates.reporterId || null;
      if (updates.teamId !== undefined) updateData.team_id = updates.teamId || null;
      if (updates.boardId !== undefined) updateData.board_id = updates.boardId || null;
      if (updates.columnPosition !== undefined) updateData.column_position = updates.columnPosition;
      if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate || null;
      if (updates.blocked !== undefined) {
        updateData.blocked = updates.blocked;
        if (updates.blocked) {
          updateData.blocked_at = new Date().toISOString();
        } else {
          updateData.blocked_at = null;
          updateData.blocked_reason = null;
        }
      }
      if (updates.blockedReason !== undefined) updateData.blocked_reason = updates.blockedReason || null;
      if (updates.recurrence !== undefined) updateData.recurrence = updates.recurrence;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.linkedItem !== undefined) {
        updateData.linked_item_type = updates.linkedItem?.type || null;
        updateData.linked_item_key = updates.linkedItem?.key || null;
        updateData.linked_item_title = updates.linkedItem?.title || null;
      }

      const { data, error } = await supabase
        .from('work_manager_tasks')
        .update(updateData as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return rowToTask(data as WorkManagerTaskRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-manager-tasks'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update task: ${error.message}`);
    },
  });
}

// Delete a task
export function useDeleteWorkManagerTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('work_manager_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-manager-tasks'] });
      toast.success('Task deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete task: ${error.message}`);
    },
  });
}
