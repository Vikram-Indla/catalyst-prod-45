import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRoadmapInitiatives() {
  return useQuery({
    queryKey: ['roadmap-initiatives'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ph_roadmap_initiatives_view')
        .select('*');
      if (error) throw error;
      return data;
    },
  });
}

export function useRoadmapSummary() {
  return useQuery({
    queryKey: ['roadmap-summary'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ph_roadmap_summary_view')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
  });
}
