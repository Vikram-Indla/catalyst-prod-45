/**
 * ConversationAvatar — single source of truth for how Draft / Scheduled /
 * Sent rows render the leading 36px avatar slot.
 *
 *   • DM         → recipient's avatar via PresenceAvatar (image or initials)
 *   • Group DM   → PresenceAvatar with member count as displayLabel
 *   • Channel    → square box with a # glyph (public) or 🔒 glyph (private)
 *   • Ticket/etc → hashed-initials PresenceAvatar fallback
 */
import React from 'react';
import { PresenceAvatar } from '../shared/PresenceAvatar';
import { HashIcon, LockIcon } from '../shared/Icon';

interface ConversationAvatarProps {
  kind: string;
  isPrivate?: boolean;
  /** Used for PresenceAvatar initials + alt text. */
  name: string;
  /** Avatar image URL when known (DMs). */
  src?: string | null;
  /** Optional override for the displayed letter/badge (e.g. group member count). */
  displayLabel?: string;
  size?: number;
}

export function ConversationAvatar({
  kind,
  isPrivate,
  name,
  src,
  displayLabel,
  size = 36,
}: ConversationAvatarProps) {
  if (kind === 'channel' || kind === 'custom_channel') {
    return (
      <span
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          borderRadius: 'var(--cv2-radius-md)',
          background: 'var(--cv2-bg-row-hover)',
          color: 'var(--cv2-text-subtle)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
        }}
      >
        {isPrivate ? <LockIcon size={Math.round(size * 0.45)} /> : <HashIcon size={Math.round(size * 0.5)} />}
      </span>
    );
  }
  return (
    <PresenceAvatar src={src ?? null} name={name} size={size} displayLabel={displayLabel} />
  );
}

interface ConversationTitleProps {
  kind: string;
  isPrivate?: boolean;
  title: string;
  /** Optional override font weight (defaults to 700). */
  weight?: number;
}

/**
 * Renders the conversation title prefixed with an inline # or lock icon
 * for channels. DMs and other kinds render the plain title.
 */
export function ConversationTitle({ kind, isPrivate, title, weight = 700 }: ConversationTitleProps) {
  const isChannel = kind === 'channel' || kind === 'custom_channel';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontSize: 14,
        fontWeight: weight,
        color: 'var(--cv2-text)',
      }}
    >
      {isChannel && (
        <span
          aria-hidden="true"
          style={{
            color: 'var(--cv2-text-subtle)',
            display: 'inline-flex',
            alignItems: 'center',
            flex: '0 0 auto',
          }}
        >
          {isPrivate ? <LockIcon size={12} /> : <HashIcon size={12} />}
        </span>
      )}
      <span
        style={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </span>
    </span>
  );
}
