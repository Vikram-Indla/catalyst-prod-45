/**
 * MessageStream — the scrollable message list of the active conversation.
 * Renders date dividers (Today / Yesterday / dated), per-message rows with
 * initials avatars, reaction chips, highlighted @mention tokens, and the
 * "N replies" thread affordance. Reads real ChatMessage[] from useMessages.
 */
import React, { useMemo } from 'react';
import type { ChatMessage } from '@/types/chat';
import { Avatar, initialsOf, colorFor } from './avatar';

export interface MessageStreamProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onOpenThread?: (messageId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
}

// Highlight @mention tokens (e.g. "@Yazeed Daraz") inside body text.
const MENTION_RE = /(@[A-Za-z][A-Za-z .'-]*)/g;

function renderBody(text: string): React.ReactNode[] {
  const parts = text.split(MENTION_RE);
  return parts.map((part, i) =>
    MENTION_RE.test(part) ? (
      <span key={i} className="cc-mention">
        {part}
      </span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dividerLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today.toISOString())) return 'Today';
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function relativeLabel(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const min = Math.floor((Date.now() - then) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function MessageStream({
  messages,
  isLoading,
  hasMore,
  onLoadMore,
  onOpenThread,
  onToggleReaction,
}: MessageStreamProps) {
  // Top-level messages only; group consecutive runs under a date divider.
  const rows = useMemo(() => {
    const top = messages.filter(m => !m.parentId && !m.deletedAt);
    const out: Array<{ type: 'divider'; label: string; key: string } | { type: 'msg'; msg: ChatMessage }> = [];
    let lastDay = '';
    for (const m of top) {
      const dk = dayKey(m.createdAt);
      if (dk !== lastDay) {
        out.push({ type: 'divider', label: dividerLabel(m.createdAt), key: `d-${dk}` });
        lastDay = dk;
      }
      out.push({ type: 'msg', msg: m });
    }
    return out;
  }, [messages]);

  if (!isLoading && rows.length === 0) {
    return (
      <div className="cc-conv-stream">
        <div className="cc-stream-empty">
          No messages yet — start the conversation below.
        </div>
      </div>
    );
  }

  return (
    <div className="cc-conv-stream">
      {hasMore ? (
        <div className="cc-divider">
          <div className="cc-divider__rule" />
          <button
            type="button"
            className="cc-divider__pill"
            style={{ cursor: 'pointer' }}
            onClick={onLoadMore}
          >
            Load earlier messages
          </button>
          <div className="cc-divider__rule" />
        </div>
      ) : null}

      {isLoading && rows.length === 0 ? <div className="cc-empty">Loading messages…</div> : null}

      {rows.map(row =>
        row.type === 'divider' ? (
          <div className="cc-divider" key={row.key}>
            <div className="cc-divider__rule" />
            <div className="cc-divider__pill">{row.label}</div>
            <div className="cc-divider__rule" />
          </div>
        ) : (
          <MessageRow
            key={row.msg.id}
            msg={row.msg}
            onOpenThread={onOpenThread}
            onToggleReaction={onToggleReaction}
          />
        ),
      )}
    </div>
  );
}

function MessageRow({
  msg,
  onOpenThread,
  onToggleReaction,
}: {
  msg: ChatMessage;
  onOpenThread?: (id: string) => void;
  onToggleReaction?: (id: string, emoji: string) => void;
}) {
  return (
    <div className="cc-msg">
      <Avatar name={msg.authorName} seed={msg.authorId} color={colorFor(msg.authorId)} className="cc-msg__av" />
      <div className="cc-msg__body">
        <div className="cc-msg__head">
          <span className="cc-msg__name">{msg.authorName}</span>
          <span className="cc-msg__time">{timeLabel(msg.createdAt)}</span>
        </div>
        <div className="cc-msg__text">{renderBody(msg.bodyText)}</div>

        {msg.reactions.length ? (
          <div className="cc-reacts">
            {msg.reactions.map(r => (
              <button
                key={r.emoji}
                type="button"
                className={`cc-react${r.reactedByMe ? ' is-mine' : ''}`}
                onClick={() => onToggleReaction?.(msg.id, r.emoji)}
                aria-pressed={r.reactedByMe}
              >
                {r.emoji} {r.count}
              </button>
            ))}
          </div>
        ) : null}

        {msg.replyCount > 0 ? (
          <button type="button" className="cc-thread" onClick={() => onOpenThread?.(msg.id)}>
            <div className="cc-thread__stack">
              <Avatar name={msg.authorName} seed={`${msg.id}-a`} color={colorFor(`${msg.id}-a`)} />
              <Avatar name={msg.authorName} seed={`${msg.id}-b`} color={colorFor(`${msg.id}-b`)} />
            </div>
            <span className="cc-thread__link">
              {msg.replyCount} {msg.replyCount === 1 ? 'reply' : 'replies'}
            </span>
            <span className="cc-thread__last">Last reply {relativeLabel(msg.createdAt)}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export { initialsOf };
export default MessageStream;
