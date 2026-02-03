// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ ITEMS HOOKS
// ═══════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchT10Items, 
  fetchT10Item, 
  createT10Item, 
  updateT10Item, 
  deleteT10Item,
  reorderT10Items,
  toggleT10ItemStatus
} from '../api';
import type { T10ItemInsert, T10ItemRow } from '../types';
import { t10WeeksKeys } from './useWeeks';
import { t10ListsKeys } from './useLists';

// Query keys
export const t10ItemsKeys = {
  all: ['t10-items'] as const,
  list: (weekId: string) => [...t10ItemsKeys.all, 'list', weekId] as const,
  detail: (itemId: string) => [...t10ItemsKeys.all, 'detail', itemId] as const,
};

/**
 * Fetch all items for a week
 */
export function useT10Items(weekId: string | undefined) {
  return useQuery({
    queryKey: t10ItemsKeys.list(weekId || ''),
    queryFn: () => fetchT10Items(weekId!),
    enabled: !!weekId,
  });
}

/**
 * Fetch a single item by ID
 */
export function useT10Item(itemId: string | undefined) {
  return useQuery({
    queryKey: t10ItemsKeys.detail(itemId || ''),
    queryFn: () => fetchT10Item(itemId!),
    enabled: !!itemId,
  });
}

/**
 * Create a new item
 */
export function useCreateT10Item() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: T10ItemInsert) => createT10Item(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: t10ItemsKeys.list(data.week_id) });
      queryClient.invalidateQueries({ queryKey: t10WeeksKeys.all });
      queryClient.invalidateQueries({ queryKey: t10ListsKeys.all });
    },
  });
}

/**
 * Update an existing item
 */
export function useUpdateT10Item() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      itemId, 
      input 
    }: { 
      itemId: string; 
      weekId: string;
      input: Partial<Pick<T10ItemRow, 'title' | 'description' | 'taskhub_key' | 'assignee_id' | 'due_date' | 'label' | 'rank' | 'status'>>
    }) => updateT10Item(itemId, input),
    onSuccess: (data, { weekId }) => {
      queryClient.invalidateQueries({ queryKey: t10ItemsKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: t10ItemsKeys.list(weekId) });
      queryClient.invalidateQueries({ queryKey: t10WeeksKeys.all });
    },
  });
}

/**
 * Delete an item
 */
export function useDeleteT10Item() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, weekId }: { itemId: string; weekId: string }) => 
      deleteT10Item(itemId),
    onSuccess: (_, { weekId }) => {
      queryClient.invalidateQueries({ queryKey: t10ItemsKeys.list(weekId) });
      queryClient.invalidateQueries({ queryKey: t10WeeksKeys.all });
      queryClient.invalidateQueries({ queryKey: t10ListsKeys.all });
    },
  });
}

/**
 * Reorder items (drag and drop)
 */
export function useReorderT10Items() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ weekId, itemIds, baseRank = 1 }: { weekId: string; itemIds: string[]; baseRank?: number }) => 
      reorderT10Items(weekId, itemIds, baseRank),
    onSuccess: (_, { weekId }) => {
      queryClient.invalidateQueries({ queryKey: t10ItemsKeys.list(weekId) });
      queryClient.invalidateQueries({ queryKey: t10WeeksKeys.all });
    },
  });
}

/**
 * Toggle item completion status
 */
export function useToggleT10ItemStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, weekId }: { itemId: string; weekId: string }) => 
      toggleT10ItemStatus(itemId),
    onSuccess: (data, { weekId }) => {
      queryClient.invalidateQueries({ queryKey: t10ItemsKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: t10ItemsKeys.list(weekId) });
      queryClient.invalidateQueries({ queryKey: t10WeeksKeys.all });
      queryClient.invalidateQueries({ queryKey: t10ListsKeys.all });
    },
  });
}
