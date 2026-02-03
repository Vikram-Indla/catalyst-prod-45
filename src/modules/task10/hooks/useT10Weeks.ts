import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { T10Week } from '../types';
import { getWeekStartDate } from '../utils';

interface DbT10Week {
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
}

function mapDbToT10Week(db: DbT10Week): T10Week {
  return {
    id: db.id,
    list_id: db.list_id,
    week_start_date: db.week_start,
    is_checked_out: db.status === 'completed',
    checked_out_by: undefined,
    checked_out_by_name: undefined,
    checked_out_at: undefined,
    closed_count: db.completed_count,
    carried_count: 0, // Not tracked in new schema, computed differently
  };
}

export function useT10Weeks(listId: string | undefined) {
  return useQuery({
    queryKey: ['t10-weeks', listId],
    queryFn: async () => {
      if (!listId) return [];
      const { data, error } = await supabase
        .from('t10_weeks')
        .select('*')
        .eq('list_id', listId)
        .order('week_start', { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []).map(mapDbToT10Week);
    },
    enabled: !!listId,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

export function useT10CurrentWeek(listId: string | undefined) {
  return useQuery({
    queryKey: ['t10-current-week', listId],
    queryFn: async () => {
      if (!listId) return null;
      
      // First try to get the week marked as current
      const { data: currentData, error: currentError } = await supabase
        .from('t10_weeks')
        .select('*')
        .eq('list_id', listId)
        .eq('is_current', true)
        .maybeSingle();

      if (currentError) throw new Error(currentError.message);
      if (currentData) return mapDbToT10Week(currentData);
      
      // Fallback: get the most recent week
      const currentWeekStart = getWeekStartDate(new Date()).split('T')[0];
      
      const { data, error } = await supabase
        .from('t10_weeks')
        .select('*')
        .eq('list_id', listId)
        .gte('week_start', currentWeekStart)
        .order('week_start', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data ? mapDbToT10Week(data) : null;
    },
    enabled: !!listId,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

export function useCreateT10Week() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, weekStartDate }: { listId: string; weekStartDate: string }) => {
      const weekStart = new Date(weekStartDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // Set previous current week to not current
      await supabase
        .from('t10_weeks')
        .update({ is_current: false })
        .eq('list_id', listId)
        .eq('is_current', true);

      const { data, error } = await supabase
        .from('t10_weeks')
        .insert({
          list_id: listId,
          week_start: weekStart.toISOString().split('T')[0],
          week_end: weekEnd.toISOString().split('T')[0],
          is_current: true,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return mapDbToT10Week(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['t10-weeks', variables.listId] });
      queryClient.invalidateQueries({ queryKey: ['t10-current-week', variables.listId] });
    },
  });
}

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
    }) => {
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
      queryClient.invalidateQueries({ queryKey: ['t10-weeks'] });
      queryClient.invalidateQueries({ queryKey: ['t10-current-week'] });
    },
  });
}
