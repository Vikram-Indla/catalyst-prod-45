// ============================================================================
// HOOK: useReleases
// Fetches releases for dropdowns and filters
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReleaseOption {
  id: string;
  name: string;
  status: string;
}

export function useReleases() {
  return useQuery({
    queryKey: ['releases-list'],
    queryFn: async (): Promise<ReleaseOption[]> => {
      const { data, error } = await supabase
        .from('releases')
        .select('id, name, status')
        .order('name', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error fetching releases:', error);
        throw error;
      }

      return (data || []).map(r => ({
        id: r.id,
        name: r.name,
        status: r.status || 'planned',
      }));
    },
    staleTime: 60000, // 1 minute
  });
}
