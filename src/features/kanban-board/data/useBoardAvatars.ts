/**
 * useBoardAvatars — resolve assignee display names to avatar URLs via `profiles`.
 * Fresh; shares only the data source.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useBoardAvatars(names: string[]): Map<string, string | null> {
  const unique = Array.from(new Set(names.filter(Boolean))).sort();
  const { data } = useQuery({
    queryKey: ['kb-avatars', unique.join('|')],
    queryFn: async () => {
      if (unique.length === 0) return new Map<string, string | null>();
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .in('full_name', unique);
      const map = new Map<string, string | null>();
      (data ?? []).forEach((p: any) => {
        if (p.full_name) map.set(p.full_name, p.avatar_url ?? null);
      });
      return map;
    },
    enabled: unique.length > 0,
    staleTime: 5 * 60_000,
  });
  return data ?? new Map();
}
