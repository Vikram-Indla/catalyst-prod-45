/**
 * useBoardAvatars — resolve assignee display names to avatar URLs via useApprovedProfiles.
 * Uses the canonical approval gate (approval_status = 'APPROVED') and avatar override table.
 */
import { useMemo } from 'react';
import { useApprovedProfiles } from '@/hooks/useApprovedProfiles';
import { resolveAvatarUrl } from '@/lib/avatars';

export function useBoardAvatars(names: string[]): Map<string, string | null> {
  const unique = Array.from(new Set(names.filter(Boolean)));
  const { data: approvedProfiles = [] } = useApprovedProfiles();

  return useMemo(() => {
    const map = new Map<string, string | null>();
    // Build name → avatarUrl from approved profiles (includes admin override)
    const profileByName = new Map<string, string | null>();
    for (const p of approvedProfiles) {
      profileByName.set(p.name, p.avatarUrl ?? null);
    }
    for (const name of unique) {
      if (profileByName.has(name)) {
        map.set(name, profileByName.get(name)!);
      } else {
        // Fallback to local hashed asset for names not in approved profiles
        map.set(name, resolveAvatarUrl(name));
      }
    }
    return map;
  }, [unique, approvedProfiles]);
}
