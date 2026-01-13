// ============================================================
// PLANNER COLUMNS HOOK
// CRUD for custom planner columns stored in planner_column_configs
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ColumnConfig } from '../types';
import { useEffect } from 'react';

const QUERY_KEY = ['planner-columns'];

export interface DbColumnConfig {
  id: string;
  column_id: string;
  title: string;
  color: string;
  wip_limit: number | null;
  sort_order: number;
  created_at: string;
  created_by: string | null;
}

// Transform DB row to ColumnConfig
const toColumnConfig = (row: DbColumnConfig): ColumnConfig => ({
  id: row.column_id,
  title: row.title,
  color: row.color,
  wipLimit: row.wip_limit ?? undefined,
  order: row.sort_order,
});

/**
 * Fetch all custom planner columns from the database
 */
export function usePlannerColumns() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planner_column_configs')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching planner columns:', error);
        return [];
      }

      return (data as DbColumnConfig[]).map(toColumnConfig);
    },
  });
}

/**
 * Subscribe to realtime changes on planner_column_configs
 */
export function usePlannerColumnsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('planner-columns-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'planner_column_configs',
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
 * Create a new custom column
 */
export function useCreatePlannerColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (column: Omit<ColumnConfig, 'order'> & { order?: number }) => {
      const { data: userData } = await supabase.auth.getUser();

      // Determine the next sort_order
      const { data: existing } = await supabase
        .from('planner_column_configs')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1);

      const maxOrder = existing?.[0]?.sort_order ?? 99;
      const newOrder = column.order ?? maxOrder + 1;

      const { error } = await supabase.from('planner_column_configs').insert({
        column_id: column.id,
        title: column.title,
        color: column.color,
        wip_limit: column.wipLimit ?? null,
        sort_order: newOrder,
        created_by: userData.user?.id ?? null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/**
 * Delete a custom column by its column_id
 */
export function useDeletePlannerColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (columnId: string) => {
      const { error } = await supabase
        .from('planner_column_configs')
        .delete()
        .eq('column_id', columnId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/**
 * Update column order (for drag-and-drop reordering)
 */
export function useUpdatePlannerColumnOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (columns: { column_id: string; sort_order: number }[]) => {
      // Update each column's sort_order
      const updates = columns.map(col => 
        supabase
          .from('planner_column_configs')
          .update({ sort_order: col.sort_order })
          .eq('column_id', col.column_id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw errors[0].error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
