import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { countryToTimezone } from '@/lib/country-timezone';

/**
 * useResourceHomeTimezone — resolves the signed-in user's HOME timezone for
 * the sidebar clock's "Home" row.
 *
 * Source of truth: `profiles.country` (text). This is the reliable signal —
 * it is a plain country name and survives id reseeds, unlike
 * `resource_inventory.country_id` (whose FK was orphaned by a 2026-05-15
 * reseed; see CLAUDE.md). It is written by the admin UserDrawer alongside the
 * inventory link, so it stays in sync.
 *
 * Cached aggressively (home country is effectively static within a session).
 * Returns { homeTz: null } when the user has no country or an unmapped country
 * — the widget then shows Riyadh only and never fabricates a home zone
 * (CLAUDE.md zero-assumption rule).
 */
export function useResourceHomeTimezone() {
  const { user, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: ['resource-home-tz', user?.id ?? null],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 60, // 1h — home country is effectively static
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('country')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      const country = (data?.country as string | null) ?? null;
      return { country, tz: countryToTimezone(country) };
    },
  });

  return {
    homeCountry: query.data?.country ?? null,
    homeTz: query.data?.tz ?? null,
    isLoading: authLoading || (!!user?.id && query.isLoading),
  };
}
