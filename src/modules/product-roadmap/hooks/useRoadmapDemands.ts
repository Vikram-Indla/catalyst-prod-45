/**
 * Hook for managing roadmap demands (business requests)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RoadmapDemand, RoadmapFilters } from '../types/roadmap';

export function useRoadmapDemands(filters: RoadmapFilters) {
  return useQuery({
    queryKey: ['roadmap-demands', filters],
    queryFn: async () => {
      let query = (supabase as any)
        .from('business_requests')
        .select(`
          id,
          request_key,
          title,
          description,
          assignee,
          product_id,
          platform,
          process_step,
          priority_tier,
          health,
          rank,
          start_date,
          end_date,
          progress,
          created_by,
          created_at,
          updated_at,
          products!business_requests_product_id_fkey (
            id,
            name,
            code,
            color
          )
        `)
        .is('deleted_at', null)
        .order('rank', { ascending: true, nullsFirst: false });

      // Apply filters
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,request_key.ilike.%${filters.search}%`);
      }
      if (filters.status.length > 0) {
        query = query.in('process_step', filters.status);
      }
      if (filters.priority.length > 0) {
        query = query.in('priority_tier', filters.priority);
      }
      if (filters.product_ids.length > 0) {
        query = query.in('product_id', filters.product_ids);
      }
      if (filters.platforms.length > 0) {
        query = query.in('platform', filters.platforms);
      }
      if (filters.health.length > 0) {
        query = query.in('health', filters.health);
      }
      if (filters.date_range.start) {
        query = query.gte('start_date', filters.date_range.start);
      }
      if (filters.date_range.end) {
        query = query.lte('end_date', filters.date_range.end);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Map the response to RoadmapDemand format
      return (data || []).map((item: any) => ({
        ...item,
        product: item.products || null,
        progress: item.progress || 0,
      })) as RoadmapDemand[];
    },
  });
}

export function useUpdateDemandDates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      start_date,
      end_date,
    }: {
      id: string;
      start_date: string | null;
      end_date: string | null;
    }) => {
      const { data, error } = await (supabase as any)
        .from('business_requests')
        .update({
          start_date,
          end_date,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-demands'] });
    },
  });
}

export function useReorderDemands() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reorderedItems: { id: string; rank: number }[]) => {
      // Batch update ranks
      const updates = reorderedItems.map((item) =>
        (supabase as any)
          .from('business_requests')
          .update({ rank: item.rank })
          .eq('id', item.id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-demands'] });
    },
  });
}

export function useUpdateDemandProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, progress }: { id: string; progress: number }) => {
      const { data, error } = await (supabase as any)
        .from('business_requests')
        .update({
          progress,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-demands'] });
    },
  });
}

export function useUpdateDemandProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, product_id }: { id: string; product_id: string | null }) => {
      const { data, error } = await (supabase as any)
        .from('business_requests')
        .update({
          product_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-demands'] });
    },
  });
}
