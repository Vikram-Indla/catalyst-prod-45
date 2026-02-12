/**
 * WorkHub Resource Hooks — Phase 6: Resource 360
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Resource, ResourceUtilization, WorkItemFull } from '@/types/workhub.types';

/** Hook A — All active resources */
export function useResources() {
  return useQuery({
    queryKey: ['workhub', 'resources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_resources')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as unknown as Resource[];
    },
    staleTime: 30_000,
  });
}

/** Legacy alias */
export const useWHResources = useResources;

/** Hook B — Single resource by ID */
export function useResource(id: string) {
  return useQuery({
    queryKey: ['workhub', 'resource', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_resources')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as Resource;
    },
    enabled: !!id,
  });
}

/** Hook C — All resource utilization (aggregated view) */
export function useResourceUtilization() {
  return useQuery({
    queryKey: ['workhub', 'resource-utilization'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_ph_resource_utilization')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data ?? []) as unknown as ResourceUtilization[];
    },
    staleTime: 30_000,
  });
}

/** Hook D — Single resource utilization by ID */
export function useResourceUtilizationById(id: string) {
  return useQuery({
    queryKey: ['workhub', 'resource-utilization', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_ph_resource_utilization')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as ResourceUtilization;
    },
    enabled: !!id,
  });
}

/** Hook E — Work items for a specific user, optionally filtered by time range */
export function useResourceWorkItems(
  userId: string,
  timeRange?: { start: string; end: string }
) {
  return useQuery({
    queryKey: ['workhub', 'resource-work-items', userId, timeRange],
    queryFn: async () => {
      let query = supabase
        .from('vw_ph_work_items_full')
        .select('*')
        .eq('assignee_user_id', userId)
        .order('due_date', { nullsFirst: false })
        .order('item_key');
      if (timeRange?.start) {
        query = query.gte('due_date', timeRange.start);
      }
      if (timeRange?.end) {
        query = query.lte('due_date', timeRange.end);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as WorkItemFull[];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}
