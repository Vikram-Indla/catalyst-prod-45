import React, { useCallback, useEffect, useRef, useState } from 'react';
import Avatar from '@atlaskit/avatar';
import ArrowDownIcon from '@atlaskit/icon/core/arrow-down';
import type { ChatConversation, ChatMessage } from '@/types/chat';
import { useMessages } from '@/hooks/chat/useMessages';
import { MessageComposer } from '@/components/chat/main/MessageComposer';
import { HoverToolbar } from './HoverToolbar';
import { MessageText } from './MessageText';
// ads-scanner:ignore-next-line -- CSS file uses only var(--c-chat-*) tokens
import './feed.css';

// ── Constants ──────────────────────────────────────────────────────────────

const GROUP_GAP_MS = 5 * 60_000; // new group if author changes OR gap > 5 min
const LOAD_MORE_THRESHOLD = 80;  // px from top to trigger load-more
const AT_BOTTOM_THRESHOLD = 80;  // px from bottom to consider "at bottom"

// ── Types ──────────────────────────────────────────────────────────────────

interface MsgGroup {
  key: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  messages: ChatMessage[];
  /** ISO date string for the day boundary above this group, if any */
  dayLabel: string | null;
  /** True if the unread divider should appear above this group */
  unreadAbove: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getDayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterdayStr = new Date(now.getTime() - 86_400_000).toDateString();
  if (d.toDateString() === todayStr) return 'Today';
  if (d.toDateString() === yesterdayStr) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function getTimeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function buildGroupsForTest(messages: ChatMessage[], unreadCount: number): MsgGroup[] {
  return buildGroups(messages, unreadCount);
}

function buildGroups(messages: ChatMessage[], unreadCount: number): MsgGroup[] {
  const groups: MsgGroup[] = [];
  let currentDayStr = '';
  const unreadStartIdx = unreadCount > 0 ? messages.length - unreadCount : -1;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prev = messages[i - 1];

    const msgDay = new Date(msg.createdAt).toDateString();
    const dayChanged = msgDay !== currentDayStr;
    const authorChanged = !prev || prev.authorId !== msg.authorId;
    const gapTooLong =
      prev &&
      new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > GROUP_GAP_MS;

    const startNewGroup = dayChanged || authorChanged || gapTooLong;

    if (startNewGroup) {
      groups.push({
        key: `group-${msg.id}`,
        authorId: msg.authorId,
        authorName: msg.authorName,
        authorAvatarUrl: msg.authorAvatarUrl,
        messages: [msg],
        dayLabel: dayChanged ? getDayLabel(msg.createdAt) : null,
        unreadAbove: i === unreadStartIdx,
      });
      if (dayChanged) currentDayStr = msgDay;
    } else {
      const last = groups[groups.length - 1];
      last.messages.push(msg);
      if (i === unreadStartIdx) last.unreadAbove = true;
    }
  }

  return groups;
}

// ── InlineEditField ────────────────────────────────────────────────────────

