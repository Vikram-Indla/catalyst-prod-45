/**
 * useProductHubTimeline — DEPRECATED 2026-06-15
 * Hook used by deprecated ProductHubTimelinePage.
 * Route /product-hub/:key/timeline now redirects to /product-hub/:key/dashboard.
 * This hook and ProductHubTimelinePage are kept for git history only.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { resolveAvatarUrl } from '@/lib/avatars';

export interface TimelineBusinessRequest {
  id: string;
  requestKey: string;
  productId: string;
  requestType: string;
  title: string;
  processStep: string | null;
  urgency: string | null;
  deliveryManagerName: string | null;
  deliveryManagerAvatarUrl: string | null;
  endDate: string | null;
  createdAt: string;
}

const SELECT_FIELDS = `
  id,
  request_key,
  product_id,
  request_type,
  title,
  process_step,
  urgency,
  project_manager_user_id,
  end_date,
  created_at
`;

function mapRow(row: any): TimelineBusinessRequest {
  return {
    id: row.id,
    requestKey: row.request_key ?? 'Unknown',
    productId: row.product_id,
    requestType: row.request_type ?? 'Feature',
    title: row.title ?? '(Untitled request)',
    processStep: row.process_step ?? null,
    urgency: row.urgency ?? null,
    deliveryManagerName: null,
    deliveryManagerAvatarUrl: null,
    endDate: row.end_date ?? null,
    createdAt: row.created_at,
  };
}

export function useProductHubTimeline(productId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['product-hub-timeline', productId],
    queryFn: async (): Promise<TimelineBusinessRequest[]> => {
      if (!productId) return [];

      const { data, error } = await (supabase as any)
        .from('business_requests')
        .select(SELECT_FIELDS)
        .eq('product_id', productId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
    enabled: !!productId && !!user,
    staleTime: 30_000,
  });
}
