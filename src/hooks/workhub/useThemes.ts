/**
 * ProjectHub Themes Hooks — TanStack Query
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Theme, ThemeProgress } from '@/types/workhub.types';
import toast from 'react-hot-toast';

export function useWHThemes() {
  return useQuery({
    queryKey: ['projecthub', 'themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_themes')
        .select('*')
        .order('sort_order')
        .order('name');
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Theme[];
    },
    staleTime: 30_000,
  });
}

export const useThemes = useWHThemes;

export function useTheme(id: string) {
  return useQuery({
    queryKey: ['projecthub', 'theme', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_themes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as Theme;
    },
    enabled: !!id,
  });
}

export function useThemeProgress() {
  return useQuery({
    queryKey: ['projecthub', 'theme-progress'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_ph_theme_progress')
        .select('*')
        .order('name');
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ThemeProgress[];
    },
    staleTime: 30_000,
  });
}

export function useThemeProgressById(id: string) {
  return useQuery({
    queryKey: ['projecthub', 'theme-progress', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_ph_theme_progress')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as ThemeProgress;
    },
    enabled: !!id,
  });
}

export function useCreateTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (newTheme: Partial<Theme>) => {
      const { data, error } = await supabase
        .from('ph_themes')
        .insert(newTheme as any)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projecthub', 'themes'] });
      qc.invalidateQueries({ queryKey: ['projecthub', 'theme-progress'] });
    },
  });
}

export function useUpdateTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Theme> }) => {
      const { error } = await supabase
        .from('ph_themes')
        .update(updates as any)
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projecthub'] });
    },
  });
}

export function useDeleteTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from('ph_issues')
        .update({ theme_id: null } as any)
        .eq('theme_id', id);
      const { error } = await supabase
        .from('ph_themes')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projecthub'] });
    },
  });
}
