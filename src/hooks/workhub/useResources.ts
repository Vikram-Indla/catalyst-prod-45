/**
 * ProjectHub Resources Hook — TanStack Query
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Resource } from '@/types/workhub.types';

export function useWHResources() {
  return useQuery({
    queryKey: ['projecthub', 'resources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_resources')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as unknown as Resource[];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
