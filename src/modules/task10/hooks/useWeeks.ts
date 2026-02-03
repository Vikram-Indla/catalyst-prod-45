// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ WEEKS HOOKS
// ═══════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchT10Weeks, 
  fetchT10CurrentWeek, 
  fetchT10Week, 
  checkoutT10Week 
} from '../api';
import { t10ListsKeys } from './useLists';
import type { CheckoutPayload } from '../types';

// Query keys
export const t10WeeksKeys = {
  all: ['t10-weeks'] as const,
  list: (listId: string) => [...t10WeeksKeys.all, 'list', listId] as const,
  current: (listId: string) => [...t10WeeksKeys.all, 'current', listId] as const,
  detail: (weekId: string) => [...t10WeeksKeys.all, 'detail', weekId] as const,
};

/**
 * Fetch all weeks for a list
 */
export function useT10Weeks(listId: string | undefined) {
  return useQuery({
    queryKey: t10WeeksKeys.list(listId || ''),
    queryFn: () => fetchT10Weeks(listId!),
    enabled: !!listId,
  });
}

/**
 * Fetch the current (active) week for a list with items
 */
export function useT10CurrentWeek(listId: string | undefined) {
  return useQuery({
    queryKey: t10WeeksKeys.current(listId || ''),
    queryFn: () => fetchT10CurrentWeek(listId!),
    enabled: !!listId,
  });
}

/**
 * Fetch a specific week by ID with items
 */
export function useT10Week(weekId: string | undefined) {
  return useQuery({
    queryKey: t10WeeksKeys.detail(weekId || ''),
    queryFn: () => fetchT10Week(weekId!),
    enabled: !!weekId,
  });
}

/**
 * Check out a week (finalize and create next week)
 */
export function useCheckoutT10Week() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ weekId, decisions }: CheckoutPayload) => checkoutT10Week(weekId, decisions),
    onSuccess: () => {
      // Invalidate weeks queries for this list
      queryClient.invalidateQueries({ queryKey: t10WeeksKeys.all });
      // Invalidate list stats
      queryClient.invalidateQueries({ queryKey: t10ListsKeys.all });
    },
  });
}
