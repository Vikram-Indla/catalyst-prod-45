/**
 * useProfileAvatars — Avatar URL map hooks, wired through the §19 chokepoint.
 *
 * HISTORICAL NOTE:
 * Previously, these hooks queried `profiles.avatar_url` and returned external
 * Supabase/Gravatar/Atlassian-CDN URLs. That violated CLAUDE.md §19 (avatar
 * image migration chokepoint). On 2026-04-20 the internals were replaced with
 * `resolveAvatarUrl(name)` so every URL returned is either a local hashed
 * asset or `undefined`. Hook return-types are unchanged → no caller changes.
 *
 * Consumers still get `Map<key, url>` / `Record<name, url>`. The difference is
 * values now resolve via `src/lib/avatars.ts` instead of external HTTP.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveAvatarUrl } from '@/lib/avatars';

interface ProfileIdentityRow {
  id: string;
  full_name: string | null;
}

/**
 * Returns `Map<profileId, localAvatarUrl>` for any profile whose name
 * resolves to a local avatar asset. Profiles without a local match are
 * omitted — caller falls back to `CircleUser` / initials as before.
 *
 * §19: no `avatar_url` column selected; all URLs come from resolveAvatarUrl.
 */
export function useProfileAvatars() {
  const { data: avatarMap = new Map<string, string>() } = useQuery({
    queryKey: ['profile-avatars-local'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .not('full_name', 'is', null);

      const map = new Map<string, string>();
      (data as ProfileIdentityRow[] || []).forEach((p) => {
        if (!p.full_name) return;
        const url = resolveAvatarUrl(p.full_name);
        if (url) map.set(p.id, url);
      });
      return map;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return avatarMap;
}

/**
 * Returns `Map<lowercaseName, localAvatarUrl>`. Same chokepoint as above.
 */
export function useProfileAvatarsByName() {
  const { data: avatarMap = new Map<string, string>() } = useQuery({
    queryKey: ['profile-avatars-by-name-local'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .not('full_name', 'is', null);

      const map = new Map<string, string>();
      (data as ProfileIdentityRow[] || []).forEach((p) => {
        if (!p.full_name) return;
        const url = resolveAvatarUrl(p.full_name);
        if (url) map.set(p.full_name.toLowerCase(), url);
      });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  return avatarMap;
}
