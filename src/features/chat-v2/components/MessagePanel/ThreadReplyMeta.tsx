import React from 'react';
import { PresenceAvatar } from '../shared/PresenceAvatar';

interface ThreadReplyMetaProps {
  replyCount: number;
  lastReplyIso: string | null;
  participants?: Array<{ name: string; avatarUrl: string | null }>;
  onOpen: () => void;
}

function formatLastReply(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  const now = Date.now();
  const diffMs = now - date.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? '' : 's'} ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`;
  const yr = Math.round(mo / 12);
  return `${yr} year${yr === 1 ? '' : 's'} ago`;
}

export function ThreadReplyMeta({
  replyCount,
  lastReplyIso,
  participants = [],
  onOpen,
}: ThreadReplyMetaProps) {
  if (replyCount <= 0) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 8px',
        background: 'transparent',
        border: '1px solid transparent',
        borderRadius: 'var(--cv2-radius-md)',
        cursor: 'pointer',
        marginTop: 4,
        transition: 'background var(--cv2-transition-fast), border-color var(--cv2-transition-fast)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-panel)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--cv2-border)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
        (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
      }}
    >
      {participants.length > 0 && (
        <span style={{ display: 'inline-flex' }}>
          {participants.slice(0, 3).map((p, i) => (
            <span key={i} style={{ marginLeft: i === 0 ? 0 : -6 }}>
              <PresenceAvatar name={p.name} size={20} />
            </span>
          ))}
        </span>
      )}
      <span
        style={{
          fontFamily: 'var(--cv2-font)',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--cv2-text-link)',
        }}
      >
        {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
      </span>
      {lastReplyIso && (
        <span
          style={{
            fontFamily: 'var(--cv2-font)',
            fontSize: 12,
            color: 'var(--cv2-text-muted)',
          }}
        >
          Last reply {formatLastReply(lastReplyIso)}
        </span>
      )}
    </button>
  );
}
