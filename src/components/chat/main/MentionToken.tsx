/**
 * MentionToken — clickable @mention in message bodies.
 *
 * Click → resolve `@Name` to profiles.id via case-insensitive full_name
 * lookup → useStartDm → openConversationInDock so the chat dock switches
 * to the DM (or creates one). Slack/Teams parity: clicking a mention is
 * the fastest way to start a 1:1.
 *
 * If the name doesn't resolve (typo, ex-user) the token renders highlighted
 * but inert.
 */
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStartDm } from '@/hooks/chat/useStartDm';
import { openConversationInDock } from '@/lib/chat-dock-bridge';
import { useAuth } from '@/hooks/useAuth';

export interface MentionTokenProps {
  /** Including the leading "@" (e.g. "@Abdullah Alshammari"). */
  raw: string;
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

export function MentionToken({ raw }: MentionTokenProps) {
  const { user } = useAuth();
  const startDm = useStartDm();
  const [busy, setBusy] = useState(false);

  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const profileId = await resolveProfileId(raw);
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
    <button
      type="button"
      className="cc-mention"
      onClick={onClick}
      disabled={busy}
      title={`Message ${raw.replace(/^@/, '').trim()}`}
      style={{ cursor: busy ? 'wait' : 'pointer' }}
    >
      {raw}
    </button>
  );
}

export default MentionToken;
