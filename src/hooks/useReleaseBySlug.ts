import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isValidUUID } from '@/lib/utils/assertUuid';

export function useReleaseBySlug(slugOrId: string | undefined | null) {
  return useQuery({
    queryKey: ['release-by-slug', slugOrId],
    enabled: !!slugOrId,
    queryFn: async () => {
      if (!slugOrId) return null;
      const field = isValidUUID(slugOrId) ? 'id' : 'slug';
      const { data } = await (supabase as any)
        .from('ph_releases')
        .select('id, slug, name')
        .eq(field, slugOrId)
        .maybeSingle();
      return data ?? null;
    },
  });
}
