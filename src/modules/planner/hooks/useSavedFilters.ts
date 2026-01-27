// ============================================================
// SAVED FILTERS HOOKS
// Planner V9: User-created filter presets
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { SavedFilter, FilterConfig } from '../types/my-tasks';

export const savedFiltersKeys = {
  all: ['planner', 'saved-filters'] as const,
  list: () => [...savedFiltersKeys.all, 'list'] as const,
};

/**
 * Fetch user's saved filters
 */
export function useSavedFilters() {
  const { user } = useAuth();

  return useQuery({
    queryKey: savedFiltersKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planner_saved_filters')
        .select('*')
        .eq('user_id', user?.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as SavedFilter[];
    },
    enabled: !!user?.id,
  });
}

/**
 * Create a saved filter
 */
export function useCreateSavedFilter() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, filter_config }: { name: string; filter_config: FilterConfig }) => {
      const { data, error } = await supabase
        .from('planner_saved_filters')
        .insert([{
          user_id: user?.id!,
          name,
          filter_config: JSON.parse(JSON.stringify(filter_config)),
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedFiltersKeys.all });
    },
  });
}

/**
 * Update a saved filter
 */
export function useUpdateSavedFilter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, filter_config, is_default }: { id: string; name?: string; filter_config?: FilterConfig; is_default?: boolean }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (filter_config !== undefined) updates.filter_config = filter_config;
      if (is_default !== undefined) updates.is_default = is_default;

      const { data, error } = await supabase
        .from('planner_saved_filters')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedFiltersKeys.all });
    },
  });
}

/**
 * Delete a saved filter
 */
export function useDeleteSavedFilter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (filterId: string) => {
      const { error } = await supabase
        .from('planner_saved_filters')
        .delete()
        .eq('id', filterId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedFiltersKeys.all });
    },
  });
}
