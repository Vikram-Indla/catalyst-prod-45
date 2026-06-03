/**
 * ConversationList — 300px middle pane. Groups conversations from
 * useConversations() into Channels / Tickets / Direct messages /
 * Archived sections (matching the Slack-style mockup). Renders real
 * data; falls back to graceful empty states per section.
 */
import React, { useMemo, useState } from 'react';
import type { ChatConversation } from '@/types/chat';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { Avatar, type PresenceColor } from './avatar';

export interface ConversationListProps {
  conversations: ChatConversation[];
  isLoading?: boolean;
  activeConversationId?: string;
  onSelectConversation?: (id: string) => void;
}

// Deterministic presence dot for DMs derived from the conversation id so a
// person always reads the same presence colour across renders.
const PRESENCE_CYCLE: PresenceColor[] = ['green', 'red', 'amber', 'grey'];
function presenceFor(seed: string): PresenceColor {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PRESENCE_CYCLE[hash % PRESENCE_CYCLE.length];
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      {open ? <polyline points="6 9 12 15 18 9" /> : <polyline points="9 18 15 12 9 6" />}
    </svg>
  );
}

function SectionHeader({
  label,
  open,
  onToggle,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" className="cc-sect" onClick={onToggle} aria-expanded={open}>
      <Chevron open={open} />
      <span className="cc-sect__h">{label}</span>
    </button>
  );
}

export function ConversationList({
  conversations,
  isLoading,
  activeConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const [open, setOpen] = useState({
    channels: true,
    tickets: true,
    dms: true,
    archived: false,
  });

  const { channels, tickets, dms, archived } = useMemo(() => {
    const acc = {
      channels: [] as ChatConversation[],
      tickets: [] as ChatConversation[],
      dms: [] as ChatConversation[],
      archived: [] as ChatConversation[],
    };
    for (const c of conversations) {
      if (c.isArchived) {
        acc.archived.push(c);
        continue;
      }
      if (c.kind === 'channel') acc.channels.push(c);
      else if (c.kind === 'ticket') acc.tickets.push(c);
      else acc.dms.push(c);
    }
    return acc;
  }, [conversations]);

  const isActive = (id: string) => id === activeConversationId;
  const select = (id: string) => onSelectConversation?.(id);

  return (
    <div className="cc-convlist">
      <div className="cc-cl-head">
        <div className="cc-cl-head__ttl">Messages</div>
        <button type="button" className="cc-iconbtn" aria-label="New message">
          <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
          </svg>
        </button>
      </div>

      <div className="cc-cl-search">
        <div className="cc-cl-search__inp">
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.5" y2="16.5" />
          </svg>
          <span>Search conversations</span>
        </div>
      </div>

      <div className="cc-cl-scroll">
        {isLoading ? (
          <div className="cc-empty">Loading conversations…</div>
        ) : null}

        {/* Channels */}
        <SectionHeader
          label="Channels"
          open={open.channels}
          onToggle={() => setOpen(o => ({ ...o, channels: !o.channels }))}
        />
        {open.channels &&
          (channels.length ? (
            channels.map(c => (
              <button
                key={c.id}
                type="button"
                className={`cc-row${isActive(c.id) ? ' is-active' : ''}`}
                onClick={() => select(c.id)}
              >
                <span className={`cc-ch-name${c.unreadCount > 0 ? ' is-unread' : ''}`}>
                  # {c.title.replace(/^#\s*/, '')}
                </span>
                <div className="cc-row__grow" />
                {c.unreadCount > 0 ? <span className="cc-badge">{c.unreadCount}</span> : null}
              </button>
            ))
          ) : (
            !isLoading && <div className="cc-empty">No channels yet</div>
          ))}

        {/* Tickets */}
        <SectionHeader
          label="Tickets"
          open={open.tickets}
          onToggle={() => setOpen(o => ({ ...o, tickets: !o.tickets }))}
        />
        {open.tickets &&
          (tickets.length ? (
            tickets.map(c => (
              <button
                key={c.id}
                type="button"
                className={`cc-row${isActive(c.id) ? ' is-active' : ''}`}
                onClick={() => select(c.id)}
              >
                <span className="cc-typesq">
                  <JiraIssueTypeIcon type="Story" size={11} />
                </span>
                <div className="cc-row__grow">
                  {isActive(c.id) ? (
                    <>
                      <div className="cc-ticket-key">{c.ticketKey ?? c.title}</div>
                      <div className="cc-ticket-sub">{c.title}</div>
                      {c.lastMessagePreview ? (
                        <div className="cc-typing">{c.lastMessagePreview}</div>
                      ) : null}
                    </>
                  ) : (
                    <div className="cc-ticket-sub" style={{ color: 'var(--ds-text, #172B4D)' }}>
                      <strong style={{ fontWeight: 600 }}>{c.ticketKey ?? ''}</strong>
                      {c.ticketKey ? ' · ' : ''}
                      {c.title}
                    </div>
                  )}
                </div>
                {!isActive(c.id) && c.unreadCount > 0 ? (
                  <span className="cc-badge">{c.unreadCount}</span>
                ) : null}
              </button>
            ))
          ) : (
            !isLoading && <div className="cc-empty">No ticket conversations</div>
          ))}

        {/* Direct messages */}
        <SectionHeader
          label="Direct messages"
          open={open.dms}
          onToggle={() => setOpen(o => ({ ...o, dms: !o.dms }))}
        />
        {open.dms &&
          (dms.length ? (
            dms.map(c => (
              <button
                key={c.id}
                type="button"
                className={`cc-row${isActive(c.id) ? ' is-active' : ''}`}
                onClick={() => select(c.id)}
              >
                <Avatar
                  name={c.title}
                  seed={c.id}
                  className="cc-dmav"
                  presence={presenceFor(c.id)}
                />
                <div className="cc-row__grow">
                  <div className="cc-name-row">
                    <span className="cc-nm">{c.title}</span>
                    {c.lastMessageAt ? (
                      <span className="cc-ts">{formatRelative(c.lastMessageAt)}</span>
                    ) : null}
                  </div>
                  <div className="cc-preview">{c.lastMessagePreview ?? 'No messages yet'}</div>
                </div>
                {c.unreadCount > 0 ? <span className="cc-badge">{c.unreadCount}</span> : null}
              </button>
            ))
          ) : (
            !isLoading && <div className="cc-empty">No direct messages</div>
          ))}

        {/* Archived */}
        <SectionHeader
          label="Archived"
          open={open.archived}
          onToggle={() => setOpen(o => ({ ...o, archived: !o.archived }))}
        />
        {open.archived &&
          (archived.length ? (
            archived.map(c => (
              <button
                key={c.id}
                type="button"
                className={`cc-row is-archived${isActive(c.id) ? ' is-active' : ''}`}
                onClick={() => select(c.id)}
              >
                <span className="cc-preview" style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>
                  {c.ticketKey ? `${c.ticketKey} · ` : ''}
                  {c.title}
                </span>
              </button>
            ))
          ) : (
            <div className="cc-row is-archived">
              <span className="cc-preview" style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>
                No archived conversations
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'Yesterday';
  return `${day}d`;
}

export default ConversationList;
