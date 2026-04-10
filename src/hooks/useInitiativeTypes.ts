import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';

export function useInitiativeTypes() {
  return useQuery({
    queryKey: ['initiative-types'],
    queryFn: async () => {
      const { data, error } = await typedQuery('initiative_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 30,
  });
}
