import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useBacklogInitiatives() {
  return useQuery({
    queryKey: ['backlog-initiatives'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ph_backlog_initiatives_view')
        .select('*');
      if (error) throw error;
      return data;
    },
  });
}
