import React from 'react';
import { Avatar } from '@/components/ads/Avatar';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import type { ChatConversation } from '@/types/chat';
// ads-scanner:ignore-next-line -- CSS file uses only var(--c-chat-*) tokens
import './conversation-row.css';

const MuteIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const MoreIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
  </svg>
);
const HashIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <line x1="4" y1="9" x2="20" y2="9"/>
    <line x1="4" y1="15" x2="20" y2="15"/>
    <line x1="10" y1="3" x2="8" y2="21"/>
    <line x1="16" y1="3" x2="14" y2="21"/>
  </svg>
);

interface ConversationRowProps {
  conversation: ChatConversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  onMute?: (id: string) => void;
  onMore?: (id: string) => void;
  /** Online presence for DM conversations */
  isOnline?: boolean;
  /** Display avatar for the other party (DM / group DM) */
  otherPartyName?: string;
  otherPartyAvatarUrl?: string | null;
}

function formatTs(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function ConversationRow({
  conversation: conv,
  isActive,
  onSelect,
  onMute,
  onMore,
  isOnline,
  otherPartyName,
  otherPartyAvatarUrl,
}: ConversationRowProps) {
  const isDM = conv.kind === 'dm' || conv.kind === 'group_dm';
  const isChannel = conv.kind === 'channel' || conv.kind === 'custom_channel';
  const isTicket = conv.kind === 'ticket';
  const hasUnread = conv.unreadCount > 0;

  return (
    <button
      className={[
        'c-sb-row',
        conv.isMuted ? 'c-sb-row--muted' : '',
        conv.isArchived ? 'c-sb-row--archived' : '',
      ].filter(Boolean).join(' ')}
      onClick={() => onSelect(conv.id)}
      aria-current={isActive ? 'page' : undefined}
      data-unread={hasUnread ? 'true' : 'false'}
      data-unread-count={hasUnread ? (conv.unreadCount > 99 ? '99+' : String(conv.unreadCount)) : ''}
    >
      {/* Icon / avatar slot */}
      <div className={`c-sb-row__icon${isChannel ? ' c-sb-row__icon--hash' : ''}`}>
        {isDM && (
          <div style={{ position: 'relative' }}>
            <Avatar
              src={otherPartyAvatarUrl ?? undefined}
              name={otherPartyName ?? conv.title}
              size="xsmall"
            />
            {isOnline !== undefined && (
              <span className={`c-presence${isOnline ? ' c-presence--on' : ''}`} aria-hidden="true" />
            )}
          </div>
        )}
        {isChannel && <HashIcon />}
        {isTicket && conv.ticketType && (
          <JiraIssueTypeIcon type={conv.ticketType} size={16} />
        )}
        {isTicket && !conv.ticketType && <HashIcon />}
      </div>

      {/* Title + preview */}
      <div className="c-sb-row__main">
        <div className="c-sb-row__title">
          {conv.title}
          {conv.isMuted && (
            <span className="c-sb-row__mutedic" aria-label="Muted">
              <MuteIcon />
            </span>
          )}
        </div>
        {conv.lastMessagePreview && (
          <div className="c-sb-row__preview">{conv.lastMessagePreview}</div>
        )}
      </div>

      {/* Meta: timestamp + badge (hidden on hover, replaced by actions) */}
      <div className="c-sb-row__meta">
        {conv.lastMessageAt && (
          <span className="c-sb-row__ts">{formatTs(conv.lastMessageAt)}</span>
        )}
        {hasUnread && (
          <span className="c-sb-row__badge">
            {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
          </span>
        )}
      </div>

      {/* Hover actions (shown on hover, replaces meta) */}
      <div className="c-sb-row__actions">
        {onMute && (
          <button
            aria-label={conv.isMuted ? 'Unmute conversation' : 'Mute conversation'}
            onClick={e => { e.stopPropagation(); onMute(conv.id); }}
          >
            <MuteIcon />
          </button>
        )}
        {onMore && (
          <button
            aria-label="More options"
            onClick={e => { e.stopPropagation(); onMore(conv.id); }}
          >
            <MoreIcon />
          </button>
        )}
      </div>
    </button>
  );
}
