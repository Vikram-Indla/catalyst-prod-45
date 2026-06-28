/**
 * CurrentUserAvatar — thin wrapper that auto-binds the canonical UserAvatar
 * to the currently signed-in profile.
 *
 * Replaces the deleted src/components/project-hub/shell/UserAvatar.tsx
 * (Phase B-3, 2026-05-18). The old sibling rolled its own circle + initials
 * + person-icon fallback + auth fetch; this wrapper keeps only the auth
 * fetch and forwards the result to the canonical wrapper.
 *
 * Usage:  <CurrentUserAvatar />   // zero props — pulls from supabase.auth
 *
 * Pinned by: shell/__tests__/UserAvatar-migration.test.ts
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip } from '@/components/ads';
import { UserAvatar } from '@/components/shared/UserAvatar';

interface ProfileSnapshot {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export function CurrentUserAvatar() {
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: p } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      setProfile({
        id: user.id,
        name: p?.full_name || user.email?.split('@')[0] || 'User',
        avatarUrl: p?.avatar_url ?? null,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  const name = profile?.name ?? 'User';

  return (
    <Tooltip content={name} position="bottom">
      <button
        type="button"
        title="Profile"
        className="rounded-full flex-shrink-0 focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] focus-visible:ring-offset-2 outline-none p-0 border-0 bg-transparent cursor-pointer"
      >
        <UserAvatar name={name} src={profile?.avatarUrl} size="medium" />
      </button>
    </Tooltip>
  );
}

export default CurrentUserAvatar;
