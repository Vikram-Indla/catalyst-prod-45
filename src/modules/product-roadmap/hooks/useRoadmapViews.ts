/**
 * Hook for managing saved roadmap views
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RoadmapView, RoadmapFilters, GroupingField } from '../types/roadmap';
import { EMPTY_FILTERS } from '../types/roadmap';

// Helper to safely parse filters from JSON
function parseFilters(filters: unknown): RoadmapFilters {
  if (!filters || typeof filters !== 'object') return EMPTY_FILTERS;
  const f = filters as Record<string, unknown>;
  return {
    search: typeof f.search === 'string' ? f.search : '',
    status: Array.isArray(f.status) ? f.status : [],
    priority: Array.isArray(f.priority) ? f.priority : [],
    product_ids: Array.isArray(f.product_ids) ? f.product_ids : [],
    assignee_ids: Array.isArray(f.assignee_ids) ? f.assignee_ids : [],
    platforms: Array.isArray(f.platforms) ? f.platforms : [],
    health: Array.isArray(f.health) ? f.health : [],
    date_range: {
      start: typeof (f.date_range as any)?.start === 'string' ? (f.date_range as any).start : null,
      end: typeof (f.date_range as any)?.end === 'string' ? (f.date_range as any).end : null,
    },
  };
}

export function useRoadmapViews() {
  return useQuery({
    queryKey: ['roadmap-views'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('roadmap_views')
        .select('*')
        .or(`user_id.eq.${user.id},is_shared.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((item) => ({
        ...item,
        filters: parseFilters(item.filters),
        grouping: (item.grouping as GroupingField) || null,
      })) as RoadmapView[];
    },
  });
}

export function useCreateRoadmapView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      filters,
      grouping,
      is_default = false,
      is_shared = false,
    }: {
      name: string;
      filters: RoadmapFilters;
      grouping: GroupingField;
      is_default?: boolean;
      is_shared?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (is_default) {
        await supabase
          .from('roadmap_views')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('is_default', true);
      }

      const { data, error } = await supabase
        .from('roadmap_views')
        .insert([{
          name,
          user_id: user.id,
          filters: JSON.parse(JSON.stringify(filters)),
          grouping,
          is_default,
          is_shared,
        }])
        .select()
        .single();

      if (error) throw error;
      return { ...data, filters: parseFilters(data.filters), grouping: data.grouping as GroupingField } as RoadmapView;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-views'] });
    },
  });
}

export function useUpdateRoadmapView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Omit<RoadmapView, 'filters'>> & { filters?: RoadmapFilters } }) => {
      const dbUpdates: Record<string, unknown> = { ...updates };
      if (updates.filters) {
        dbUpdates.filters = updates.filters as unknown as Record<string, unknown>;
      }
      
      const { data, error } = await supabase
        .from('roadmap_views')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, filters: parseFilters(data.filters), grouping: data.grouping as GroupingField } as RoadmapView;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-views'] });
    },
  });
}

export function useDeleteRoadmapView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('roadmap_views').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-views'] });
    },
  });
}

export function useSetDefaultView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (viewId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase.from('roadmap_views').update({ is_default: false }).eq('user_id', user.id);

      const { data, error } = await supabase
        .from('roadmap_views')
        .update({ is_default: true })
        .eq('id', viewId)
        .select()
        .single();

      if (error) throw error;
      return { ...data, filters: parseFilters(data.filters), grouping: data.grouping as GroupingField } as RoadmapView;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-views'] });
    },
  });
}
