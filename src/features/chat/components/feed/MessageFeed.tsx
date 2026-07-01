import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import ArrowDownIcon from '@atlaskit/icon/core/arrow-down';
import type { ChatConversation, ChatMessage } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { useMessages } from '@/hooks/chat/useMessages';
import { usePresence } from '@/hooks/chat/usePresence';
import { useConversations } from '@/hooks/chat/useConversations';
import {
  useConversationPins,
  useTogglePin,
  useMyBookmarks,
  useToggleBookmark,
} from '@/hooks/chat/usePinsBookmarks';
import { MessageComposer } from '@/components/chat/main/MessageComposer';
import { ConversationHeader } from '@/components/chat/main/ConversationHeader';
import { HoverToolbar } from './HoverToolbar';
import { MessageText } from './MessageText';
import { ProfileHoverCard } from './ProfileHoverCard';

interface ProfileCardState {
  userId: string;
  name: string;
  avatarUrl: string | null;
  rect: DOMRect;
}

const db = supabase as unknown as { from: (t: string) => any };
// ads-scanner:ignore-next-line -- CSS file uses only var(--c-chat-*) tokens
import './feed.css';
// ads-scanner:ignore-next-line -- chat.css uses only var(--ds-*) ADS tokens; loaded here for ConversationHeader cc-* classes
import '@/components/chat/chat.css';

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

