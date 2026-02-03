// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS: Completed Lists — Database Wired
// Task¹⁰ Priority Management Module
// ═══════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  T10CompletedSummaryStats,
  T10CompletedWeek,
  T10CompletedItem,
  T10ListPerformance,
  T10CompletedFilters,
  T10CheckoutResult,
} from '../types/completed';

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: useT10CompletedSummary
// Purpose: Fetch aggregate stats for summary cards
// ─────────────────────────────────────────────────────────────────────────────

export function useT10CompletedSummary() {
  return useQuery({
    queryKey: ['t10', 'completed', 'summary'],
    queryFn: async (): Promise<T10CompletedSummaryStats> => {
      console.log('[T10] Fetching completed summary stats...');
      
      const { data, error } = await supabase
        .from('t10_completed_summary_stats')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('[T10] Error fetching completed summary:', error);
        throw error;
      }

      // Return default values if no data
      if (!data) {
        return {
          total_lists_completed: 0,
          total_weeks_completed: 0,
          avg_completion_rate: 0,
          total_items_completed: 0,
          total_carried_forward: 0,
          total_dropped: 0,
        };
      }

      console.log('[T10] Completed summary loaded:', data);
      return data as T10CompletedSummaryStats;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: useT10CompletedWeeks
// Purpose: Fetch completed weeks for main table with filters
// ─────────────────────────────────────────────────────────────────────────────

export function useT10CompletedWeeks(filters?: T10CompletedFilters) {
  return useQuery({
    queryKey: ['t10', 'completed', 'weeks', filters],
    queryFn: async (): Promise<T10CompletedWeek[]> => {
      console.log('[T10] Fetching completed weeks with filters:', filters);
      
      let query = supabase
        .from('t10_completed_weeks_summary')
        .select('*')
        .order('checkout_at', { ascending: false, nullsFirst: false });

      // Apply date filter
      if (filters?.dateRange) {
        const now = new Date();
        let startDate: Date | undefined;

        switch (filters.dateRange) {
          case 'last7':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'last30':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'last90':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case 'thisYear':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          case 'custom':
            if (filters.startDate) {
              startDate = new Date(filters.startDate);
            }
            break;
        }

        if (startDate) {
          query = query.gte('checkout_at', startDate.toISOString());
        }
        
        if (filters.dateRange === 'custom' && filters.endDate) {
          query = query.lte('checkout_at', filters.endDate);
        }
      }

      // Apply list filter
      if (filters?.listId) {
        query = query.eq('list_id', filters.listId);
      }

      // Apply minimum rate filter
      if (filters?.minRate !== undefined) {
        query = query.gte('completion_rate', filters.minRate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[T10] Error fetching completed weeks:', error);
        throw error;
      }

      console.log('[T10] Completed weeks loaded:', data?.length);
      return (data || []) as T10CompletedWeek[];
    },
    staleTime: 30 * 1000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: useT10CompletedItems
// Purpose: Fetch items for a specific completed week (expanded row)
// ─────────────────────────────────────────────────────────────────────────────

export function useT10CompletedItems(weekId: string | null) {
  return useQuery({
    queryKey: ['t10', 'completed', 'items', weekId],
    queryFn: async (): Promise<T10CompletedItem[]> => {
      if (!weekId) return [];
      
      console.log('[T10] Fetching completed items for week:', weekId);
      
      const { data, error } = await supabase
        .from('t10_completed_items_detail')
        .select('*')
        .eq('week_id', weekId)
        .order('rank', { ascending: true });

      if (error) {
        console.error('[T10] Error fetching completed items:', error);
        throw error;
      }

      console.log('[T10] Completed items loaded:', data?.length);
      
      // Map the data to match T10CompletedItem interface
      return (data || []).map((item: any) => ({
        ...item,
        labels: Array.isArray(item.labels) ? item.labels : [],
      })) as T10CompletedItem[];
    },
    enabled: !!weekId,
    staleTime: 60 * 1000, // 1 minute (completed items don't change)
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: useT10ListPerformance
// Purpose: Fetch performance data for a specific list
// ─────────────────────────────────────────────────────────────────────────────

export function useT10ListPerformance(listId: string | null) {
  return useQuery({
    queryKey: ['t10', 'completed', 'performance', listId],
    queryFn: async (): Promise<T10ListPerformance | null> => {
      if (!listId) return null;
      
      console.log('[T10] Fetching list performance for:', listId);
      
      const { data, error } = await supabase
        .from('t10_list_performance')
        .select('*')
        .eq('list_id', listId)
        .maybeSingle();

      if (error) {
        console.error('[T10] Error fetching list performance:', error);
        throw error;
      }

      console.log('[T10] List performance loaded:', data);
      return data as T10ListPerformance | null;
    },
    enabled: !!listId,
    staleTime: 60 * 1000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: useT10Checkout
// Purpose: Checkout a week (mutation)
// ─────────────────────────────────────────────────────────────────────────────

export function useT10Checkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      weekId,
      carryForwardItemIds = [],
      dropItemIds = [],
    }: {
      weekId: string;
      carryForwardItemIds?: string[];
      dropItemIds?: string[];
    }): Promise<T10CheckoutResult> => {
      console.log('[T10] Checking out week:', weekId);
      
      const { data, error } = await supabase.rpc('t10_checkout_week', {
        p_week_id: weekId,
        p_carry_forward_item_ids: carryForwardItemIds,
        p_drop_item_ids: dropItemIds,
      });

      if (error) {
        console.error('[T10] Checkout error:', error);
        throw error;
      }

      console.log('[T10] Checkout complete:', data);
      return data as unknown as T10CheckoutResult;
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['t10', 'completed'] });
      queryClient.invalidateQueries({ queryKey: ['t10', 'weeks'] });
      queryClient.invalidateQueries({ queryKey: ['t10', 'lists'] });
      
      console.log('[T10] Checkout successful, queries invalidated');
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: useT10ExportCSV
// Purpose: Export completed data as CSV
// ─────────────────────────────────────────────────────────────────────────────

export function useT10ExportCSV() {
  return useMutation({
    mutationFn: async (filters?: T10CompletedFilters): Promise<string> => {
      console.log('[T10] Exporting CSV with filters:', filters);
      
      // Fetch weeks
      let query = supabase
        .from('t10_completed_weeks_summary')
        .select('*')
        .order('checkout_at', { ascending: false });

      if (filters?.listId) {
        query = query.eq('list_id', filters.listId);
      }

      const { data: weeks, error } = await query;

      if (error) throw error;

      // Build CSV
      const headers = [
        'List Name',
        'List Key',
        'Week Start',
        'Week End',
        'Total',
        'Completed',
        'Carried Forward',
        'Dropped',
        'Completion Rate',
        'Checkout Date',
        'Checkout By',
      ];

      const rows = weeks?.map((w: any) => [
        w.list_name,
        w.list_key,
        w.week_start,
        w.week_end,
        w.total_count,
        w.completed_count,
        w.carried_forward_count,
        w.dropped_count,
        `${w.completion_rate}%`,
        w.checkout_at || '',
        w.checkout_by_name || '',
      ]);

      const csv = [
        headers.join(','),
        ...(rows?.map((r: any) => r.map((c: any) => `"${c}"`).join(',')) || []),
      ].join('\n');

      console.log('[T10] CSV generated, rows:', rows?.length);
      return csv;
    },
  });
}
