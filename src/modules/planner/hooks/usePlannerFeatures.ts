// ============================================================
// PLANNER FEATURES HOOK
// Fetches features for the feature selector in create task modal
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlannerFeature {
  id: string;
  name: string;
  displayId: string;
}

export function usePlannerFeatures() {
  return useQuery({
    queryKey: ['planner-features'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('id, name, display_id')
        .is('deleted_at', null)
        .order('name', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error fetching features:', error);
        return [];
      }

      return (data || []).map(f => ({
        id: f.id,
        name: f.name || 'Untitled Feature',
        displayId: f.display_id || 'FTR',
      })) as PlannerFeature[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
