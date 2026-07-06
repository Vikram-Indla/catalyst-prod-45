/**
 * WikiPresence — live "who's on this page" (CAT-DOCS-NOTION-20260704-001).
 * Supabase Realtime presence channel per page; canonical ADS AvatarGroup.
 * Soft-collaboration signal — no locking, no content sync (Yjs is phase 2).
 */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AvatarGroup, type AvatarGroupData } from '@/components/ads';

interface PresentUser {
  userId: string;
  name: string;
  avatar?: string;
}

export interface WikiPresenceProps {
  pageId: string;
}

export function WikiPresence({ pageId }: WikiPresenceProps) {
  const { user } = useAuth();
  const [present, setPresent] = useState<PresentUser[]>([]);

  useEffect(() => {
    if (!pageId || !user?.id) return;
    const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string };
    const name = meta.full_name || meta.name || user.email || 'Someone';

    const channel = supabase.channel(`wiki-page:${pageId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ userId: string; name: string; avatar?: string }>();
        const seen = new Map<string, PresentUser>();
        Object.values(state).forEach((entries) => {
          entries.forEach((e) => {
            if (e.userId) seen.set(e.userId, { userId: e.userId, name: e.name, avatar: e.avatar });
          });
        });
        setPresent(Array.from(seen.values()));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void channel.track({ userId: user.id, name, avatar: meta.avatar_url });
        }
      });

    return () => {
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [pageId, user?.id, user?.email, user?.user_metadata]);

  const data = useMemo<AvatarGroupData[]>(
    () =>
      present.map((p) => ({
        key: p.userId,
        name: p.userId === user?.id ? `${p.name} (you)` : p.name,
        src: p.avatar,
        presence: 'online' as const,
      })),
    [present, user?.id],
  );

  // Only worth showing when more than just you are here.
  if (data.length <= 1) return null;

  return (
    <div className="wiki-no-print" aria-label={`${data.length} people on this page`}>
      <AvatarGroup data={data} size="small" maxCount={5} aria-label="People viewing this page" />
    </div>
  );
}

export default WikiPresence;
