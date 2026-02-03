import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { T10Week } from '../types';
import { getWeekStartDate } from '../utils';

interface DbT10Week {
  id: string;
  list_id: string;
  week_start_date: string;
  week_end_date: string;
  is_checked_out: boolean;
  checked_out_by: string | null;
  checked_out_at: string | null;
  closed_count: number;
  carried_count: number;
  removed_count: number;
  created_at: string;
  updated_at: string;
}

function mapDbToT10Week(db: DbT10Week): T10Week {
  return {
    id: db.id,
    list_id: db.list_id,
    week_start_date: db.week_start_date,
    is_checked_out: db.is_checked_out,
    checked_out_by: db.checked_out_by || undefined,
    checked_out_by_name: undefined, // Will be populated separately if needed
    checked_out_at: db.checked_out_at || undefined,
    closed_count: db.closed_count,
    carried_count: db.carried_count,
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
        .order('week_start_date', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapDbToT10Week);
    },
    enabled: !!listId,
  });
}

export function useT10CurrentWeek(listId: string | undefined) {
  return useQuery({
    queryKey: ['t10-current-week', listId],
    queryFn: async () => {
      if (!listId) return null;
      
      const currentWeekStart = getWeekStartDate(new Date()).split('T')[0];
      
      const { data, error } = await supabase
        .from('t10_weeks')
        .select('*')
        .eq('list_id', listId)
        .gte('week_start_date', currentWeekStart)
        .order('week_start_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data ? mapDbToT10Week(data) : null;
    },
    enabled: !!listId,
  });
}

export function useCreateT10Week() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, weekStartDate }: { listId: string; weekStartDate: string }) => {
      const weekStart = new Date(weekStartDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const { data, error } = await supabase
        .from('t10_weeks')
        .insert({
          list_id: listId,
          week_start_date: weekStart.toISOString().split('T')[0],
          week_end_date: weekEnd.toISOString().split('T')[0],
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
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('t10_weeks')
        .update({
          is_checked_out: true,
          checked_out_by: user.user?.id || null,
          checked_out_at: new Date().toISOString(),
          closed_count: closedCount,
          carried_count: carriedCount,
          removed_count: removedCount,
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
