import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const CONSUMER_LABELS: Record<string, string> = {
  kanban:           'Kanban board',
  jira_table:       'Work item list',
  status_lozenge:   'Status pill',
  detail_views:     'Detail views',
  filter_dropdown:  'Filter dropdown',
  bulk_change:      'Bulk change',
};

export interface StatusConsumer {
  id: string;
  status_id: string;
  consumer: string;
  detail: string | null;
}

export function useStatusConsumers(statusId: string | null | undefined) {
  return useQuery({
    queryKey: ['status-consumers', statusId],
    queryFn: async (): Promise<StatusConsumer[]> => {
      const { data, error } = await supabase
        .from('status_consumers' as any)
        .select('id, status_id, consumer, detail')
        .eq('status_id', statusId!);
      if (error) throw error;
      return (data ?? []) as StatusConsumer[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(statusId),
  });
}

export function useAllStatusConsumers(statusIds: string[]) {
  return useQuery({
    queryKey: ['status-consumers-bulk', ...statusIds.sort()],
    queryFn: async (): Promise<Record<string, StatusConsumer[]>> => {
      if (statusIds.length === 0) return {};
      const { data, error } = await supabase
        .from('status_consumers' as any)
        .select('id, status_id, consumer, detail')
        .in('status_id', statusIds);
      if (error) throw error;
      const map: Record<string, StatusConsumer[]> = {};
      for (const row of (data ?? []) as StatusConsumer[]) {
        if (!map[row.status_id]) map[row.status_id] = [];
        map[row.status_id].push(row);
      }
      return map;
    },
    staleTime: 5 * 60 * 1000,
    enabled: statusIds.length > 0,
  });
}
