import React from 'react';
import Badge from '@atlaskit/badge';
import { PresenceAvatar } from '../shared/PresenceAvatar';
import { ProjectIcon } from '@/components/shared/ProjectIcon';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { HeadphonesIcon } from '../shared/Icon';
import type { ChatConversation } from '@/types/chat';
import { formatRowTimestamp } from '../../lib/formatTimestamp';

interface ConversationRowProps {
  conversation: ChatConversation;
  isActive: boolean;
  onClick: () => void;
  presence?: 'online' | 'offline' | 'away' | null;
  hasHuddle?: boolean;
}

export function ConversationRow({
  conversation,
  isActive,
  onClick,
  presence = null,
  hasHuddle = false,
}: ConversationRowProps) {
  const { title, lastMessageAt, unreadCount, kind, memberCount, projectKey, ticketType } = conversation;
  const hasUnread = unreadCount > 0;
  // Group DM avatars match Slack: a square showing the OTHER-member count
  // instead of name initials. Skip the override when memberCount is unknown
  // (0/null) so we fall back to initials rather than rendering a literal "0".
  const groupLabel =
    kind === 'group_dm' && typeof memberCount === 'number' && memberCount > 0
      ? String(memberCount)
      : undefined;

  // Leading visual by kind — canonical components only. Projects use the real
  // ProjectIcon (brand avatar by key), work items use JiraIssueTypeIcon (real
  // type, no fallback), people use the avatar primitive. Never name-initials
  // for projects/tickets (CLAUDE.md reuse-first + locked icon registry).
  let leadingVisual: React.ReactNode;
  if (kind === 'ticket' && ticketType) {
    leadingVisual = (
      <span style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
        <JiraIssueTypeIcon type={ticketType} size={16} />
      </span>
    );
  } else if (kind === 'channel' && projectKey) {
    leadingVisual = <ProjectIcon projectKey={projectKey} size="small" name={title} />;
  } else {
    leadingVisual = (
      <PresenceAvatar name={title} size={20} presence={presence} displayLabel={groupLabel} />
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      data-cv2-active={isActive || undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '4px 16px',
        background: isActive ? 'var(--cv2-bg-row-active)' : 'transparent',
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background var(--cv2-transition-fast)',
        position: 'relative',
        ...(hasHuddle ? { boxShadow: 'inset 3px 0 0 0 var(--ds-icon-success)' } : null),
      }}
      onMouseEnter={e => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }
      }}
    >
      {leadingVisual}
      <span
        style={{
          fontFamily: 'var(--cv2-font)',
          fontSize: 'var(--cv2-fs-row-name)',
          fontWeight: hasUnread ? 700 : 500,
          color: 'var(--cv2-text-strong)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
          flex: 1,
        }}
      >
        {title}
      </span>
      {hasHuddle && (
        <span aria-label="Active huddle" title="Active huddle" style={{ marginLeft: 4, color: 'var(--ds-icon-success)', display: 'inline-flex', flex: '0 0 auto' }}>
          <HeadphonesIcon size={12} />
        </span>
      )}
      {hasUnread && (
        <span aria-label={`${unreadCount} unread`} style={{ flex: '0 0 auto' }}>
          <Badge appearance="important">{unreadCount}</Badge>
        </span>
      )}
      <span
        style={{
          fontFamily: 'var(--cv2-font)',
          fontSize: 'var(--cv2-fs-row-timestamp)',
          fontWeight: 400,
          color: hasUnread ? 'var(--cv2-text-strong)' : 'var(--cv2-text-muted)',
          flex: '0 0 auto',
        }}
      >
        {formatRowTimestamp(lastMessageAt)}
      </span>
    </button>
  );
}
