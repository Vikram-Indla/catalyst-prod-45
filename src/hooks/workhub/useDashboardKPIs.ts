/**
 * WorkHub Dashboard KPIs Hook — Phase 8
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardKPIs } from '@/types/workhub.types';

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['workhub', 'dashboard-kpis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_ph_dashboard_kpis')
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as DashboardKPIs;
    },
    staleTime: 30_000,
  });
}
