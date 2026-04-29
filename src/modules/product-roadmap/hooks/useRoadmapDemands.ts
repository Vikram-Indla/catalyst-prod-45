/**
 * Hook for managing roadmap initiatives (ph_requests with on_roadmap = true)
 * Only shows items that have been explicitly added to the roadmap via the toggle.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import type { RoadmapDemand, RoadmapFilters } from '../types/roadmap';

export function useRoadmapDemands(filters: RoadmapFilters) {
  return useQuery({
    queryKey: ['roadmap-demands', filters],
    queryFn: async () => {
      // Use ph_roadmap_requests_view which filters on_roadmap = true
      let query = typedQuery('ph_roadmap_requests_view')
        .select('*')
        .order('roadmap_priority', { ascending: true, nullsFirst: false });

      // Apply filters
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,initiative_key.ilike.%${filters.search}%`);
      }
      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters.health.length > 0) {
        query = query.in('health_status', filters.health);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Resolve owner names from profiles
      const assigneeIds = [...new Set((data || []).map((i: any) => i.assignee_id).filter(Boolean))] as string[];
      let ownerMap: Record<string, string> = {};
      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', assigneeIds);
        if (profiles) {
          ownerMap = Object.fromEntries(profiles.map((p: any) => [p.id, p.full_name || '']));
        }
      }

      // Map to RoadmapDemand format for compatibility with existing components
      return (data || []).map((item: any) => ({
        id: item.id,
        request_key: item.initiative_key || '',
        title: item.title || '',
        description: item.description || null,
        assignee: item.assignee_id || null,
        product_id: null,
        product: null,
        platform: null,
        process_step: item.status || 'new_demand',
        priority_tier: null,
        health: item.health_status || null,
        rank: item.roadmap_priority || item.sort_order || null,
        start_date: item.kickoff_date || null,
        end_date: item.target_complete || null,
        progress: item.progress || 0,
        created_by: null,
        created_at: item.created_at,
        updated_at: item.updated_at,
        // Extra fields
        business_value: item.business_value || null,
        owner_name: ownerMap[item.assignee_id] || null,
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
      const { data, error } = await typedQuery('ph_requests')
        .update({
          kickoff_date: start_date,
          target_complete: end_date,
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
      const updates = reorderedItems.map((item) =>
        typedQuery('ph_requests')
          .update({ roadmap_priority: item.rank })
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
      const { data, error } = await typedQuery('ph_requests')
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
      // ph_requests doesn't have product_id, this is a no-op
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-demands'] });
    },
  });
}