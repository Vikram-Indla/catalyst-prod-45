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
import { AddPeopleModal } from '../AddPeopleModal';
import { useArchiveConversation } from '@/hooks/chat/useArchiveConversation';
import { Avatar, colorFor, initialsOf, type PresenceColor } from './avatar';

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
  const [addPeopleOpen, setAddPeopleOpen] = useState(false);
  const { setArchived } = useArchiveConversation();

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
  const summarizeLabel = conversation.kind === 'ticket' ? 'Ask Caty — summarize' : 'Ask Caty';

  return (
    <div className="cc-conv-head">
      <span className="cc-typesq cc-conv-head__typesq">
        <JiraIssueTypeIcon type="Story" size={12} />
      </span>
      <div className="cc-conv-title">
        {conversation.ticketKey ? (
          <span className="cc-conv-title__k">{conversation.ticketKey}</span>
        ) : null}
        <span className="cc-conv-title__s">
          {conversation.ticketKey ? ` · ${conversation.title}` : conversation.title}
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

      <button type="button" className="cc-caty-btn" onClick={onAskCaty} aria-label={summarizeLabel}>
        <span className="cc-caty-btn__inner">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--ds-icon-discovery, #6E5DC6)" strokeWidth={2}>
            <path d="M12 3l1.9 5.8L20 10l-5.1 1.9L12 18l-1.9-6.1L5 10l5.1-1.2z" />
          </svg>
          {summarizeLabel}
        </span>
      </button>

      <DropdownMenu
        trigger={({ triggerRef, isSelected: _isSelected, testId, ...props }) => (
          <button
            type="button"
            className="cc-iconbtn"
            aria-label="Conversation actions"
            data-testid={testId}
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
          <DropdownItem>View ticket</DropdownItem>
          <DropdownItem onClick={() => setAddPeopleOpen(true)}>Add people</DropdownItem>
          <DropdownItem onClick={() => void setArchived(conversation.id, !conversation.isArchived)}>
            {conversation.isArchived ? 'Unarchive conversation' : 'Archive conversation'}
          </DropdownItem>
          <DropdownItem>Mute conversation</DropdownItem>
        </DropdownItemGroup>
        <DropdownItemGroup>
          <DropdownItem>
            <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>Leave conversation</span>
          </DropdownItem>
        </DropdownItemGroup>
      </DropdownMenu>

      {addPeopleOpen ? (
        <AddPeopleModal
          isOpen={addPeopleOpen}
          conversationId={conversation.id}
          existingMemberIds={members.map(m => m.id)}
          onClose={() => setAddPeopleOpen(false)}
        />
      ) : null}
    </div>
  );
}

// Re-exported for callers needing a single avatar token from a name only.
export { initialsOf };

export default ConversationHeader;
