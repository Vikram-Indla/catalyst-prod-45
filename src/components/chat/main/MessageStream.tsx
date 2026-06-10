/**
 * MessageStream — the scrollable message list of the active conversation.
 * Renders date dividers (Today / Yesterday / dated), per-message rows with
 * initials avatars, reaction chips, highlighted @mention tokens, and the
 * "N replies" thread affordance. Reads real ChatMessage[] from useMessages.
 */
import React, { useMemo, useState, lazy, Suspense, useRef, useCallback } from 'react';
import type { ChatMessage } from '@/types/chat';
import { Avatar, initialsOf, colorFor } from './avatar';
import { useConversationAttachments, type ChatAttachment } from '@/hooks/chat/useChatAttachments';
import { AttachmentPreview } from './AttachmentPreview';
import { LinkUnfurl } from './LinkUnfurl';
import {
  useConversationPins,
  useTogglePin,
  useMyBookmarks,
  useToggleBookmark,
} from '@/hooks/chat/usePinsBookmarks';
import { useMessageReactions } from '@/hooks/chat/useMessageReactions';
import { MentionToken } from './MentionToken';
import { MessageActionsToolbar } from './MessageActionsToolbar';
import { ReactionPicker } from './ReactionPicker';
import { MessageReactions } from './MessageReactions';
import { MessageSearchPanel } from './MessageSearchPanel';
import { TicketKeyChip } from './TicketKeyChip';
import { useIssueRefs, type IssueRefMap } from '@/hooks/chat/useIssueRefs';
import { extractTicketKeys, splitByTicketKeys } from '@/lib/chat/ticket-refs';

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
  onMarkUnread?: (messageId: string) => Promise<void>;
  onSetReminder?: (messageId: string, minutesFromNow: number) => Promise<void>;
  onTurnIntoIssue?: (messageId: string, title: string, description: string, assigneeId?: string) => Promise<void>;
  currentUserId?: string | null;
}

// Highlight @mention tokens (e.g. "@Yazeed Daraz") + broadcast tokens
// (@here / @channel / @everyone) inside body text. Broadcast tokens use
// a stronger background to signal scope.
const BROADCAST_RE = /(@here|@channel|@everyone)\b/g;
const MENTION_RE = /(@[A-Za-z][A-Za-z .'-]*)/g;

function renderPlain(text: string, keyPrefix: string, issueRefs?: IssueRefMap): React.ReactNode[] {
  if (!issueRefs) return [<React.Fragment key={keyPrefix}>{text}</React.Fragment>];
  return splitByTicketKeys(text).map((seg, k) => {
    if (seg.type === 'key' && issueRefs[seg.value]) {
      const ref = issueRefs[seg.value];
      return (
        <TicketKeyChip
          key={`${keyPrefix}-k${k}`}
          issueKey={seg.value}
          issueType={ref.issueType}
          summary={ref.summary}
        />
      );
    }
    return <React.Fragment key={`${keyPrefix}-t${k}`}>{seg.value}</React.Fragment>;
  });
}

function renderBody(text: string, issueRefs?: IssueRefMap): React.ReactNode[] {
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
        out.push(<MentionToken key={`m-${i}-${j}`} raw={sub} />);
      } else {
        out.push(...renderPlain(sub, `t-${i}-${j}`, issueRefs));
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
  onMarkUnread,
  onSetReminder,
  onTurnIntoIssue,
  currentUserId,
}: MessageStreamProps) {
  // Ticket-key linkification: one batched ph_issues lookup per message list.
  const ticketKeys = useMemo(
    () => messages.flatMap((m) => extractTicketKeys(m.bodyText ?? '')),
    [messages],
  );
  const { data: issueRefs } = useIssueRefs(ticketKeys);

  // Message refs for scroll-to-message from search
  const messageRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const handleScrollToMessage = useCallback((messageId: string) => {
    const ref = messageRefs.current.get(messageId);
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
      ref.focus();
      // Flash highlight
      ref.style.background = 'var(--ds-background-selected, #e9f2fe)';
      setTimeout(() => {
        ref.style.background = '';
      }, 1500);
    }
  }, []);

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

  // Pins (channel-scoped) + bookmarks (per-user) batched per conv.
  const { data: pins } = useConversationPins(conversationId ?? null);
  const pinnedSet = useMemo(
    () => new Set((pins ?? []).map((p) => p.message_id)),
    [pins],
  );
  const { data: bookmarks } = useMyBookmarks();
  const bookmarkedSet = useMemo(
    () => new Set((bookmarks ?? []).map((b) => b.message_id)),
    [bookmarks],
  );
  const togglePin = useTogglePin();
  const toggleBookmark = useToggleBookmark();
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
        <MessageSearchPanel
          conversationId={conversationId}
          messages={messages}
          onScrollToMessage={handleScrollToMessage}
        />
        <div className="cc-stream-empty">
          No messages yet — start the conversation below.
        </div>
      </div>
    );
  }

  return (
    <div className="cc-conv-stream">
      <MessageSearchPanel
        conversationId={conversationId}
        messages={messages}
        onScrollToMessage={handleScrollToMessage}
      />
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
            ref={(ref) => {
              if (ref) {
                messageRefs.current.set(row.msg.id, ref);
              } else {
                messageRefs.current.delete(row.msg.id);
              }
            }}
            attachments={attachmentsByMessage.get(row.msg.id) ?? []}
            isPinned={pinnedSet.has(row.msg.id)}
            isBookmarked={bookmarkedSet.has(row.msg.id)}
            onTogglePin={() =>
              conversationId &&
              togglePin.mutate({
                conversationId,
                messageId: row.msg.id,
                currentlyPinned: pinnedSet.has(row.msg.id),
              })
            }
            onToggleBookmark={() =>
              conversationId &&
              toggleBookmark.mutate({
                conversationId,
                messageId: row.msg.id,
                currentlyBookmarked: bookmarkedSet.has(row.msg.id),
              })
            }
            onOpenThread={onOpenThread}
            onToggleReaction={onToggleReaction}
            onEdit={onEdit}
            onDelete={onDelete}
            onMarkUnread={onMarkUnread}
            onSetReminder={onSetReminder}
            onTurnIntoIssue={onTurnIntoIssue}
            conversationId={conversationId ?? ''}
            isOwn={!!currentUserId && row.msg.authorId === currentUserId}
          />
        ),
      )}
    </div>
  );
}

