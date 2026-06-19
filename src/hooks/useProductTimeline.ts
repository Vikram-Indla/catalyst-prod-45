import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface ReleaseMilestone {
  id: string;
  name: string;
  startDate: string | null; // ISO date
  endDate: string | null; // ISO date
  confidence: 'high' | 'medium' | 'low' | 'released' | 'draft';
  brCount: number;
}

export interface ProductTimelineData {
  releases: ReleaseMilestone[];
  productId: string;
}

/**
 * useProductTimeline — fetches product_releases for a product and counts
 * associated business_requests to determine confidence. Confidence is based on:
 * - high: >3 BRs scoped to release
 * - medium: 1-3 BRs
 * - low: 0 BRs (draft state)
 */
export function useProductTimeline(productId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['product-timeline', productId],
    queryFn: async (): Promise<ProductTimelineData> => {
      if (!productId) return { releases: [], productId: '' };

      // Fetch product_releases
      const { data: releases, error: relError } = await (supabase as any)
        .from('product_releases')
        .select('id, name, start_date, end_date')
        .eq('product_id', productId)
        .order('end_date', { ascending: true, nullsFirst: false });

      if (relError) throw relError;

      if (!releases || releases.length === 0) {
        return { releases: [], productId };
      }

      // Get BR counts per release
      const releaseIds = releases.map((r: any) => r.id);
      const { data: brCounts, error: brError } = await (supabase as any)
        .from('business_requests')
        .select('release_id')
        .in('release_id', releaseIds)
        .is('deleted_at', null);

      if (brError) throw brError;

      const countByReleaseId = new Map<string, number>();
      for (const br of brCounts ?? []) {
        const count = (countByReleaseId.get(br.release_id) ?? 0) + 1;
        countByReleaseId.set(br.release_id, count);
      }

      const milestones: ReleaseMilestone[] = (releases ?? []).map((r: any) => {
        const brCount = countByReleaseId.get(r.id) ?? 0;
        let confidence: ReleaseMilestone['confidence'] = 'low';
        if (brCount > 3) confidence = 'high';
        else if (brCount >= 1) confidence = 'medium';

        return {
          id: r.id,
          name: r.name,
          startDate: r.start_date,
          endDate: r.end_date,
          confidence,
          brCount,
        };
      });

      return { releases: milestones, productId };
    },
    enabled: !!productId && !!user,
    staleTime: 30_000,
  });
}
