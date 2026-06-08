/**
 * MessageStream — the scrollable message list of the active conversation.
 * Renders date dividers (Today / Yesterday / dated), per-message rows with
 * initials avatars, reaction chips, highlighted @mention tokens, and the
 * "N replies" thread affordance. Reads real ChatMessage[] from useMessages.
 */
import React, { useMemo, useState, lazy, Suspense } from 'react';
import type { ChatMessage } from '@/types/chat';
import { Avatar, initialsOf, colorFor } from './avatar';
import { useConversationAttachments, type ChatAttachment } from '@/hooks/chat/useChatAttachments';
import { AttachmentPreview } from './AttachmentPreview';
import { LinkUnfurl } from './LinkUnfurl';

// Lazy renderer — Atlaskit @atlaskit/renderer chunk only loads when a
// message actually has body_adf content.
const EpicDescriptionRenderer = lazy(
  () => import('@/components/shared/rich-text/atlaskit/EpicDescriptionRenderer'),
);

function isAdfPresent(adf: unknown): adf is { type: string; content?: unknown[] } {
  if (!adf || typeof adf !== 'object') return false;
  const o = adf as { type?: unknown; content?: unknown };
  if (o.type !== 'doc') return false;
  return Array.isArray(o.content) && (o.content as unknown[]).length > 0;
}

const QUICK_REACTIONS = ['👍', '❤️', '😄', '🎉', '👀', '🙏'];

export interface MessageStreamProps {
  conversationId?: string | null;
  messages: ChatMessage[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onOpenThread?: (messageId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string, bodyText: string) => void;
  onDelete?: (messageId: string) => void;
  currentUserId?: string | null;
}

// Highlight @mention tokens (e.g. "@Yazeed Daraz") + broadcast tokens
// (@here / @channel / @everyone) inside body text. Broadcast tokens use
// a stronger background to signal scope.
const BROADCAST_RE = /(@here|@channel|@everyone)\b/g;
const MENTION_RE = /(@[A-Za-z][A-Za-z .'-]*)/g;

function renderBody(text: string): React.ReactNode[] {
  // Split on broadcast tokens first so they aren't swallowed by MENTION_RE.
  const broadcastParts = text.split(BROADCAST_RE);
  const out: React.ReactNode[] = [];
  broadcastParts.forEach((part, i) => {
    if (BROADCAST_RE.test(part)) {
      out.push(
        <span
          key={`b-${i}`}
          className="cc-mention"
          style={{
            background: 'var(--ds-background-warning, #FFF7D6)',
            color: 'var(--ds-text-warning-inverse, #533F04)',
            fontWeight: 600,
            padding: '0 4px',
            borderRadius: 3,
          }}
        >
          {part}
        </span>,
      );
      return;
    }
    const subParts = part.split(MENTION_RE);
    subParts.forEach((sub, j) => {
      if (MENTION_RE.test(sub)) {
        out.push(
          <span key={`m-${i}-${j}`} className="cc-mention">
            {sub}
          </span>,
        );
      } else {
        out.push(<React.Fragment key={`t-${i}-${j}`}>{sub}</React.Fragment>);
      }
    });
  });
  return out;
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
  conversationId,
  messages,
  isLoading,
  hasMore,
  onLoadMore,
  onOpenThread,
  onToggleReaction,
  onEdit,
  onDelete,
  currentUserId,
}: MessageStreamProps) {
  // Pull attachments for the active conversation in a single batched query and
  // index them by message_id so each MessageRow can render its own previews
  // without N+1 round-trips.
  const { data: attachmentRows } = useConversationAttachments(conversationId ?? null);
  const attachmentsByMessage = useMemo(() => {
    const map = new Map<string, ChatAttachment[]>();
    (attachmentRows ?? []).forEach((a) => {
      const list = map.get(a.messageId) ?? [];
      list.push(a);
      map.set(a.messageId, list);
    });
    return map;
  }, [attachmentRows]);
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
            attachments={attachmentsByMessage.get(row.msg.id) ?? []}
            onOpenThread={onOpenThread}
            onToggleReaction={onToggleReaction}
            onEdit={onEdit}
            onDelete={onDelete}
            isOwn={!!currentUserId && row.msg.authorId === currentUserId}
          />
        ),
      )}
    </div>
  );
}

