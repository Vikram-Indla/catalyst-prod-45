import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AvatarGroup from '@atlaskit/avatar-group';
import { resolveAvatarUrl } from '@/lib/avatars';
import { isBannedAvatarSrc } from '@/components/shared/CatalystAvatar';

interface MemberStackProps {
  memberIds: string[] | null;
  memberCount: number;
  max?: number;
  /** Optional click handler on the overflow "+N" chip — opens the manage popup. */
  onMoreClick?: (event: React.MouseEvent | React.KeyboardEvent) => void;
  /** Optional click handler on individual avatars. */
  onAvatarClick?: (event: React.MouseEvent | React.KeyboardEvent, memberId: string) => void;
}

// Global profile cache — kept for hot-path avatar lookups across rows.
const profileCache = new Map<string, { full_name: string; avatar_url: string | null }>();

export function useMemberProfiles(allMemberIds: string[]) {
  const uniqueIds = useMemo(() => {
    const uncached = allMemberIds.filter(id => id && !profileCache.has(id));
    return [...new Set(uncached)];
  }, [allMemberIds]);

  return useQuery({
    queryKey: ['member-profiles-batch', uniqueIds.sort().join(',')],
    queryFn: async () => {
      if (uniqueIds.length === 0) return profileCache;
      // Track which profile_ids still need an avatar after the profiles pass —
      // some users have `profiles.avatar_url = null` because the user-upload
      // flow never fires for them, but `resource_inventory.avatar_url` carries
      // the live Jira CDN URL via sync (CLAUDE.md 2026-05-17 — same fix path
      // as r360Service.getMemberOverview).
      const needsAvatarFallback: string[] = [];
      for (let i = 0; i < uniqueIds.length; i += 100) {
        const chunk = uniqueIds.slice(i, i + 100);
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', chunk);
        if (data) {
          data.forEach(p => {
            profileCache.set(p.id, { full_name: p.full_name || '', avatar_url: p.avatar_url });
            if (!p.avatar_url) needsAvatarFallback.push(p.id);
          });
        }
      }

      // Fallback pass — fetch resource_inventory.avatar_url for any profile_id
      // whose profiles.avatar_url was null. One query, scoped to the missing
      // set, so the round-trip is amortised across all empty-avatar members.
      if (needsAvatarFallback.length > 0) {
        const { data: resources } = await (supabase as any)
          .from('resource_inventory')
          .select('profile_id, avatar_url')
          .in('profile_id', needsAvatarFallback)
          .not('avatar_url', 'is', null);
        (resources ?? []).forEach((r: { profile_id: string; avatar_url: string | null }) => {
          if (!r.avatar_url) return;
          const existing = profileCache.get(r.profile_id);
          if (existing) {
            profileCache.set(r.profile_id, { ...existing, avatar_url: r.avatar_url });
          }
        });
      }

      uniqueIds.forEach(id => {
        if (!profileCache.has(id)) {
          profileCache.set(id, { full_name: '', avatar_url: null });
        }
      });
      return new Map(profileCache);
    },
    enabled: uniqueIds.length > 0,
    staleTime: 5 * 60_000,
  });
}

export function MemberStack({
  memberIds,
  memberCount,
  max = 4,
  onMoreClick,
  onAvatarClick,
}: MemberStackProps) {
  const ids = memberIds ?? [];

  if (memberCount === 0) {
    return <span style={{ fontSize: 13, color: 'var(--ds-text-subtlest, #758195)' }}>—</span>;
  }

  // Map member IDs into Atlaskit AvatarGroup data shape.
  // Atlaskit handles the overlap, ring, overflow chip, and tooltips natively.
  const data = ids.map((id) => {
    const profile = profileCache.get(id);
    return {
      key: id,
      name: profile?.full_name || 'Unknown',
      src: resolveAvatarUrl(profile?.full_name) ?? (isBannedAvatarSrc(profile?.avatar_url) ? undefined : (profile?.avatar_url || undefined)),
      // appearance / presence / status omitted — Atlaskit defaults are correct.
    };
  });

  return (
    <AvatarGroup
      appearance="stack"
      size="medium"
      maxCount={max}
      data={data}
      onAvatarClick={
        onAvatarClick
          ? (event, _avatar, index) => onAvatarClick(event, ids[index] ?? '')
          : undefined
      }
      onMoreClick={onMoreClick}
    />
  );
}
