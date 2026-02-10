/**
 * useProfileAvatars - Shared hook to fetch avatar URLs for profiles
 * Returns a Map<profileId, avatarUrl> for quick lookups across all modules
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProfileAvatar {
  id: string;
  avatar_url: string | null;
  full_name: string | null;
}

/**
 * Fetches all profiles that have avatar_url set.
 * Returns a map for O(1) lookups by profile ID.
 */
export function useProfileAvatars() {
  const { data: avatarMap = new Map<string, string>() } = useQuery({
    queryKey: ['profile-avatars'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, avatar_url, full_name')
        .not('avatar_url', 'is', null);

      const map = new Map<string, string>();
      (data as ProfileAvatar[] || []).forEach(p => {
        if (p.avatar_url) map.set(p.id, p.avatar_url);
      });
      return map;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return avatarMap;
}

/**
 * Given a name, look up avatar_url from the profile avatars map.
 * Useful when you only have a name, not an ID.
 */
export function useProfileAvatarsByName() {
  const { data: avatarMap = new Map<string, string>() } = useQuery({
    queryKey: ['profile-avatars-by-name'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, avatar_url, full_name')
        .not('avatar_url', 'is', null);

      const map = new Map<string, string>();
      (data as ProfileAvatar[] || []).forEach(p => {
        if (p.avatar_url && p.full_name) {
          map.set(p.full_name.toLowerCase(), p.avatar_url);
        }
      });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  return avatarMap;
}
