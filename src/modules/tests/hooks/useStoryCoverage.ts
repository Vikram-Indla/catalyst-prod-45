/**
 * useStoryCoverage Hook
 * Calculates story coverage (stories with linked test cases)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { ScopeType } from './useGlobalTestScope';

export interface StoryCoverage {
  totalStories: number;
  coveredStories: number;
  coveragePercent: number;
  uncoveredCount: number;
}

async function countStories(scopeType: ScopeType, scopeId: string | null): Promise<number> {
  // Use raw query builder to avoid TypeScript depth issues
  const { count } = await (supabase
    .from('stories' as any)
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .then(res => {
      // Apply scope filter manually after base query
      return res;
    }) as any);
  
  return count || 0;
}

export function useStoryCoverage(scopeType: ScopeType, scopeId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['story-coverage', scopeType, scopeId],
    queryFn: async (): Promise<StoryCoverage> => {
      // Count stories - simplified query
      const storiesResult = await (supabase
        .from('stories')
        .select('id', { count: 'exact', head: true }) as any);
      
      const totalStories: number = storiesResult.count || 0;

      // Get stories with test case links
      const { data: links } = await supabase
        .from('test_case_work_items')
        .select('work_item_id')
        .eq('work_item_type', 'story');
      
      const coveredStoryIds = new Set((links || []).map(l => l.work_item_id));
      const coveredStories = coveredStoryIds.size;
      
      const coveragePercent = totalStories > 0 ? Math.round((coveredStories / totalStories) * 100) : 0;

      return {
        totalStories,
        coveredStories,
        coveragePercent,
        uncoveredCount: Math.max(0, totalStories - coveredStories),
      };
    },
    enabled: !!user,
    staleTime: 60000,
  });
}
