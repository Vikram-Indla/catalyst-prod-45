// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useT10Weeks
// Purpose: CRUD operations for Task¹⁰ weeks (including week history)
// ═══════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { T10Week, T10WeekCreateInput } from '../types';
import { t10ListKeys } from './useT10Lists';

// Query keys
export const t10WeekKeys = {
  all: ['t10-weeks'] as const,
  byList: (listId: string) => [...t10WeekKeys.all, 'list', listId] as const,
  week: (weekId: string) => [...t10WeekKeys.all, 'week', weekId] as const,
  current: (listId: string) => [...t10WeekKeys.all, 'current', listId] as const,
  history: (listId: string) => [...t10WeekKeys.all, 'history', listId] as const,
};

// Helper to map database row to T10Week type
function mapDbToT10Week(db: {
  id: string;
  list_id: string;
  week_start: string;
  week_end: string;
  status: string;
  is_current: boolean;
  completed_count: number;
  total_count: number;
  created_at: string;
  updated_at: string;
}): T10Week {
  return {
    id: db.id,
    list_id: db.list_id,
    week_start: db.week_start,
    week_end: db.week_end,
    status: db.status as T10Week['status'],
    is_current: db.is_current,
    completed_count: db.completed_count,
    total_count: db.total_count,
    created_at: db.created_at,
    updated_at: db.updated_at,
  };
}

/**
 * Fetch all weeks for a list (ordered by week_start DESC)
 * This is the CRITICAL hook for week history feature
 */
export function useT10Weeks(listId: string | undefined | null) {
  return useQuery({
    queryKey: t10WeekKeys.byList(listId || ''),
    queryFn: async (): Promise<T10Week[]> => {
      if (!listId) return [];

      const { data, error } = await supabase
        .from('t10_weeks')
        .select('*')
        .eq('list_id', listId)
        .order('week_start', { ascending: false });

      if (error) {
        console.error('Error fetching T10 weeks:', error);
        throw new Error(error.message);
      }

      // Log for Stage D verification
      console.log('[T10] Weeks fetched for list:', listId, '| Count:', data?.length);

      return (data || []).map(mapDbToT10Week);
    },
    enabled: !!listId,
  });
}

/**
 * Fetch current week for a list
 */
export function useT10CurrentWeek(listId: string | undefined | null) {
  return useQuery({
    queryKey: t10WeekKeys.current(listId || ''),
    queryFn: async (): Promise<T10Week | null> => {
      if (!listId) return null;

      const { data, error } = await supabase
        .from('t10_weeks')
        .select('*')
        .eq('list_id', listId)
        .eq('is_current', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching current week:', error);
        throw new Error(error.message);
      }

      console.log('[T10] Current week fetched:', data?.id);

      return data ? mapDbToT10Week(data) : null;
    },
    enabled: !!listId,
  });
}

/**
 * Fetch past weeks (week history) for a list
 * Excludes current week
 */
export function useT10WeekHistory(listId: string | undefined | null) {
  return useQuery({
    queryKey: t10WeekKeys.history(listId || ''),
    queryFn: async (): Promise<T10Week[]> => {
      if (!listId) return [];

      const { data, error } = await supabase
        .from('t10_weeks')
        .select('*')
        .eq('list_id', listId)
        .eq('is_current', false)
        .order('week_start', { ascending: false });

      if (error) {
        console.error('Error fetching week history:', error);
        throw new Error(error.message);
      }

      // CRITICAL: Log for verification that history is being fetched
      console.log('[T10] Week HISTORY fetched for list:', listId, '| Past weeks:', data?.length);

      return (data || []).map(mapDbToT10Week);
    },
    enabled: !!listId,
  });
}

/**
 * Create new week (typically when starting a new week)
 */
export function useT10CreateWeek() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: T10WeekCreateInput): Promise<T10Week> => {
      // If creating current week, first set all other weeks to not current
      if (input.is_current) {
        await supabase
          .from('t10_weeks')
          .update({ is_current: false })
          .eq('list_id', input.list_id);
      }

      const { data, error } = await supabase
        .from('t10_weeks')
        .insert({
          list_id: input.list_id,
          week_start: input.week_start,
          week_end: input.week_end,
          is_current: input.is_current ?? true,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating T10 week:', error);
        throw new Error(error.message);
      }

      console.log('[T10] Week created:', data.id);

      return mapDbToT10Week(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: t10WeekKeys.byList(data.list_id) });
      queryClient.invalidateQueries({ queryKey: t10ListKeys.all });
    },
  });
}

// Alias for backward compatibility
export const useCreateT10Week = useT10CreateWeek;

/**
 * Update week (e.g., mark as completed)
 */
export function useT10UpdateWeek() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; status?: string; is_current?: boolean }): Promise<T10Week> => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('t10_weeks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating T10 week:', error);
        throw new Error(error.message);
      }

      console.log('[T10] Week updated:', data.id);

      return mapDbToT10Week(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: t10WeekKeys.byList(data.list_id) });
      queryClient.invalidateQueries({ queryKey: t10ListKeys.all });
    },
  });
}

/**
 * Checkout week (mark as completed with stats)
 */
export function useCheckoutT10Week() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      weekId, 
      closedCount, 
      carriedCount,
      removedCount,
    }: { 
      weekId: string; 
      closedCount: number;
      carriedCount: number;
      removedCount: number;
    }): Promise<T10Week> => {
      const { data, error } = await supabase
        .from('t10_weeks')
        .update({
          status: 'completed',
          is_current: false,
          completed_count: closedCount,
          total_count: closedCount + carriedCount + removedCount,
        })
        .eq('id', weekId)
        .select()
        .single();

      if (error) throw error;
      return mapDbToT10Week(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: t10WeekKeys.all });
      queryClient.invalidateQueries({ queryKey: t10ListKeys.all });
    },
  });
}

/**
 * Helper: Get week date range for current week
 */
export function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}
