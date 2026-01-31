/**
 * Column Management Hooks
 * CRUD operations for planner board columns (statuses)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateColumnInput {
  name: string;
  color: string;
}

export interface UpdateColumnInput {
  id: string;
  name?: string;
  color?: string;
}

export interface ReorderColumnsInput {
  columns: Array<{ id: string; position: number }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useCreateColumn
// ═══════════════════════════════════════════════════════════════════════════════
export function useCreateColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, color }: CreateColumnInput) => {
      // Generate slug from name
      const slug = name.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      // Get max position
      const { data: maxPosData } = await supabase
        .from('planner_statuses')
        .select('position')
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();

      const newPosition = (maxPosData?.position ?? -1) + 1;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Insert new status
      const { data, error } = await supabase
        .from('planner_statuses')
        .insert({
          name: name.trim(),
          slug,
          color,
          position: newPosition,
          sort_order: newPosition,
          is_system: false,
          is_default: false,
          is_done: false,
          is_completed_status: false,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['planner', 'board', 'columns'] });
      queryClient.invalidateQueries({ queryKey: ['planner-statuses'] });
      toast.success(`Column "${data.name}" created`);
    },
    onError: (error) => {
      console.error('Failed to create column:', error);
      toast.error('Failed to create column');
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useUpdateColumn
// ═══════════════════════════════════════════════════════════════════════════════
export function useUpdateColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, color }: UpdateColumnInput) => {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (name !== undefined) {
        updates.name = name.trim();
        updates.slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }
      if (color !== undefined) {
        updates.color = color;
      }

      const { data, error } = await supabase
        .from('planner_statuses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', 'board', 'columns'] });
      queryClient.invalidateQueries({ queryKey: ['planner-statuses'] });
      toast.success('Column updated');
    },
    onError: (error) => {
      console.error('Failed to update column:', error);
      toast.error('Failed to update column');
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useDeleteColumn
// ═══════════════════════════════════════════════════════════════════════════════
export function useDeleteColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, moveTasksToBacklog }: { id: string; moveTasksToBacklog?: boolean }) => {
      // Check if this is a system column
      const { data: status } = await supabase
        .from('planner_statuses')
        .select('is_system, name')
        .eq('id', id)
        .single();

      if (status?.is_system) {
        throw new Error('Cannot delete system columns');
      }

      // Get backlog status ID for moving tasks
      if (moveTasksToBacklog) {
        const { data: backlog } = await supabase
          .from('planner_statuses')
          .select('id')
          .eq('slug', 'backlog')
          .single();

        if (backlog) {
          // Move tasks to backlog
          await supabase
            .from('planner_tasks')
            .update({ status_id: backlog.id })
            .eq('status_id', id);
        }
      }

      // Delete the status
      const { error } = await supabase
        .from('planner_statuses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { name: status?.name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['planner', 'board'] });
      queryClient.invalidateQueries({ queryKey: ['planner-statuses'] });
      toast.success(`Column "${data.name}" deleted`);
    },
    onError: (error) => {
      console.error('Failed to delete column:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete column');
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useReorderColumns
// ═══════════════════════════════════════════════════════════════════════════════
export function useReorderColumns() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ columns }: ReorderColumnsInput) => {
      // Update each column's position
      const updates = columns.map(({ id, position }) =>
        supabase
          .from('planner_statuses')
          .update({ position, sort_order: position, updated_at: new Date().toISOString() })
          .eq('id', id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error('Failed to update some column positions');
      }

      return columns;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', 'board', 'columns'] });
      queryClient.invalidateQueries({ queryKey: ['planner-statuses'] });
    },
    onError: (error) => {
      console.error('Failed to reorder columns:', error);
      toast.error('Failed to reorder columns');
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useColumnTaskCount
// ═══════════════════════════════════════════════════════════════════════════════
export function useColumnTaskCount(statusId: string) {
  return supabase
    .from('planner_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('status_id', statusId)
    .is('deleted_at', null);
}
