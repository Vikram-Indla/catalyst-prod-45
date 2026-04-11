import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches the count of open incidents (status not in resolved/closed/converted)
 */
export function useOpenIncidentCount() {
  return useQuery({
    queryKey: ['open-incident-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .not('status', 'in', '("resolved","closed","converted")');

      if (error) throw error;
      return count || 0;
    },
    staleTime: 30_000,
    refetchInterval: 2 * 60_000,
  });
}
