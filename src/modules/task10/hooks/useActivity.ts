// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ ACTIVITY HOOKS
// ═══════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchT10ItemActivity, 
  fetchT10ItemsActivity, 
  createT10Activity 
} from '../api';
import type { T10ActivityType } from '../types';

// Query keys
export const t10ActivityKeys = {
  all: ['t10-activity'] as const,
  item: (itemId: string) => [...t10ActivityKeys.all, 'item', itemId] as const,
  items: (itemIds: string[]) => [...t10ActivityKeys.all, 'items', itemIds.join(',')] as const,
};

/**
 * Fetch activity for a single item
 */
export function useT10ItemActivity(itemId: string | undefined) {
  return useQuery({
    queryKey: t10ActivityKeys.item(itemId || ''),
    queryFn: () => fetchT10ItemActivity(itemId!),
    enabled: !!itemId,
  });
}

/**
 * Fetch activity for multiple items (e.g., for a week view)
 */
export function useT10ItemsActivity(itemIds: string[], limit: number = 50) {
  return useQuery({
    queryKey: t10ActivityKeys.items(itemIds),
    queryFn: () => fetchT10ItemsActivity(itemIds, limit),
    enabled: itemIds.length > 0,
  });
}

/**
 * Create a manual activity entry
 */
export function useCreateT10Activity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      item_id: string;
      activity_type: T10ActivityType;
      metadata?: Record<string, unknown>;
    }) => createT10Activity(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: t10ActivityKeys.item(data.item_id) });
    },
  });
}