function MessageRow({
  msg,
  attachments,
  onOpenThread,
  onToggleReaction,
  onEdit,
  onDelete,
  isOwn,
}: {
  msg: ChatMessage;
  attachments?: ChatAttachment[];
  onOpenThread?: (id: string) => void;
  onToggleReaction?: (id: string, emoji: string) => void;
  onEdit?: (id: string, body: string) => void;
  onDelete?: (id: string) => void;
  isOwn?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(msg.bodyText);
  const [showReactPicker, setShowReactPicker] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const commitEdit = () => {
    if (editValue.trim() && editValue !== msg.bodyText) {
      onEdit?.(msg.id, editValue.trim());
    }
    setEditing(false);
  };

  return (
    <div className="cc-msg cc-msg--row">
      <Avatar name={msg.authorName} seed={msg.authorId} color={colorFor(msg.authorId)} className="cc-msg__av" />
      <div className="cc-msg__body">
        <div className="cc-msg__head">
          <span className="cc-msg__name">{msg.authorName}</span>
          <span className="cc-msg__time">{timeLabel(msg.createdAt)}</span>
          {msg.editedAt && <span className="cc-msg__edited">(edited)</span>}
        </div>

        {editing ? (
          <div className="cc-msg__editor">
            <textarea
              autoFocus
              className="cc-msg__editor-input"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditing(false);
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commitEdit();
              }}
            />
            <div className="cc-msg__editor-row">
              <span className="cc-msg__editor-hint">⌘+Enter save · Esc cancel</span>
              <button type="button" className="cc-msg__editor-cancel" onClick={() => setEditing(false)}>Cancel</button>
              <button type="button" className="cc-msg__editor-save" onClick={commitEdit}>Save</button>
            </div>
          </div>
        ) : isAdfPresent(msg.bodyAdf) ? (
          <div className="cc-msg__text">
            <Suspense fallback={<span>{renderBody(msg.bodyText)}</span>}>
              <EpicDescriptionRenderer content={msg.bodyAdf as any} />
            </Suspense>
          </div>
        ) : (
          <div className="cc-msg__text">{renderBody(msg.bodyText)}</div>
        )}

        {attachments && attachments.length > 0 && (
          <AttachmentPreview attachments={attachments} />
        )}

        {/* Link unfurl cards — rendered for every URL detected in body_text. */}
        {!editing && msg.bodyText && <LinkUnfurl bodyText={msg.bodyText} />}

        {/* Hover toolbar */}
        {!editing && (
          <div className="cc-msg__toolbar" role="toolbar">
            <button
              type="button"
              className="cc-msg__tool"
              aria-label="React"
              title="React"
              onClick={() => { setShowReactPicker((s) => !s); setShowMore(false); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </button>
            <button
              type="button"
              className="cc-msg__tool"
              aria-label="Reply in thread"
              title="Reply in thread"
              onClick={() => onOpenThread?.(msg.id)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
              </svg>
            </button>
            <button
              type="button"
              className="cc-msg__tool"
              aria-label="More"
              title="More"
              onClick={() => { setShowMore((s) => !s); setShowReactPicker(false); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                <circle cx="5" cy="12" r="1.4" />
                <circle cx="12" cy="12" r="1.4" />
                <circle cx="19" cy="12" r="1.4" />
              </svg>
            </button>

            {showReactPicker && (
              <div className="cc-msg__reactpicker">
                {QUICK_REACTIONS.map((emo) => (
                  <button
                    key={emo}
                    type="button"
                    className="cc-msg__reactpicker-btn"
                    onClick={() => { onToggleReaction?.(msg.id, emo); setShowReactPicker(false); }}
                  >
                    {emo}
                  </button>
                ))}
              </div>
            )}

            {showMore && (
              <div className="cc-msg__moremenu">
                <button type="button" className="cc-msg__moremenu-item" onClick={() => { navigator.clipboard?.writeText(msg.bodyText); setShowMore(false); }}>
                  Copy text
                </button>
                {isOwn && (
                  <button type="button" className="cc-msg__moremenu-item" onClick={() => { setEditValue(msg.bodyText); setEditing(true); setShowMore(false); }}>
                    Edit
                  </button>
                )}
                {isOwn && (
                  <button type="button" className="cc-msg__moremenu-item cc-msg__moremenu-item--danger" onClick={() => { onDelete?.(msg.id); setShowMore(false); }}>
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}

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
