import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isValidUUID } from '@/lib/utils/assertUuid';

/** Resolves a portfolio key (e.g. "PLAT") or legacy UUID to a portfolios row. */
export function usePortfolioByKey(keyOrId: string | undefined | null) {
  return useQuery({
    queryKey: ['portfolio-by-key', keyOrId],
    enabled: !!keyOrId,
    queryFn: async () => {
      if (!keyOrId) return null;
      const field = isValidUUID(keyOrId) ? 'id' : 'key';
      const { data } = await (supabase as any)
        .from('portfolios')
        .select('id, key, name')
        .eq(field, keyOrId)
        .maybeSingle();
      return data ?? null;
    },
  });
}
