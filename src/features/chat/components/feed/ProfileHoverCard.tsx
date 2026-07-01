/**
 * ProfileHoverCard — Slack-parity mini profile card for the chat feed.
 *
 * Opens on click of a message avatar or author name. Portals to document.body
 * (the feed has overflow:hidden ancestors, so @atlaskit/dropdown-menu / Popper
 * would mis-position — we hand-roll the portal like HoverToolbar's EmojiPicker).
 *
 * Zero-assumption: presence dot only renders when the online rule provably
 * passes; otherwise nothing. No job-title line — `profiles` has no title column.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import Button from '@atlaskit/button/new';
import { supabase } from '@/integrations/supabase/client';
import { useStartDm } from '@/hooks/chat/useStartDm';
import { openConversationInDock } from '@/lib/chat-dock-bridge';
// ads-scanner:ignore-next-line -- CSS file uses only var(--c-chat-*) / var(--ds-*) tokens
import './profile-hover-card.css';

const db = supabase as unknown as { from: (t: string) => any };

const CARD_W = 260;
const ONLINE_STATES = new Set(['onsite', 'remote']);
const ONLINE_WINDOW_MS = 5 * 60_000;

interface ProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface Props {
  userId: string;
  name: string;
  avatarUrl: string | null;
  anchorRect: DOMRect;
  currentUserId: string | null;
  onClose: () => void;
}

function isOnline(state: string | null, lastSeenAt: string | null): boolean {
  if (!state || !lastSeenAt || !ONLINE_STATES.has(state)) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS;
}

export function ProfileHoverCard({
  userId,
  name,
  avatarUrl,
  anchorRect,
  currentUserId,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [online, setOnline] = useState(false);
  const startDm = useStartDm();
  const isOwn = currentUserId !== null && userId === currentUserId;

  // ── Fetch profile + presence once on mount ────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [profileRes, presenceRes] = await Promise.all([
        db
          .from('profiles')
          .select('id,full_name,avatar_url,email')
          .eq('id', userId)
          .maybeSingle(),
        db
          .from('user_presence')
          .select('state,last_seen_at')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      if (profileRes?.data) setProfile(profileRes.data as ProfileRow);
      const pres = presenceRes?.data;
      setOnline(isOnline(pres?.state ?? null, pres?.last_seen_at ?? null));
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ── Click-outside + Escape (capture phase, stopPropagation) ───────────────
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [onClose]);

  const handleMessage = async () => {
    try {
      const convId = await startDm.mutateAsync(userId);
      openConversationInDock(convId);
    } catch {
      /* best-effort */
    } finally {
      onClose();
    }
  };

  // ── Positioning: open below anchor, clamp to viewport ─────────────────────
  const top = anchorRect.bottom + 4;
  const left = Math.max(
    8,
    Math.min(anchorRect.left, window.innerWidth - CARD_W - 8),
  );

  const displayName = profile?.full_name ?? name;
  const resolvedSrc = profile?.avatar_url ?? avatarUrl ?? undefined;
  const email = profile?.email ?? null;

  return createPortal(
    <div
      ref={ref}
      className="c-profile-card"
      style={{ top, left }}
      role="dialog"
      aria-label={`Profile: ${displayName}`}
    >
      <div className="c-profile-card__head">
        <CatalystAvatar
          name={displayName}
          src={resolvedSrc}
          size="large"
          appearance="circle"
        />
        <div className="c-profile-card__id">
          <span className="c-profile-card__name">{displayName}</span>
          {online && (
            <span className="c-profile-card__presence">
              <span className="c-profile-card__dot" aria-hidden="true" />
              <span className="c-profile-card__presence-label">Active</span>
            </span>
          )}
        </div>
      </div>

      {email && (
        <a className="c-profile-card__email" href={`mailto:${email}`}>
          {email}
        </a>
      )}

      {!isOwn && (
        <div className="c-profile-card__actions">
          <Button
            appearance="primary"
            shouldFitContainer
            onClick={handleMessage}
            isLoading={startDm.isPending}
          >
            Message
          </Button>
        </div>
      )}
    </div>,
    document.body,
  );
}
