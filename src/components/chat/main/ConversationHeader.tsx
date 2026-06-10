/**
 * ConversationHeader — top bar of the active conversation pane: ticket type
 * icon + key + title, an overlapping member avatar stack with presence dots,
 * the static-rainbow "Ask Caty — summarize" CTA, and an overflow menu.
 *
 * The Ask Caty button uses the approved STATIC rainbow border
 * (animation: none, 2px padding wrapper) per CLAUDE.md enterprise carve-out.
 */
import React, { useEffect, useRef, useState } from 'react';
import type { ChatConversation, ChatPerson } from '@/types/chat';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { Avatar, colorFor, initialsOf, type PresenceColor } from './avatar';
import {
  useChatArchive,
  useChatUnarchive,
  useChatSetMute,
  useChatLeave,
  useChatMarkRead,
  useChatSetNotificationPref,
  useChatToggleStar,
} from '@/hooks/chat/useChatActions';
import { AddPeopleModal } from './AddPeopleModal';
import { RosterPanel } from './RosterPanel';
import ProjectIcon from '@/components/shared/ProjectIcon';

export interface ConversationHeaderProps {
  conversation: ChatConversation | null;
  members?: ChatPerson[];
  onAskCaty?: () => void;
  currentUserMuted?: boolean;
  currentUserStarred?: boolean;
}

const PRESENCE_MAP: Record<string, PresenceColor> = {
  available: 'green',
  busy: 'red',
  away: 'amber',
  offline: 'grey',
  on_leave: 'grey',
};

const MAX_VISIBLE_MEMBERS = 4;

function ConversationMenuItem({
  label,
  danger,
  onClick,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '6px 10px',
        background: 'transparent',
        border: 'none',
        borderRadius: 4,
        cursor: 'pointer',
        fontSize: 13,
        color: danger ? 'var(--ds-text-danger, #AE2A19)' : 'var(--ds-text, #172B4D)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      {label}
    </button>
  );
}

