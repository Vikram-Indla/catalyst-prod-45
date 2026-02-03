// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS: Task¹⁰ List Cards (Vertical Implementation)
// Purpose: React Query hooks for the new database views
// ═══════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { T10ListCardView, T10CompletedWeekView, T10WeekItemView, T10TabFilter } from '../types/listCards';

// Query Keys
export const t10ListCardsKeys = {
  lists: (filter?: T10TabFilter) => ['t10', 'list-cards', filter] as const,
  completedWeeks: () => ['t10', 'completed-weeks'] as const,
  weekItems: (weekId: string) => ['t10', 'week-items', weekId] as const,
};

// Fetch list cards for landing page
export function useT10ListCards(filter: T10TabFilter = 'all') {
  return useQuery({
    queryKey: t10ListCardsKeys.lists(filter),
    queryFn: async (): Promise<T10ListCardView[]> => {
      let query = supabase.from('t10_list_cards').select('*');
      
      if (filter === 'active') {
        query = query.eq('status', 'active');
      } else if (filter === 'archived') {
        query = query.eq('status', 'archived');
      } else if (filter !== 'completed') {
        // 'all' filter - exclude archived
        query = query.neq('status', 'archived');
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Parse past_weeks JSON if it's a string and cast status
      return (data || []).map(item => ({
        ...item,
        status: item.status as 'active' | 'inactive' | 'archived',
        past_weeks: typeof item.past_weeks === 'string' 
          ? JSON.parse(item.past_weeks) 
          : (item.past_weeks || [])
      })) as T10ListCardView[];
    },
  });
}

// Fetch completed weeks for Completed tab
export function useT10CompletedWeeksView() {
  return useQuery({
    queryKey: t10ListCardsKeys.completedWeeks(),
    queryFn: async (): Promise<T10CompletedWeekView[]> => {
      const { data, error } = await supabase
        .from('t10_completed_weeks')
        .select('*')
        .order('checkout_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        status_badge: item.status_badge as 'full' | 'partial' | 'low'
      })) as T10CompletedWeekView[];
    },
  });
}

// Fetch items for a week
export function useT10WeekItemsView(weekId: string | null) {
  return useQuery({
    queryKey: t10ListCardsKeys.weekItems(weekId || ''),
    queryFn: async (): Promise<T10WeekItemView[]> => {
      if (!weekId) return [];
      const { data, error } = await supabase
        .from('t10_week_items')
        .select('*')
        .eq('week_id', weekId)
        .order('rank');
      if (error) throw error;
      
      // Parse labels JSON if it's a string and cast status
      return (data || []).map(item => ({
        ...item,
        status: item.status as 'todo' | 'done' | 'carried_forward' | 'dropped',
        labels: typeof item.labels === 'string' 
          ? JSON.parse(item.labels) 
          : (item.labels || [])
      })) as T10WeekItemView[];
    },
    enabled: !!weekId,
  });
}

// Archive list
export function useT10ArchiveList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listId: string) => {
      const { data, error } = await supabase.rpc('t10_archive_list', { p_list_id: listId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['t10'] }),
  });
}

// Restore list
export function useT10RestoreList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listId: string) => {
      const { data, error } = await supabase.rpc('t10_restore_list', { p_list_id: listId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['t10'] }),
  });
}
