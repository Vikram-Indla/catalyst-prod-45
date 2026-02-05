// ============================================================
// File: src/modules/priorities/hooks/usePriWeek.ts
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PriWeekFull, PriCheckoutInput } from '../types';
import { PRI_QUERY_KEYS } from '../utils';

/**
 * Get or create the current active week for a list
 */
export function usePriCurrentWeek(listId: string | undefined) {
  return useQuery({
    queryKey: PRI_QUERY_KEYS.currentWeek(listId ?? ''),
    queryFn: async (): Promise<PriWeekFull | null> => {
      if (!listId) return null;

      // Ensure current week exists
      const { data: weekId, error: rpcError } = await supabase.rpc(
        'pri_get_or_create_current_week',
        { p_list_id: listId }
      );

      if (rpcError) throw rpcError;

      // Fetch enriched week
      const { data, error } = await supabase
        .from('pri_weeks_full')
        .select('*')
        .eq('id', weekId)
        .single();

      if (error) throw error;
      return data as PriWeekFull;
    },
    enabled: !!listId,
  });
}

/**
 * Fetch a single week by ID
 */
export function usePriWeek(weekId: string | undefined) {
  return useQuery({
    queryKey: PRI_QUERY_KEYS.week(weekId ?? ''),
    queryFn: async (): Promise<PriWeekFull | null> => {
      if (!weekId) return null;
      const { data, error } = await supabase
        .from('pri_weeks_full')
        .select('*')
        .eq('id', weekId)
        .single();

      if (error) throw error;
      return data as PriWeekFull;
    },
    enabled: !!weekId,
  });
}

/**
 * Fetch all weeks for a list (history)
 */
export function usePriWeekHistory(listId: string | undefined) {
  return useQuery({
    queryKey: PRI_QUERY_KEYS.weeks(listId ?? ''),
    queryFn: async (): Promise<PriWeekFull[]> => {
      if (!listId) return [];
      const { data, error } = await supabase
        .from('pri_weeks_full')
        .select('*')
        .eq('list_id', listId)
        .order('week_start', { ascending: false });

      if (error) throw error;
      return (data ?? []) as PriWeekFull[];
    },
    enabled: !!listId,
  });
}

/**
 * Checkout a week with decisions per item
 */
export function useCheckoutPriWeek() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PriCheckoutInput) => {
      const { data, error } = await supabase.rpc('pri_checkout_week', {
        p_week_id: input.week_id,
        p_decisions: JSON.stringify(input.decisions),
      });

      if (error) throw error;
      return data as string; // new week ID
    },
    onSuccess: () => {
      // Broad invalidation after checkout — many things change
      queryClient.invalidateQueries({ queryKey: ['pri'] });
    },
  });
}