export function ConversationHeader({ conversation, members = [], onAskCaty, currentUserMuted = false, currentUserStarred = false }: ConversationHeaderProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement | null>(null);
  const archive = useChatArchive();
  const unarchive = useChatUnarchive();
  const mute = useChatSetMute();
  const toggleStar = useChatToggleStar();
  const leave = useChatLeave();
  const markRead = useChatMarkRead();
  const setNotifPref = useChatSetNotificationPref();

  // Self-rolled click-outside for the kebab menu. The previous
  // @atlaskit/dropdown-menu lost positioning when mounted inside the
  // dock's position:fixed container — popper computed (0,0) and the menu
  // appeared at the top-left of the viewport. Self-rolling pins the menu
  // to the trigger via the relative wrapper.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t || !menuWrapRef.current) return;
      if (!menuWrapRef.current.contains(t)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [menuOpen]);

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
      <JiraIssueTypeIcon type={conversation.ticketType ?? 'Task'} size={12} />
    </span>
  ) : isChannel ? (
    <ProjectIcon projectKey={conversation.projectKey ?? ''} size="medium" />
  ) : (
    <Avatar name={conversation.title} seed={conversation.id} size={28} />
  );

  // Channels: show full project name (from ph_jira_projects.name), not the slug.
  // Sidebar can abbreviate; main panel always shows the full readable name.
  const channelDisplayName = conversation.projectName ?? conversation.title;
  const titleText = isChannel
    ? channelDisplayName
    : conversation.title;

  return (
    <div className="cc-conv-head">
      {glyph}
      <div className="cc-conv-title">
        {conversation.ticketKey ? (
          <span className="cc-conv-title__k">{conversation.ticketKey}</span>
        ) : null}
        <span className="cc-conv-title__s">
          {conversation.ticketKey
            ? // Title is stored as "KEY · summary" — the key chip already shows
              // the key, so strip the leading "KEY ·" to avoid "KEY · KEY · …".
              ` · ${conversation.title.replace(new RegExp(`^${conversation.ticketKey}\\s*[·:-]\\s*`), '')}`
            : titleText}
        </span>
      </div>

      {isChannel && members.length > 0 && (
        <button
          type="button"
          className="cc-membercount"
          aria-label={`${members.length} members — open roster`}
          onClick={() => setRosterOpen(true)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          {members.length}
        </button>
      )}

      <div className="cc-conv-head__spacer" />

      {visible.length ? (
        <button
          type="button"
          className="cc-memberstack"
          aria-label={`${members.length} members — open roster`}
          onClick={() => setRosterOpen(true)}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
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
        </button>
      ) : (
        <button
          type="button"
          aria-label="View members"
          onClick={() => setRosterOpen(true)}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '4px 8px',
            cursor: 'pointer',
            color: 'var(--ds-text-subtle, #44546F)',
            fontSize: 12,
          }}
        >
          View members
        </button>
      )}

      {/* Ask Caty REMOVED from header (2026-06-08 design-critique).
          Slack/Jira/ServiceNow have no persistent AI CTA in channel headers.
          On empty channels the button has nothing to summarize — dead
          affordance. Now lives as a contextual menu item below, enabled
          only when there are messages to act on. */}

      {/* Bell — mute toggle shortcut */}
      <button
        type="button"
        className="cc-iconbtn"
        aria-label={currentUserMuted ? 'Unmute notifications' : 'Mute notifications'}
        title={currentUserMuted ? 'Unmute notifications' : 'Mute notifications'}
        onClick={() => conversation && mute.mutate({ convId: conversation.id, muted: !currentUserMuted })}
        style={{ color: currentUserMuted ? 'var(--ds-text-subtlest, #6B778C)' : 'inherit', position: 'relative' }}
      >
        {currentUserMuted ? (
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
            <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
            <path d="M18 8a6 6 0 0 0-9.33-5" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        )}
      </button>

      {/* Huddle stub — #19 */}
      <button
        type="button"
        className="cc-iconbtn"
        aria-label="Start huddle (coming soon)"
        title="Huddle — coming soon"
        onClick={() => {
          alert('Huddles are coming soon to Catalyst Chat.');
        }}
      >
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.26 12 19.79 19.79 0 0 1 1.15 3.32 2 2 0 0 1 3.12 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.58a16 16 0 0 0 6 6l.36-.36a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 16.92z" />
        </svg>
      </button>

      <div
        ref={menuWrapRef}
        style={{ position: 'relative', display: 'inline-block' }}
      >
        <button
          type="button"
          className="cc-iconbtn"
          aria-label="Conversation actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.2}>
            <circle cx="5" cy="12" r="1.4" />
            <circle cx="12" cy="12" r="1.4" />
            <circle cx="19" cy="12" r="1.4" />
          </svg>
        </button>
        {menuOpen && (
          <div
            role="menu"
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              minWidth: 200,
              background: 'var(--ds-surface-overlay, #FFFFFF)',
              border: '1px solid var(--ds-border, #DFE1E6)',
              borderRadius: 6,
              boxShadow: '0 4px 12px rgba(9,30,66,0.15)',
              padding: 4,
              zIndex: 10000,
            }}
          >
            {!isDm && onAskCaty && (
              <ConversationMenuItem
                label="Summarize with Caty"
                onClick={() => { onAskCaty(); setMenuOpen(false); }}
              />
            )}
            {isTicket && conversation.ticketKey && (
              <ConversationMenuItem
                label="View ticket"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('catalyst:open-issue', {
                    detail: { issueKey: conversation.ticketKey },
                  }));
                  setMenuOpen(false);
                }}
              />
            )}
            {!isDm && (
              <ConversationMenuItem
                label="Add people"
                onClick={() => { setAddOpen(true); setMenuOpen(false); }}
              />
            )}
            <ConversationMenuItem
              label="Mark as read"
              onClick={() => { markRead.mutate(conversation.id); setMenuOpen(false); }}
            />
            <ConversationMenuItem
              label={currentUserStarred ? 'Unstar conversation' : 'Star conversation'}
              onClick={() => { toggleStar.mutate({ convId: conversation.id, starred: !currentUserStarred }); setMenuOpen(false); }}
            />
            <ConversationMenuItem
              label={currentUserMuted ? 'Unmute conversation' : 'Mute conversation'}
              onClick={() => { mute.mutate({ convId: conversation.id, muted: !currentUserMuted }); setMenuOpen(false); }}
            />
            <div style={{ height: 1, background: 'var(--ds-border, #DFE1E6)', margin: '4px 0' }} />
            <div style={{ padding: '4px 10px', fontSize: 11, color: 'var(--ds-text-subtle, #44546F)', textTransform: 'none' }}>
              Notify me about
            </div>
            <ConversationMenuItem
              label="All messages"
              onClick={() => { setNotifPref.mutate({ convId: conversation.id, pref: 'all' }); setMenuOpen(false); }}
            />
            <ConversationMenuItem
              label="Mentions only"
              onClick={() => { setNotifPref.mutate({ convId: conversation.id, pref: 'mentions' }); setMenuOpen(false); }}
            />
            <ConversationMenuItem
              label="Nothing"
              onClick={() => { setNotifPref.mutate({ convId: conversation.id, pref: 'none' }); setMenuOpen(false); }}
            />
            <div style={{ height: 1, background: 'var(--ds-border, #DFE1E6)', margin: '4px 0' }} />
            {!conversation.isArchived ? (
              <ConversationMenuItem
                label="Archive conversation"
                onClick={() => { archive.mutate(conversation.id); setMenuOpen(false); }}
              />
            ) : (
              <ConversationMenuItem
                label="Unarchive conversation"
                onClick={() => { unarchive.mutate(conversation.id); setMenuOpen(false); }}
              />
            )}
            {!isDm && (
              <>
                <div style={{ height: 1, background: 'var(--ds-border, #DFE1E6)', margin: '4px 0' }} />
                <ConversationMenuItem
                  label="Leave conversation"
                  danger
                  onClick={() => { leave.mutate(conversation.id); setMenuOpen(false); }}
                />
              </>
            )}
          </div>
        )}
      </div>
      {addOpen && (
        <AddPeopleModal
          conversationId={conversation.id}
          isOpen={addOpen}
          onClose={() => setAddOpen(false)}
        />
      )}
      {rosterOpen && (
        <RosterPanel
          conversationId={conversation.id}
          isOpen={rosterOpen}
          onClose={() => setRosterOpen(false)}
          onInvite={!isDm ? () => { setRosterOpen(false); setAddOpen(true); } : undefined}
        />
      )}
    </div>
  );
}

// Re-exported for callers needing a single avatar token from a name only.
export { initialsOf };

export default ConversationHeader;
