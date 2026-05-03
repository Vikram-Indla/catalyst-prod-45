/**
 * useAvatarUrl — face-avatar resolver (override-aware).
 *
 * Resolution order:
 *   1. catalyst_resource_avatars override for profileId (via useResourceAvatarOverrides)
 *   2. Bundled photo at src/assets/avatars/<slug>.png (via resolveAvatarUrl)
 *   3. null (caller falls back to initials tile)
 *
 * Use this in NEW code that has a profileId on hand. Existing call sites
 * that only have a name continue using the synchronous resolveAvatarUrl
 * from src/lib/avatars.ts and get bundled-only behavior — they'll start
 * picking up overrides as they migrate to this hook.
 */

import { useResourceAvatarOverrides } from './useResourceAvatarOverrides';
import { resolveAvatarUrl } from '@/lib/avatars';

export function useAvatarUrl(
  profileId: string | null | undefined,
  name: string | null | undefined,
): string | null {
  const { data: overrides } = useResourceAvatarOverrides();

  if (profileId && overrides?.[profileId]?.avatar_url) {
    return overrides[profileId].avatar_url;
  }

  return name ? resolveAvatarUrl(name) : null;
}
