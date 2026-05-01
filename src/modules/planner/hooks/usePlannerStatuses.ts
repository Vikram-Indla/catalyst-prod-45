// ============================================================
// PLANNER STATUSES HOOK
// Fetches status options from planner_statuses table
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlannerStatus {
  id: string;
  slug: string;
  name: string;
  color: string;
  order: number;
}

export function usePlannerStatuses() {
  return useQuery({
    queryKey: ['planner-statuses'],
    queryFn: async (): Promise<PlannerStatus[]> => {
      const { data, error } = await supabase
        .from('planner_statuses')
        .select('id, slug, name, color, sort_order')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching statuses:', error);
        return [];
      }

      return (data || []).map(s => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        color: s.color || 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))',
        order: s.sort_order || 0,
      }));
    },
    staleTime: 10 * 60 * 1000, // 10 min cache
    gcTime: 30 * 60 * 1000,
  });
}
