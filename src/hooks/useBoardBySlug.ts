import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isValidUUID } from '@/lib/utils/assertUuid';

/**
 * Resolves a board slug (or legacy UUID) to its full board record.
 * Dual-mode: accepts slug OR UUID for backward compat during the UUID→slug transition.
 */
export function useBoardBySlug(slugOrId: string | undefined | null) {
  return useQuery({
    queryKey: ['board-by-slug', slugOrId],
    enabled: !!slugOrId,
    queryFn: async () => {
      if (!slugOrId) return null;
      const field = isValidUUID(slugOrId) ? 'id' : 'slug';
      const { data } = await supabase
        .from('boards')
        .select('id, slug, name')
        .eq(field, slugOrId)
        .is('deleted_at', null)
        .maybeSingle();
      return data ?? null;
    },
  });
}
