/**
 * useBoardAvatars — resolve assignee display names to avatar URLs via `profiles`.
 * Fresh; shares only the data source.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveAvatarUrl } from '@/lib/avatars';

export function useBoardAvatars(names: string[]): Map<string, string | null> {
  const unique = Array.from(new Set(names.filter(Boolean))).sort();
  const { data } = useQuery({
    queryKey: ['kb-avatars', unique.join('|')],
    queryFn: async () => {
      const map = new Map<string, string | null>();
      // Local hashed asset first (§19 chokepoint) — works even for names with no profile row.
      unique.forEach((name) => map.set(name, resolveAvatarUrl(name)));
      if (unique.length === 0) return map;
      // Fallback to profiles.avatar_url only where no local asset matched.
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .in('full_name', unique);
      (data ?? []).forEach((p: any) => {
        if (p.full_name && !map.get(p.full_name)) map.set(p.full_name, p.avatar_url ?? null);
      });
      return map;
    },
    enabled: unique.length > 0,
    staleTime: 5 * 60_000,
  });
  return data ?? new Map();
}
