// ============================================================
// KANBAN STATUSES HOOK
// CRUD for planner_statuses (Kanban columns)
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PlannerStatus } from '../types/kanban';
import { toast } from 'sonner';
import { useEffect } from 'react';

const QUERY_KEY = ['kanban-statuses'];

/**
 * Fetch all Kanban statuses (columns) ordered by position
 */
export function useKanbanStatuses() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planner_statuses')
        .select('*')
        .order('position', { ascending: true });
      
      if (error) {
        console.error('Error fetching statuses:', error);
        throw error;
      }
      return data as PlannerStatus[];
    },
  });
}

/**
 * Subscribe to realtime changes on planner_statuses
 */
export function useKanbanStatusesRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('kanban-statuses-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'planner_statuses',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Create a new status column
 */
export function useCreateKanbanStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (status: { name: string; color?: string }) => {
      // Get max position
      const { data: existing } = await supabase
        .from('planner_statuses')
        .select('position')
        .order('position', { ascending: false })
        .limit(1);
      
      const nextPosition = (existing?.[0]?.position ?? -1) + 1;
      const slug = status.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      const { data, error } = await supabase
        .from('planner_statuses')
        .insert({
          name: status.name,
          slug,
          color: status.color || 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))',
          position: nextPosition,
          is_default: false,
          is_completed_status: false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Column created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create column: ' + error.message);
    },
  });
}

/**
 * Update a status column
 */
export function useUpdateKanbanStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlannerStatus> & { id: string }) => {
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (error) => {
      toast.error('Failed to update column: ' + error.message);
    },
  });
}

/**
 * Delete a status column (moves tasks to default status first)
 */
export function useDeleteKanbanStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Get default status
      const { data: defaultStatus } = await supabase
        .from('planner_statuses')
        .select('id')
        .eq('is_default', true)
        .maybeSingle();
      
      if (defaultStatus) {
        // Move tasks from deleted column to default
        await supabase
          .from('planner_tasks')
          .update({ status_id: defaultStatus.id })
          .eq('status_id', id);
      }
      
      const { error } = await supabase
        .from('planner_statuses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
      toast.success('Column deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete column: ' + error.message);
    },
  });
}

/**
 * Reorder statuses (drag & drop columns)
 */
export function useReorderKanbanStatuses() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (statuses: { id: string; position: number }[]) => {
      const updates = statuses.map(({ id, position }) =>
        supabase
          .from('planner_statuses')
          .update({ position })
          .eq('id', id)
      );
      
      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
