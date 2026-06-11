/**
 * MentionToken — chat wrapper around the canonical `<CatalystMention>`
 * primitive. Adds chat-specific click behaviour: resolve the @Name to a
 * profile via case-insensitive `full_name` lookup, then open or create
 * a DM in the chat dock.
 *
 * Visual styling lives entirely in `mentionStyles.ts` (shared with
 * Description / Comments) — this file only adds the click-to-DM glue.
 */
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStartDm } from '@/hooks/chat/useStartDm';
import { openConversationInDock } from '@/lib/chat-dock-bridge';
import { useAuth } from '@/hooks/useAuth';
import { CatalystMention } from '@/components/shared/rich-text/mentions/CatalystMention';

export interface MentionTokenProps {
  /** Including the leading "@" (e.g. "@Abdullah Alshammari"). */
  raw: string;
  /** Pre-resolved profile id from the roster — skips the DB roundtrip when known. */
  userId?: string | null;
  /** The viewer's profile id — drives self-vs-other paint. */
  currentUserId?: string | null;
}

const db = supabase as unknown as { from: (table: string) => any };

async function resolveProfileId(name: string): Promise<string | null> {
  const trimmed = name.replace(/^@/, '').trim();
  if (!trimmed) return null;
  const { data } = await db
    .from('profiles')
    .select('id, full_name')
    .ilike('full_name', `${trimmed}%`)
    .limit(1);
  if (Array.isArray(data) && data.length > 0) return data[0].id as string;
  return null;
}

export function MentionToken({ raw, userId, currentUserId }: MentionTokenProps) {
  const { user } = useAuth();
  const startDm = useStartDm();
  const [busy, setBusy] = useState(false);

  const name = raw.replace(/^@/, '').trim();
  const effectiveCurrentUserId = currentUserId ?? user?.id ?? null;

  const onActivate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const profileId = userId ?? (await resolveProfileId(raw));
      if (!profileId || (user && profileId === user.id)) return;
      const convId = await startDm.mutateAsync(profileId);
      openConversationInDock(convId);
    } catch {
      /* silent — mention click is best-effort */
    } finally {
      setBusy(false);
    }
  };

  return (
    <CatalystMention
      name={name}
      userId={userId ?? undefined}
      currentUserId={effectiveCurrentUserId}
      onActivate={onActivate}
    />
  );
}

export default MentionToken;