function InlineEditField({
  initialText,
  onSave,
  onCancel,
}: {
  initialText: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initialText);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const trimmed = text.trim();
        if (trimmed) onSave(trimmed);
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    },
    [text, onSave, onCancel],
  );

  const trimmed = text.trim();
  const unchanged = trimmed === initialText.trim();

  return (
    <div className="c-msg__edit">
      <textarea
        ref={ref}
        className="c-msg__edit-input"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
        aria-label="Edit message"
      />
      <div className="c-msg__edit-actions">
        <span className="c-msg__edit-hint">escape to cancel · enter to save</span>
        <button className="c-msg__edit-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="c-msg__edit-save"
          disabled={!trimmed || unchanged}
          onClick={() => { if (trimmed && !unchanged) onSave(trimmed); }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function FeedSkeleton() {
  const widths = [
    ['60%', '80%'],
    ['45%', '70%', '55%'],
    ['75%'],
    ['50%', '65%'],
  ];
  return (
    <div className="c-feed__skeleton" aria-hidden="true">
      {widths.map((lines, i) => (
        <div key={i} className="c-skel-row">
          <div className="c-skel-avatar" />
          <div className="c-skel-lines">
            {lines.map((w, j) => (
              <div key={j} className="c-skel-line" style={{ width: w }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="c-feed__day" role="separator" aria-label={label}>
      <div className="c-feed__day__line" />
      <span className="c-feed__day__label">{label}</span>
      <div className="c-feed__day__line" />
    </div>
  );
}

function UnreadDivider({ count }: { count: number }) {
  return (
    <div className="c-feed__unread" role="separator" aria-label={`${count} new messages`}>
      <div className="c-feed__unread__line" />
      <span className="c-feed__unread__label">
        {count} new {count === 1 ? 'message' : 'messages'}
      </span>
      <div className="c-feed__unread__line" />
    </div>
  );
}

function MsgGroupBlock({
  group,
  currentUserId,
  editingMessageId,
  onToggleReaction,
  onOpenThread,
  onEditMessage,
  onDeleteMessage,
  onSaveEdit,
  onCancelEdit,
}: {
  group: MsgGroup;
  currentUserId: string | null;
  editingMessageId: string | null;
  onToggleReaction: (msgId: string, emoji: string) => void;
  onOpenThread: (msgId: string) => void;
  onEditMessage: (msgId: string) => void;
  onDeleteMessage: (msgId: string) => void;
  onSaveEdit: (msgId: string, newText: string) => void;
  onCancelEdit: () => void;
}) {
  return (
    <div className="c-msg-group" role="group" aria-label={`Messages from ${group.authorName}`}>
      {group.messages.map((msg, idx) => {
        const isFull = idx === 0;
        const isOwn = currentUserId !== null && msg.authorId === currentUserId;
        const isEditing = editingMessageId === msg.id;
        return (
          <div
            key={msg.id}
            className={`c-msg ${isFull ? 'c-msg--full' : 'c-msg--compact'}`}
            data-message-id={msg.id}
          >
            {/* Avatar / compact timestamp slot */}
            <div className="c-msg__avatar">
              {isFull ? (
                <Avatar
                  name={msg.authorName}
                  src={msg.authorAvatarUrl ?? undefined}
                  size="medium"
                  appearance="circle"
                />
              ) : (
                <span className="c-msg__compact-ts" aria-hidden="true">
                  {getTimeLabel(msg.createdAt)}
                </span>
              )}
            </div>

            {/* Body */}
            <div className="c-msg__body">
              {isFull && (
                <div className="c-msg__meta">
                  <span className="c-msg__author">{msg.authorName}</span>
                  <time
                    className="c-msg__ts"
                    dateTime={msg.createdAt}
                    title={new Date(msg.createdAt).toLocaleString()}
                  >
                    {getTimeLabel(msg.createdAt)}
                  </time>
                </div>
              )}

              {msg.deletedAt ? (
                <p className="c-msg__text c-msg__text--deleted">
                  This message was deleted.
                </p>
              ) : isEditing ? (
                <InlineEditField
                  initialText={msg.bodyText ?? ''}
                  onSave={newText => onSaveEdit(msg.id, newText)}
                  onCancel={onCancelEdit}
                />
              ) : (
                <MessageText className="c-msg__text" text={msg.bodyText ?? ''} />
              )}

              {msg.editedAt && !msg.deletedAt && !isEditing && (
                <span className="c-msg__edited">(edited)</span>
              )}

              {/* Reactions */}
              {msg.reactions.length > 0 && (
                <div className="c-msg__reactions">
                  {msg.reactions.map(r => (
                    <button
                      key={r.emoji}
                      className={`c-reaction-pill${r.reactedByMe ? ' c-reaction-pill--mine' : ''}`}
                      onClick={() => onToggleReaction(msg.id, r.emoji)}
                      aria-label={`${r.emoji} reaction, ${r.count} ${r.count === 1 ? 'person' : 'people'}`}
                      aria-pressed={r.reactedByMe}
                    >
                      <span className="c-reaction-pill__emoji">{r.emoji}</span>
                      <span className="c-reaction-pill__count">{r.count}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Thread reply chip */}
              {msg.replyCount > 0 && (
                <button
                  className="c-reply-chip"
                  onClick={() => onOpenThread(msg.id)}
                  aria-label={`${msg.replyCount} ${msg.replyCount === 1 ? 'reply' : 'replies'}`}
                >
                  <span className="c-reply-chip__count">{msg.replyCount}</span>
                  <span>{msg.replyCount === 1 ? 'reply' : 'replies'}</span>
                </button>
              )}
            </div>

            {/* Hover toolbar — hidden while editing */}
            {!msg.deletedAt && !isEditing && (
              <HoverToolbar
                messageId={msg.id}
                isOwn={isOwn}
                onToggleReaction={emoji => onToggleReaction(msg.id, emoji)}
                onOpenThread={() => onOpenThread(msg.id)}
                onEditMessage={() => onEditMessage(msg.id)}
                onDeleteMessage={() => onDeleteMessage(msg.id)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Feed header ────────────────────────────────────────────────────────────

function FeedHeader({ conversation }: { conversation: ChatConversation }) {
  const isChannel =
    conversation.kind === 'channel' || conversation.kind === 'custom_channel';
  const isDm = conversation.kind === 'dm' || conversation.kind === 'group_dm';

  return (
    <header className="c-feed__hdr">
      <div className="c-feed__hdr__icon" aria-hidden="true">
        {isChannel ? '#' : isDm ? '👤' : '🎫'}
      </div>
      <h2 className="c-feed__hdr__title">{conversation.title}</h2>
      {conversation.ticketKey && (
        <span className="c-feed__hdr__sub">{conversation.ticketKey}</span>
      )}
    </header>
  );
}

// ── Main export ────────────────────────────────────────────────────────────

interface Props {
  conversationId: string;
  conversation: ChatConversation;
  onOpenThread: (messageId: string) => void;
  /** When set, scroll to and briefly highlight this message after load */
  initialMessageId?: string;
}

export function MessageFeed({ conversationId, conversation, onOpenThread, initialMessageId }: Props) {
  const { messages, isLoading, hasMore, loadMore, sendMessage, editMessage, deleteMessage, toggleReaction, currentUserId } =
    useMessages(conversationId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const prevCountRef = useRef(0);

  // Auto-scroll to bottom when new messages arrive and user is at bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const added = messages.length - prevCountRef.current;
    prevCountRef.current = messages.length;
    if (added > 0 && atBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, atBottom]);

  // Scroll to bottom on conversation switch; clear edit state
  useEffect(() => {
    prevCountRef.current = 0;
    setAtBottom(true);
    setEditingMessageId(null);
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [conversationId]);

  // Scroll to and highlight a specific message (e.g. from activity surface navigation)
  useEffect(() => {
    if (!initialMessageId || isLoading) return;
    const el = scrollRef.current?.querySelector(`[data-message-id="${initialMessageId}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (el as HTMLElement).style.background = 'var(--c-chat-accent-subtle)';
    const t = setTimeout(() => { (el as HTMLElement).style.background = ''; }, 2000);
    return () => clearTimeout(t);
  }, [initialMessageId, isLoading]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAtBottom(fromBottom <= AT_BOTTOM_THRESHOLD);
    if (el.scrollTop < LOAD_MORE_THRESHOLD && hasMore) {
      loadMore();
    }
  }, [hasMore, loadMore]);

  const jumpToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setAtBottom(true);
  }, []);

  const handleSaveEdit = useCallback(async (msgId: string, newText: string) => {
    await editMessage(msgId, newText);
    setEditingMessageId(null);
  }, [editMessage]);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
  }, []);

  const groups = buildGroups(
    messages.filter(m => !m.parentId),
    conversation.unreadCount,
  );

  return (
    <div className="c-feed" role="region" aria-label={`${conversation.title} messages`}>
      <FeedHeader conversation={conversation} />

      <div
        ref={scrollRef}
        className="c-feed__scroll"
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Message history"
      >
        {isLoading && <FeedSkeleton />}

        {!isLoading && messages.length === 0 && (
          <div className="c-feed__empty">
            <div className="c-feed__empty__icon" aria-hidden="true">💬</div>
            <p className="c-feed__empty__title">No messages yet</p>
            <p className="c-feed__empty__sub">Be the first to send a message.</p>
          </div>
        )}

        {groups.map((group, gi) => (
          <React.Fragment key={group.key}>
            {group.dayLabel && <DayDivider label={group.dayLabel} />}
            {group.unreadAbove && gi > 0 && (
              <UnreadDivider count={conversation.unreadCount} />
            )}
            <MsgGroupBlock
              group={group}
              currentUserId={currentUserId}
              editingMessageId={editingMessageId}
              onToggleReaction={toggleReaction}
              onOpenThread={onOpenThread}
              onEditMessage={setEditingMessageId}
              onDeleteMessage={deleteMessage}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
            />
          </React.Fragment>
        ))}
      </div>

      {!atBottom && (
        <button className="c-feed__jump" onClick={jumpToBottom} aria-label="Jump to latest messages">
          <ArrowDownIcon label="" LEGACY_size="small" />
          Latest
        </button>
      )}

      <div className="c-composer">
        <MessageComposer
          onSend={sendMessage}
          conversationTitle={conversation.title}
          conversationId={conversationId}
        />
      </div>
    </div>
  );
}
