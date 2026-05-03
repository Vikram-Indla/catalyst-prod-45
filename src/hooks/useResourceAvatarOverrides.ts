/**
 * useResourceAvatarOverrides — face-avatar runtime override fetch.
 *
 * Reads catalyst_resource_avatars and returns a `Map<profileId, url>`.
 * Used both by the AdminAvatarsPage (to show current state) and by
 * resolveAvatarUrl (so every Catalyst surface that renders face photos
 * picks up the override automatically).
 *
 * Defensive: returns empty map if the table doesn't exist yet.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ResourceAvatarOverride {
  profile_id: string;
  avatar_url: string;
  storage_path: string;
  updated_at: string;
}

async function fetchResourceAvatars(): Promise<Record<string, ResourceAvatarOverride>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from as any)('catalyst_resource_avatars')
    .select('profile_id, avatar_url, storage_path, updated_at');

  if (error || !Array.isArray(data)) return {};

  const map: Record<string, ResourceAvatarOverride> = {};
  for (const row of data as ResourceAvatarOverride[]) {
    if (row.profile_id) map[row.profile_id] = row;
  }
  return map;
}

export function useResourceAvatarOverrides() {
  return useQuery({
    queryKey: ['resource-avatar-overrides'],
    queryFn: fetchResourceAvatars,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
    placeholderData: {},
  });
}