interface MessageRowProps {
  msg: ChatMessage;
  attachments?: ChatAttachment[];
  isPinned?: boolean;
  isBookmarked?: boolean;
  onTogglePin?: () => void;
  onToggleBookmark?: () => void;
  onOpenThread?: (id: string) => void;
  onToggleReaction?: (id: string, emoji: string) => void;
  onEdit?: (id: string, body: string) => void;
  onDelete?: (id: string) => void;
  onMarkUnread?: (messageId: string) => Promise<void>;
  onSetReminder?: (messageId: string, minutesFromNow: number) => Promise<void>;
  onTurnIntoIssue?: (messageId: string, title: string, description: string, assigneeId?: string) => Promise<void>;
  conversationId?: string;
  isOwn?: boolean;
}

const MessageRow = React.forwardRef<HTMLDivElement, MessageRowProps>(({
  msg,
  attachments,
  isPinned,
  isBookmarked,
  onTogglePin,
  onToggleBookmark,
  onOpenThread,
  onToggleReaction,
  onEdit,
  onDelete,
  onMarkUnread,
  onSetReminder,
  onTurnIntoIssue,
  conversationId,
  isOwn,
}, ref) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(msg.bodyText);
  const [showReactPicker, setShowReactPicker] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const reactButtonRef = useRef<HTMLButtonElement>(null);
  const messageRowRef = useRef<HTMLDivElement>(null);
  const { reactorsByEmoji } = useMessageReactions({ messageId: msg.id });

  const handleReturnFocusToMessage = () => {
    messageRowRef.current?.focus();
  };

  const commitEdit = () => {
    if (editValue.trim() && editValue !== msg.bodyText) {
      onEdit?.(msg.id, editValue.trim());
    }
    setEditing(false);
  };

  return (
    <div className="cc-msg cc-msg--row" ref={ref || messageRowRef} tabIndex={-1}>
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
            <Suspense fallback={<span>{renderBody(msg.bodyText, issueRefs)}</span>}>
              <EpicDescriptionRenderer content={msg.bodyAdf as any} />
            </Suspense>
          </div>
        ) : (
          <div className="cc-msg__text">{renderBody(msg.bodyText, issueRefs)}</div>
        )}

        {attachments && attachments.length > 0 && (
          <AttachmentPreview attachments={attachments} />
        )}

        {/* Link unfurl cards — rendered for every URL detected in body_text. */}
        {!editing && msg.bodyText && <LinkUnfurl bodyText={msg.bodyText} />}

        {/* Message actions toolbar — copy link, mark unread, remind, turn into issue */}
        {!editing && conversationId && (
          <MessageActionsToolbar
            messageId={msg.id}
            conversationId={conversationId}
            messageText={msg.bodyText}
            onCopyLink={async () => {
              const url = `${window.location.origin}?message=${msg.id}`;
              await navigator.clipboard.writeText(url);
            }}
            onMarkUnread={async () => onMarkUnread?.(msg.id)}
            onRemind={async (mins) => onSetReminder?.(msg.id, mins)}
            onTurnIntoIssue={async (title, desc, assignee) =>
              onTurnIntoIssue?.(msg.id, title, desc, assignee)
            }
            onReturnFocus={handleReturnFocusToMessage}
          />
        )}

        {/* Legacy hover toolbar — kept for compatibility with quick reactions/thread reply */}
        {!editing && (
          <div className="cc-msg__toolbar" role="toolbar">
            <button
              ref={reactButtonRef}
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
              aria-label={isPinned ? 'Unpin message' : 'Pin message'}
              title={isPinned ? 'Unpin message' : 'Pin message'}
              onClick={onTogglePin}
              style={isPinned ? { color: 'var(--ds-icon-warning, #B38600)' } : undefined}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M12 2v6m0 0l4 4-4 4-4-4 4-4zm0 10v10" />
              </svg>
            </button>
            <button
              type="button"
              className="cc-msg__tool"
              aria-label={isBookmarked ? 'Remove bookmark' : 'Save for later'}
              title={isBookmarked ? 'Remove bookmark' : 'Save for later'}
              onClick={onToggleBookmark}
              style={isBookmarked ? { color: 'var(--ds-icon-brand, #0C66E4)' } : undefined}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
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

            <ReactionPicker
              isOpen={showReactPicker}
              onClose={() => setShowReactPicker(false)}
              triggerRef={reactButtonRef}
              onEmojiPick={(emoji) => {
                onToggleReaction?.(msg.id, emoji);
              }}
            />

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

        <MessageReactions
          reactions={msg.reactions}
          onToggle={(emoji) => onToggleReaction?.(msg.id, emoji)}
          currentUserId={msg.authorId}
          reactorsByEmoji={reactorsByEmoji}
        />

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
});

MessageRow.displayName = 'MessageRow';

export { initialsOf };
export default MessageStream;
