import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PcEvent, PcPeriodSummary, PcPeriodType, PcEventTicket } from '../types/production-events.types';

export function useProductionEvents(periodType: PcPeriodType, periodStart: string, periodEnd: string) {
  return useQuery({
    queryKey: ['pc-events', periodType, periodStart, periodEnd],
    queryFn: async (): Promise<PcEvent[]> => {
      const { data, error } = await supabase
        .from('pc_events_list_view')
        .select('*')
        .eq('period_type', periodType)
        .eq('period_start', periodStart)
        .eq('period_end', periodEnd)
        .is('deleted_at', null)
        .order('is_pinned', { ascending: false })
        .order('deployment_date', { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        ...row,
        ticket_details: (row.ticket_details ?? []) as PcEventTicket[],
        linked_ticket_count: row.linked_ticket_count ?? 0,
        linked_release_versions: row.linked_release_versions ?? [],
        linked_change_numbers: row.linked_change_numbers ?? [],
      }));
    },
  });
}

export function usePeriodSummary(periodType: PcPeriodType, periodStart: string) {
  return useQuery({
    queryKey: ['pc-period-summary', periodType, periodStart],
    queryFn: async (): Promise<PcPeriodSummary | null> => {
      const { data, error } = await supabase
        .from('pc_period_summaries')
        .select('*')
        .eq('period_type', periodType)
        .eq('period_start', periodStart)
        .maybeSingle();

      if (error) throw error;
      return data as PcPeriodSummary | null;
    },
  });
}