type VItem =
  | { type: 'day'; label: string }
  | { type: 'unread'; count: number }
  | { type: 'group'; group: MsgGroup; groupIndex: number };

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
  pinnedIds,
  savedIds,
  onToggleReaction,
  onOpenThread,
  onEditMessage,
  onDeleteMessage,
  onSaveEdit,
  onCancelEdit,
  onCopyLink,
  onCopyText,
  onMarkUnread,
  onTogglePin,
  onToggleSave,
  onForward,
  onOpenProfile,
}: {
  group: MsgGroup;
  currentUserId: string | null;
  editingMessageId: string | null;
  pinnedIds: Set<string>;
  savedIds: Set<string>;
  onToggleReaction: (msgId: string, emoji: string) => void;
  onOpenThread: (msgId: string) => void;
  onEditMessage: (msgId: string) => void;
  onDeleteMessage: (msgId: string) => void;
  onSaveEdit: (msgId: string, newText: string) => void;
  onCancelEdit: () => void;
  onCopyLink: (msgId: string) => void;
  onCopyText: (msgId: string) => void;
  onMarkUnread: (msgId: string) => void;
  onTogglePin: (msgId: string, currentlyPinned: boolean) => void;
  onToggleSave: (msgId: string, currentlySaved: boolean) => void;
  onForward: (msgId: string) => void;
  onOpenProfile: (state: ProfileCardState) => void;
}) {
  return (
    <div
      className="c-msg-group"
      role="group"
      aria-label={`Messages from ${group.authorName}`}
    >
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
                <button
                  type="button"
                  className="c-msg__avatar-btn"
                  onClick={e => {
                    e.stopPropagation();
                    onOpenProfile({
                      userId: msg.authorId,
                      name: msg.authorName,
                      avatarUrl: msg.authorAvatarUrl,
                      rect: e.currentTarget.getBoundingClientRect(),
                    });
                  }}
                  aria-label={`View profile of ${msg.authorName}`}
                >
                  <CatalystAvatar
                    name={msg.authorName}
                    src={msg.authorAvatarUrl ?? undefined}
                    size="medium"
                    appearance="circle"
                  />
                </button>
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
                  <span
                    className="c-msg__author"
                    role="button"
                    tabIndex={0}
                    onClick={e => {
                      e.stopPropagation();
                      onOpenProfile({
                        userId: msg.authorId,
                        name: msg.authorName,
                        avatarUrl: msg.authorAvatarUrl,
                        rect: e.currentTarget.getBoundingClientRect(),
                      });
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenProfile({
                          userId: msg.authorId,
                          name: msg.authorName,
                          avatarUrl: msg.authorAvatarUrl,
                          rect: (e.currentTarget as HTMLElement).getBoundingClientRect(),
                        });
                      }
                    }}
                  >
                    {msg.authorName}
                  </span>
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
                <div onClick={e => e.stopPropagation()}>
                  <InlineEditField
                    initialText={msg.bodyText ?? ''}
                    onSave={newText => onSaveEdit(msg.id, newText)}
                    onCancel={onCancelEdit}
                  />
                </div>
              ) : (
                <MessageText className="c-msg__text" text={msg.bodyText ?? ''} />
              )}

              {msg.editedAt && !msg.deletedAt && !isEditing && (
                <span className="c-msg__edited">(edited)</span>
              )}

              {/* Reactions */}
              {msg.reactions.length > 0 && (
                <div className="c-msg__reactions" onClick={e => e.stopPropagation()}>
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
                  onClick={e => { e.stopPropagation(); onOpenThread(msg.id); }}
                  aria-label={`${msg.replyCount} ${msg.replyCount === 1 ? 'reply' : 'replies'}`}
                >
                  <span className="c-reply-chip__count">{msg.replyCount}</span>
                  <span>{msg.replyCount === 1 ? 'reply' : 'replies'}</span>
                </button>
              )}
            </div>

            {/* Hover toolbar — hidden while editing */}
            {!msg.deletedAt && !isEditing && (() => {
              const isPinned = pinnedIds.has(msg.id);
              const isSaved = savedIds.has(msg.id);
              return (
                <HoverToolbar
                  messageId={msg.id}
                  isOwn={isOwn}
                  isPinned={isPinned}
                  isSaved={isSaved}
                  onToggleReaction={emoji => onToggleReaction(msg.id, emoji)}
                  onOpenThread={() => onOpenThread(msg.id)}
                  onEditMessage={() => onEditMessage(msg.id)}
                  onDeleteMessage={() => onDeleteMessage(msg.id)}
                  onCopyLink={() => onCopyLink(msg.id)}
                  onCopyText={() => onCopyText(msg.id)}
                  onMarkUnread={() => onMarkUnread(msg.id)}
                  onTogglePin={() => onTogglePin(msg.id, isPinned)}
                  onToggleSave={() => onToggleSave(msg.id, isSaved)}
                  onForward={() => onForward(msg.id)}
                  onAskCaty={() => void 0}
                />
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}

// ── ForwardModal ───────────────────────────────────────────────────────────

function ForwardModal({
  originalText,
  conversations,
  onForward,
  onClose,
}: {
  originalText: string;
  conversations: ChatConversation[];
  onForward: (targetConversationId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? conversations.filter(c => (c.title ?? '').toLowerCase().includes(q))
    : conversations;

  return createPortal(
    <div
      className="c-forward-overlay"
      role="presentation"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={ref}
        className="c-forward-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Forward message"
        onClick={e => e.stopPropagation()}
      >
        <div className="c-forward-modal__header">
          <span className="c-forward-modal__title">Forward message</span>
          <button
            className="c-forward-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {originalText && (
          <div className="c-forward-modal__preview" aria-label="Message preview">
            {originalText}
          </div>
        )}

        <input
          className="c-forward-modal__search"
          placeholder="Search conversations…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
          aria-label="Search conversations"
        />

        <div className="c-forward-modal__list" role="listbox" aria-label="Conversations">
          {filtered.length === 0 ? (
            <p className="c-forward-modal__empty">No conversations found.</p>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                className="c-forward-modal__item"
                role="option"
                onClick={() => onForward(c.id)}
                aria-label={`Forward to ${c.title || 'conversation'}`}
              >
                {c.title || 'Untitled conversation'}
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Main export ────────────────────────────────────────────────────────────

interface Props {
  conversationId: string;
  conversation: ChatConversation;
  onOpenThread: (messageId: string) => void;
  /** When set, scroll to and briefly highlight this message after load */
  initialMessageId?: string;
  /** When set, renders a minimize button in the header (full-screen mode only) */
  onDock?: () => void;
}

// ── TypingIndicator ────────────────────────────────────────────────────────

function TypingIndicator({ typers }: { typers: string[] }) {
  if (typers.length === 0) return null;
  let label: string;
  if (typers.length === 1) label = `${typers[0]} is typing…`;
  else if (typers.length === 2) label = `${typers[0]} and ${typers[1]} are typing…`;
  else label = 'Several people are typing…';
  return (
    <div className="c-feed__typing" aria-live="polite" aria-atomic="true">
      <span className="c-feed__typing__dots" aria-hidden="true">
        <span /><span /><span />
      </span>
      <span className="c-feed__typing__label">{label}</span>
    </div>
  );
}

export function MessageFeed({ conversationId, conversation, onOpenThread, initialMessageId, onDock }: Props) {
  const { messages, isLoading, hasMore, loadMore, sendMessage, editMessage, deleteMessage, toggleReaction, currentUserId } =
    useMessages(conversationId);
  const { setTyping, recordMessage, presenceList } = usePresence({ conversationId });
  const queryClient = useQueryClient();

  // Pins (shared) + bookmarks (per-user "save for later").
  const { data: pinRows } = useConversationPins(conversationId);
  const { data: bookmarkRows } = useMyBookmarks();
  const togglePin = useTogglePin();
  const toggleBookmark = useToggleBookmark();
  const { conversations: allConversations } = useConversations();

  const pinnedIds = useMemo(
    () => new Set((pinRows ?? []).map(p => p.message_id)),
    [pinRows],
  );
  const savedIds = useMemo(
    () => new Set((bookmarkRows ?? []).map(b => b.message_id)),
    [bookmarkRows],
  );

  // Forward modal state — holds the source message id, or null when closed.
  const [forwardMsgId, setForwardMsgId] = useState<string | null>(null);

  // Profile hover-card state — null when closed.
  const [profileCard, setProfileCard] = useState<ProfileCardState | null>(null);

  // ── Collaboration-bar callbacks ──────────────────────────────────────────

  const handleCopyLink = useCallback((msgId: string) => {
    void navigator.clipboard?.writeText(
      `${window.location.origin}/chat?c=${conversationId}&m=${msgId}`,
    );
  }, [conversationId]);

  const handleCopyText = useCallback((msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (msg?.bodyText) void navigator.clipboard?.writeText(msg.bodyText);
  }, [messages]);

  const handleMarkUnread = useCallback(async (msgId: string) => {
    if (!currentUserId) return;
    const target = messages.find(m => m.id === msgId);
    if (!target) return;
    // Previous ROOT message becomes the new last-read anchor; this message and
    // everything after it become unread.
    const roots = messages.filter(m => !m.parentId);
    const idx = roots.findIndex(m => m.id === msgId);
    const prevMsgId = idx > 0 ? roots[idx - 1].id : null;
    const lastReadAt = new Date(new Date(target.createdAt).getTime() - 1).toISOString();
    await db
      .from('chat_conversation_members')
      .update({ last_read_message_id: prevMsgId, last_read_at: lastReadAt })
      .eq('conversation_id', conversationId)
      .eq('user_id', currentUserId);
    queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
  }, [messages, conversationId, currentUserId, queryClient]);

  const handleTogglePin = useCallback((msgId: string, currentlyPinned: boolean) => {
    togglePin.mutate({ conversationId, messageId: msgId, currentlyPinned });
  }, [togglePin, conversationId]);

  const handleToggleSave = useCallback((msgId: string, currentlySaved: boolean) => {
    toggleBookmark.mutate({ conversationId, messageId: msgId, currentlyBookmarked: currentlySaved });
  }, [toggleBookmark, conversationId]);

  const handleForwardSubmit = useCallback(async (targetConversationId: string) => {
    const src = forwardMsgId ? messages.find(m => m.id === forwardMsgId) : null;
    const text = src?.bodyText;
    if (!text || !currentUserId) { setForwardMsgId(null); return; }
    await db.from('chat_messages').insert({
      conversation_id: targetConversationId,
      body_text: text,
      author_id: currentUserId,
    });
    queryClient.invalidateQueries({ queryKey: ['chat', 'messages', targetConversationId] });
    queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    setForwardMsgId(null);
  }, [forwardMsgId, messages, currentUserId, queryClient]);

  const typers = presenceList
    .filter(p => p.is_typing && p.user_id !== currentUserId)
    .map(p => p.user_name)
    .filter(Boolean);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const prevCountRef = useRef(0);

  const groups = useMemo(
    () => buildGroups(messages.filter(m => !m.parentId), conversation.unreadCount),
    [messages, conversation.unreadCount],
  );

  // Flat list of virtual items: day dividers, unread dividers, and message groups
  const vItems = useMemo<VItem[]>(() => {
    const items: VItem[] = [];
    groups.forEach((group, gi) => {
      if (group.dayLabel) items.push({ type: 'day', label: group.dayLabel });
      if (group.unreadAbove && gi > 0) items.push({ type: 'unread', count: conversation.unreadCount });
      items.push({ type: 'group', group, groupIndex: gi });
    });
    return items;
  }, [groups, conversation.unreadCount]);

  // Map message ID → vItem index for scroll-to-specific-message
  const msgIdToVIdx = useMemo(() => {
    const map = new Map<string, number>();
    vItems.forEach((item, i) => {
      if (item.type === 'group') {
        for (const msg of item.group.messages) map.set(msg.id, i);
      }
    });
    return map;
  }, [vItems]);

  const virtualizer = useVirtualizer({
    count: vItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => {
      const item = vItems[i];
      if (!item) return 40;
      if (item.type === 'day' || item.type === 'unread') return 36;
      return 10 + item.group.messages.length * 40;
    },
    overscan: 5,
    paddingStart: 16,
    paddingEnd: 8,
  });

  // Auto-scroll to bottom when new messages arrive and user is at bottom
  useEffect(() => {
    const added = messages.length - prevCountRef.current;
    prevCountRef.current = messages.length;
    if (added > 0 && atBottom && vItems.length > 0) {
      virtualizer.scrollToIndex(vItems.length - 1, { align: 'end' });
    }
  }, [messages.length, atBottom, vItems.length, virtualizer]);

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
    const vIdx = msgIdToVIdx.get(initialMessageId);
    if (vIdx == null) return;
    virtualizer.scrollToIndex(vIdx, { align: 'center' });
    let t2: ReturnType<typeof setTimeout>;
    const t = setTimeout(() => {
      const el = scrollRef.current?.querySelector(`[data-message-id="${initialMessageId}"]`);
      if (!el) return;
      (el as HTMLElement).style.background = 'var(--c-chat-accent-subtle)';
      t2 = setTimeout(() => { (el as HTMLElement).style.background = ''; }, 2000);
    }, 200);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [initialMessageId, isLoading, msgIdToVIdx, virtualizer]);

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
    if (vItems.length > 0) {
      virtualizer.scrollToIndex(vItems.length - 1, { align: 'end', behavior: 'smooth' });
    }
    setAtBottom(true);
  }, [vItems.length, virtualizer]);

  const handleSaveEdit = useCallback(async (msgId: string, newText: string) => {
    await editMessage(msgId, newText);
    setEditingMessageId(null);
  }, [editMessage]);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
  }, []);

  return (
    <div className="c-feed" role="region" aria-label={`${conversation.title} messages`}>
      <ConversationHeader conversation={conversation} onDock={onDock} />

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

        {!isLoading && vItems.length > 0 && (
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map(vRow => {
              const item = vItems[vRow.index];
              if (!item) return null;
              return (
                <div
                  key={vRow.key}
                  data-index={vRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${vRow.start}px)`,
                  }}
                >
                  {item.type === 'day' && <DayDivider label={item.label} />}
                  {item.type === 'unread' && <UnreadDivider count={item.count} />}
                  {item.type === 'group' && (
                    <MsgGroupBlock
                      group={item.group}
                      currentUserId={currentUserId}
                      editingMessageId={editingMessageId}
                      pinnedIds={pinnedIds}
                      savedIds={savedIds}
                      onToggleReaction={toggleReaction}
                      onOpenThread={onOpenThread}
                      onEditMessage={setEditingMessageId}
                      onDeleteMessage={deleteMessage}
                      onSaveEdit={handleSaveEdit}
                      onCancelEdit={handleCancelEdit}
                      onCopyLink={handleCopyLink}
                      onCopyText={handleCopyText}
                      onMarkUnread={handleMarkUnread}
                      onTogglePin={handleTogglePin}
                      onToggleSave={handleToggleSave}
                      onForward={setForwardMsgId}
                      onOpenProfile={setProfileCard}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!atBottom && (
        <button className="c-feed__jump" onClick={jumpToBottom} aria-label="Jump to latest messages">
          <ArrowDownIcon label="" LEGACY_size="small" />
          Latest
        </button>
      )}

      <TypingIndicator typers={typers} />

      <div className="c-composer">
        <MessageComposer
          onSend={async (text, opts) => {
            await sendMessage(text, opts);
            recordMessage();
          }}
          conversationTitle={conversation.title}
          conversationId={conversationId}
          onTyping={() => setTyping(true)}
          onMic={() => void 0}
        />
      </div>

      {forwardMsgId && (
        <ForwardModal
          originalText={messages.find(m => m.id === forwardMsgId)?.bodyText ?? ''}
          conversations={allConversations}
          onForward={handleForwardSubmit}
          onClose={() => setForwardMsgId(null)}
        />
      )}

      {profileCard && (
        <ProfileHoverCard
          userId={profileCard.userId}
          name={profileCard.name}
          avatarUrl={profileCard.avatarUrl}
          anchorRect={profileCard.rect}
          currentUserId={currentUserId}
          onClose={() => setProfileCard(null)}
        />
      )}
    </div>
  );
}
