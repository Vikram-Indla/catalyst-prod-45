/**
 * ConversationHeader — top bar of the active conversation pane: ticket type
 * icon + key + title, an overlapping member avatar stack with presence dots,
 * the static-rainbow "Ask Caty — summarize" CTA, and an overflow menu.
 *
 * The Ask Caty button uses the approved STATIC rainbow border
 * (animation: none, 2px padding wrapper) per CLAUDE.md enterprise carve-out.
 */
import React, { useState } from 'react';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import type { ChatConversation, ChatPerson } from '@/types/chat';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { Avatar, colorFor, initialsOf, type PresenceColor } from './avatar';
import {
  useChatArchive,
  useChatUnarchive,
  useChatSetMute,
  useChatLeave,
  useChatMarkRead,
} from '@/hooks/chat/useChatActions';
import { AddPeopleModal } from './AddPeopleModal';

export interface ConversationHeaderProps {
  conversation: ChatConversation | null;
  members?: ChatPerson[];
  onAskCaty?: () => void;
}

const PRESENCE_MAP: Record<string, PresenceColor> = {
  available: 'green',
  busy: 'red',
  away: 'amber',
  offline: 'grey',
  on_leave: 'grey',
};

const MAX_VISIBLE_MEMBERS = 4;

export function ConversationHeader({ conversation, members = [], onAskCaty }: ConversationHeaderProps) {
  const [addOpen, setAddOpen] = useState(false);
  const archive = useChatArchive();
  const unarchive = useChatUnarchive();
  const mute = useChatSetMute();
  const leave = useChatLeave();
  const markRead = useChatMarkRead();

  if (!conversation) {
    return (
      <div className="cc-conv-head">
        <div className="cc-conv-title">
          <span className="cc-conv-title__s">No conversation selected</span>
        </div>
      </div>
    );
  }

  const visible = members.slice(0, MAX_VISIBLE_MEMBERS);
  const overflow = members.length - visible.length;
  const isTicket = conversation.kind === 'ticket';
  const isChannel = conversation.kind === 'channel';
  const isDm = conversation.kind === 'dm';
  const summarizeLabel = isTicket ? 'Ask Caty — summarize' : 'Ask Caty';

  const glyph = isTicket ? (
    <span className="cc-typesq cc-conv-head__typesq">
      <JiraIssueTypeIcon type="Story" size={12} />
    </span>
  ) : isChannel ? (
    <span
      className="cc-conv-head__typesq"
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        background: 'var(--ds-background-accent-purple-bolder, #6E5DC6)',
        color: 'var(--ds-text-inverse, #FFFFFF)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 14,
      }}
    >#</span>
  ) : (
    <Avatar name={conversation.title} seed={conversation.id} />
  );

  const titleText = isChannel
    ? `#${conversation.title.replace(/^#\s*/, '')}`
    : conversation.title;

  return (
    <div className="cc-conv-head">
      {glyph}
      <div className="cc-conv-title">
        {conversation.ticketKey ? (
          <span className="cc-conv-title__k">{conversation.ticketKey}</span>
        ) : null}
        <span className="cc-conv-title__s">
          {conversation.ticketKey ? ` · ${conversation.title}` : titleText}
        </span>
      </div>

      <div className="cc-conv-head__spacer" />

      {visible.length ? (
        <div className="cc-memberstack" aria-label={`${members.length} members`}>
          {visible.map(m => (
            <Avatar
              key={m.id}
              name={m.name}
              seed={m.id}
              color={colorFor(m.id)}
              presence={PRESENCE_MAP[m.presence] ?? null}
            />
          ))}
          {overflow > 0 ? <div className="cc-memberstack__plus">+{overflow}</div> : null}
        </div>
      ) : null}

      {!isDm && (
        <button type="button" className="cc-caty-btn" onClick={onAskCaty} aria-label={summarizeLabel}>
          <span className="cc-caty-btn__inner">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--ds-icon-discovery, #6E5DC6)" strokeWidth={2}>
              <path d="M12 3l1.9 5.8L20 10l-5.1 1.9L12 18l-1.9-6.1L5 10l5.1-1.2z" />
            </svg>
            {summarizeLabel}
          </span>
        </button>
      )}

      <DropdownMenu
        trigger={({ triggerRef, ...props }) => (
          <button
            type="button"
            className="cc-iconbtn"
            aria-label="Conversation actions"
            ref={triggerRef as React.Ref<HTMLButtonElement>}
            {...props}
          >
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.2}>
              <circle cx="5" cy="12" r="1.4" />
              <circle cx="12" cy="12" r="1.4" />
              <circle cx="19" cy="12" r="1.4" />
            </svg>
          </button>
        )}
        placement="bottom-end"
      >
        <DropdownItemGroup>
          {isTicket && conversation.ticketKey && (
            <DropdownItem onClick={() => {
              window.dispatchEvent(new CustomEvent('catalyst:open-issue', {
                detail: { issueKey: conversation.ticketKey },
              }));
            }}>View ticket</DropdownItem>
          )}
          {!isDm && (
            <DropdownItem onClick={() => setAddOpen(true)}>Add people</DropdownItem>
          )}
          <DropdownItem onClick={() => markRead.mutate(conversation.id)}>
            Mark as read
          </DropdownItem>
          <DropdownItem onClick={() =>
            mute.mutate({ convId: conversation.id, muted: true })
          }>
            Mute conversation
          </DropdownItem>
          {!conversation.isArchived ? (
            <DropdownItem onClick={() => archive.mutate(conversation.id)}>
              Archive conversation
            </DropdownItem>
          ) : (
            <DropdownItem onClick={() => unarchive.mutate(conversation.id)}>
              Unarchive conversation
            </DropdownItem>
          )}
        </DropdownItemGroup>
        {!isDm && (
          <DropdownItemGroup>
            <DropdownItem onClick={() => leave.mutate(conversation.id)}>
              <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>Leave conversation</span>
            </DropdownItem>
          </DropdownItemGroup>
        )}
      </DropdownMenu>
      {addOpen && (
        <AddPeopleModal
          conversationId={conversation.id}
          isOpen={addOpen}
          onClose={() => setAddOpen(false)}
          excludeProfileIds={members.map((m) => m.id)}
        />
      )}
    </div>
  );
}

// Re-exported for callers needing a single avatar token from a name only.
export { initialsOf };

export default ConversationHeader;
