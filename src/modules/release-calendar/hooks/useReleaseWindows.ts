import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ReleaseWindow, WindowType, WindowSeverity } from '../types';

export const releaseWindowKeys = {
  all: ['release-windows'] as const,
  lists: () => [...releaseWindowKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...releaseWindowKeys.lists(), filters] as const,
  byDateRange: (start: string, end: string) => [...releaseWindowKeys.all, 'range', start, end] as const,
};

export function useReleaseWindows(filters?: {
  window_type?: WindowType;
  from_date?: string;
  to_date?: string;
}) {
  return useQuery({
    queryKey: releaseWindowKeys.list(filters || {}),
    queryFn: async () => {
      let query = supabase
        .from('release_windows')
        .select('*')
        .order('start_date', { ascending: true });

      if (filters?.window_type) {
        query = query.eq('window_type', filters.window_type);
      }
      if (filters?.from_date) {
        query = query.gte('end_date', filters.from_date);
      }
      if (filters?.to_date) {
        query = query.lte('start_date', filters.to_date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ReleaseWindow[];
    },
  });
}

export function useReleaseWindowsByMonth(year: number, month: number) {
  const startDate = new Date(year, month, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

  return useQuery({
    queryKey: releaseWindowKeys.byDateRange(startDate, endDate),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('release_windows')
        .select('*')
        .lte('start_date', endDate)
        .gte('end_date', startDate)
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data as ReleaseWindow[];
    },
  });
}

export function useCreateReleaseWindow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<ReleaseWindow, 'id' | 'created_at' | 'updated_at' | 'created_by_user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('release_windows')
        .insert({
          ...input,
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ReleaseWindow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: releaseWindowKeys.all });
    },
  });
}

export function useUpdateReleaseWindow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<ReleaseWindow> & { id: string }) => {
      const { data, error } = await supabase
        .from('release_windows')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ReleaseWindow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: releaseWindowKeys.all });
    },
  });
}

export function useDeleteReleaseWindow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('release_windows')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: releaseWindowKeys.all });
    },
  });
}
