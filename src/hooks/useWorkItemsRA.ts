/**
 * useWorkItems — Data fetching hook for Requirement Assist V3 work items
 * Supports filtering and real-time updates for generated work items
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type WorkItem = Database['public']['Tables']['work_items']['Row'];
type WorkItemInsert = Database['public']['Tables']['work_items']['Insert'];
type WorkItemUpdate = Database['public']['Tables']['work_items']['Update'];

const WORK_ITEMS_KEY = 'work-items';

export interface WorkItemFilters {
  item_type?: string;
  is_selected?: boolean;
  search?: string;
}

export function useWorkItems(generationId: string, filters?: WorkItemFilters) {
  return useQuery({
    queryKey: [WORK_ITEMS_KEY, generationId, filters],
    queryFn: async (): Promise<WorkItem[]> => {
      let query = supabase
        .from('work_items')
        .select('*')
        .eq('generation_id', generationId)
        .order('sort_order', { ascending: true });

      // Apply filters
      if (filters?.item_type && filters.item_type !== 'all') {
        query = query.eq('item_type', filters.item_type as Database['public']['Enums']['work_item_type']);
      }
      
      if (filters?.is_selected !== undefined) {
        query = query.eq('is_selected', filters.is_selected);
      }
      
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,display_id.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching work items:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!generationId,
  });
}

export function useWorkItemsByParent(generationId: string, parentId: string | null) {
  return useQuery({
    queryKey: [WORK_ITEMS_KEY, generationId, 'parent', parentId],
    queryFn: async (): Promise<WorkItem[]> => {
      let query = supabase
        .from('work_items')
        .select('*')
        .eq('generation_id', generationId)
        .order('sort_order', { ascending: true });

      if (parentId === null) {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', parentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!generationId,
  });
}

export function useCreateWorkItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: WorkItemInsert) => {
      const { data, error } = await supabase
        .from('work_items')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [WORK_ITEMS_KEY, data.generation_id] });
    },
  });
}

export function useUpdateWorkItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: WorkItemUpdate }) => {
      const { data, error } = await supabase
        .from('work_items')
        .update({ ...updates, is_edited: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [WORK_ITEMS_KEY, data.generation_id] });
    },
  });
}

export function useDeleteWorkItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get the generation_id first for cache invalidation
      const { data: item } = await supabase
        .from('work_items')
        .select('generation_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('work_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, generation_id: item?.generation_id };
    },
    onSuccess: (data) => {
      if (data.generation_id) {
        queryClient.invalidateQueries({ queryKey: [WORK_ITEMS_KEY, data.generation_id] });
      }
    },
  });
}

export function useToggleWorkItemSelection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_selected }: { id: string; is_selected: boolean }) => {
      const { data, error } = await supabase
        .from('work_items')
        .update({ is_selected })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [WORK_ITEMS_KEY, data.generation_id] });
    },
  });
}
