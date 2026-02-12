/**
 * WorkHub Themes Hooks — TanStack Query
 * Phase 5: Full CRUD + progress aggregation
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Theme, ThemeProgress } from '@/types/workhub.types';
import toast from 'react-hot-toast';

/** Hook A — All themes */
export function useWHThemes() {
  return useQuery({
    queryKey: ['workhub', 'themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wh_themes')
        .select('*')
        .order('sort_order')
        .order('name');
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Theme[];
    },
    staleTime: 30_000,
  });
}

/** Legacy alias */
export const useThemes = useWHThemes;

/** Hook B — Single theme */
export function useTheme(id: string) {
  return useQuery({
    queryKey: ['workhub', 'theme', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wh_themes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as Theme;
    },
    enabled: !!id,
  });
}

/** Hook C — All theme progress (aggregated view) */
export function useThemeProgress() {
  return useQuery({
    queryKey: ['workhub', 'theme-progress'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_wh_theme_progress')
        .select('*')
        .order('name');
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ThemeProgress[];
    },
    staleTime: 30_000,
  });
}

/** Hook D — Single theme progress */
export function useThemeProgressById(id: string) {
  return useQuery({
    queryKey: ['workhub', 'theme-progress', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_wh_theme_progress')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as ThemeProgress;
    },
    enabled: !!id,
  });
}

/** Hook E — Create theme */
export function useCreateTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (newTheme: Partial<Theme>) => {
      const { data, error } = await supabase
        .from('wh_themes')
        .insert(newTheme as any)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workhub', 'themes'] });
      qc.invalidateQueries({ queryKey: ['workhub', 'theme-progress'] });
    },
  });
}

/** Hook F — Update theme */
export function useUpdateTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Theme> }) => {
      const { error } = await supabase
        .from('wh_themes')
        .update(updates as any)
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workhub'] });
    },
  });
}

/** Hook G — Delete theme (unlinks items first) */
export function useDeleteTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Unlink work items
      await supabase
        .from('wh_issues')
        .update({ theme_id: null } as any)
        .eq('theme_id', id);
      // 2. Delete theme
      const { error } = await supabase
        .from('wh_themes')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workhub'] });
    },
  });
}
