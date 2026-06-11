/**
 * CatalystMention — single canonical mention chip used everywhere mentions
 * are rendered: chat messages, chat activity feed, notification cards.
 *
 * Why this exists:
 *   Description (Tiptap) and Comments (ADF renderer) already emit the
 *   canonical mention DOM — `<span data-mention-id="USER_ID">@Name</span>` —
 *   which is painted globally by `injectMentionStyles()`. Chat and
 *   notifications used to ship their own bespoke renderers (`MentionToken`,
 *   `MentionSpan`) with inline styles. That meant three places to keep in
 *   sync. This primitive collapses them into one component so every mention
 *   in the product looks and behaves the same.
 *
 * Contract:
 *   - Always emits `<span data-mention-id="USER_ID">@Name</span>` so the
 *     shared stylesheet picks it up (`mentionStyles.ts`).
 *   - Optional `onActivate` for interactive surfaces (chat → start DM).
 *     Read-mode renderers leave it undefined.
 *   - Self-status is stamped on mount + when currentUserId changes via the
 *     same `data-mention-self` attribute the shared CSS keys on.
 */
import React, { useEffect } from 'react';
import { injectMentionStyles } from './mentionStyles';

export interface CatalystMentionProps {
  /** Display name without the leading "@". */
  name: string;
  /** profiles.id — when known, enables current-user vs other-user paint. */
  userId?: string | null;
  /** The viewer's profile id. When it matches `userId`, the chip paints brand-bold. */
  currentUserId?: string | null;
  /** Optional click handler for interactive surfaces (chat). */
  onActivate?: () => void;
  /** Tooltip override (defaults to "Message <name>" when interactive, plain name otherwise). */
  title?: string;
}

export function CatalystMention({
  name,
  userId,
  currentUserId,
  onActivate,
  title,
}: CatalystMentionProps) {
  // Inject the shared mention stylesheet once per document — idempotent.
  useEffect(() => {
    injectMentionStyles();
  }, []);

  const trimmed = name.trim();
  const isSelf = !!userId && !!currentUserId && userId === currentUserId;
  const interactive = !!onActivate;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (!onActivate) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  };

  return (
    <span
      data-mention-id={userId ?? ''}
      data-mention-self={isSelf ? 'true' : undefined}
      onClick={onActivate}
      onKeyDown={interactive ? handleKeyDown : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      title={title ?? (interactive ? `Message ${trimmed}` : trimmed)}
      style={interactive ? { cursor: 'pointer' } : undefined}
    >
      @{trimmed}
    </span>
  );
}

export default CatalystMention;
