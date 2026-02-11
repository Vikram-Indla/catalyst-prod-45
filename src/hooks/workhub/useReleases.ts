/**
 * WorkHub Releases Hook — TanStack Query
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Release } from '@/types/workhub.types';

export function useWHReleases() {
  return useQuery({
    queryKey: ['workhub', 'releases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wh_releases')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data ?? []) as unknown as Release[];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
