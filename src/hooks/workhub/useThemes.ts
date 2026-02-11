/**
 * WorkHub Themes Hook — TanStack Query
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Theme } from '@/types/workhub.types';

export function useWHThemes() {
  return useQuery({
    queryKey: ['workhub', 'themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wh_themes')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data ?? []) as unknown as Theme[];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
