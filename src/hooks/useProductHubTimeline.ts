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
  delivery_manager:project_manager_user_id(full_name),
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
    deliveryManagerName: row.delivery_manager?.full_name ?? null,
    deliveryManagerAvatarUrl: row.delivery_manager?.full_name
      ? resolveAvatarUrl(row.delivery_manager.full_name)
      : null,
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
