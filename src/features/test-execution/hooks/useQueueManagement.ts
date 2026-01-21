/**
 * Module 3B-2: Main hook for queue management operations
 */

import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  QueueItemData, 
  QueueFilters, 
  BulkOperationInput,
  BulkPriorityChangeInput,
  PriorityLevel 
} from '../types/queue-management';

export function useQueueManagement(runId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filters, setFilters] = useState<QueueFilters>({
    sortBy: 'position',
    sortOrder: 'asc',
  });

  // Fetch queue items
  const query = useQuery({
    queryKey: ['queue-items', runId, filters],
    queryFn: async () => {
      if (!runId) return { items: [], total: 0 };

      const { data, error } = await (supabase.rpc as any)('get_queue_items', {
        p_run_id: runId,
        p_priority_filter: filters.priority || null,
        p_search_query: filters.search || null,
        p_sort_by: filters.sortBy,
        p_sort_order: filters.sortOrder,
      });

      if (error) throw error;
      return data as { items: QueueItemData[]; total: number };
    },
    enabled: !!runId,
  });

  // Reorder single item
  const reorder = useMutation({
    mutationFn: async ({ itemId, newPosition }: { itemId: string; newPosition: number }) => {
      const { data, error } = await (supabase.rpc as any)('reorder_queue_item', {
        p_queue_item_id: itemId,
        p_new_position: newPosition,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-items', runId] });
    },
  });

  // Move to top
  const moveToTop = useMutation({
    mutationFn: async (input: BulkOperationInput) => {
      const { data, error } = await (supabase.rpc as any)('move_items_to_top', {
        p_run_id: input.runId,
        p_item_ids: input.itemIds,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-items', runId] });
      toast({ title: 'Moved to top' });
    },
  });

  // Move to bottom
  const moveToBottom = useMutation({
    mutationFn: async (input: BulkOperationInput) => {
      const { data, error } = await (supabase.rpc as any)('move_items_to_bottom', {
        p_run_id: input.runId,
        p_item_ids: input.itemIds,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-items', runId] });
      toast({ title: 'Moved to bottom' });
    },
  });

  // Change priority
  const changePriority = useMutation({
    mutationFn: async (input: BulkPriorityChangeInput) => {
      const { data, error } = await (supabase.rpc as any)('bulk_change_priority', {
        p_run_id: input.runId,
        p_item_ids: input.itemIds,
        p_new_priority: input.newPriority,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['queue-items', runId] });
      toast({ title: `Priority changed to ${variables.newPriority}` });
    },
  });

  // Remove from queue
  const removeItems = useMutation({
    mutationFn: async (input: BulkOperationInput) => {
      const { data, error } = await (supabase.rpc as any)('remove_from_queue', {
        p_run_id: input.runId,
        p_item_ids: input.itemIds,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['queue-items', runId] });
      toast({ title: `Removed ${data?.removed_count || 0} items` });
    },
  });

  // Sort by priority
  const sortByPriority = useMutation({
    mutationFn: async () => {
      if (!runId) throw new Error('No run ID');
      const { data, error } = await (supabase.rpc as any)('sort_queue_by_priority', { p_run_id: runId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-items', runId] });
      toast({ title: 'Sorted by priority' });
    },
  });

  // Update filter
  const updateFilter = useCallback((updates: Partial<QueueFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({ sortBy: 'position', sortOrder: 'asc' });
  }, []);

  return {
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    reorder: reorder.mutate,
    reorderAsync: reorder.mutateAsync,
    moveToTop: moveToTop.mutate,
    moveToBottom: moveToBottom.mutate,
    changePriority: changePriority.mutate,
    removeItems: removeItems.mutate,
    sortByPriority: sortByPriority.mutate,
    refetch: query.refetch,
    isUpdating: reorder.isPending || moveToTop.isPending || moveToBottom.isPending || changePriority.isPending || removeItems.isPending,
  };
}
