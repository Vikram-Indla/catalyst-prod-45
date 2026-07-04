import React, { useEffect, useMemo, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { DateSeparator } from './DateSeparator';
import { HuddleEventRow } from './HuddleEventRow';
import { dayKey } from '../../lib/formatTimestamp';
import type { ChatMessage } from '@/types/chat';
import type { AttachmentMap } from '../../hooks/useMessageAttachments';

interface MessageListProps {
  messages: ChatMessage[];
  loading?: boolean;
  /** Unread watermark (ISO). The "New messages" divider renders before the
   *  first message from another author created after this instant. */
  unreadSince?: string | null;
  currentUserId?: string | null;
  savedIds?: Set<string>;
  pinnedIds?: Set<string>;
  pinnedByMap?: Record<string, { name: string | null; isMe: boolean }>;
  attachmentsByMessage?: AttachmentMap;
  removingIds?: Set<string>;
  jumpHighlightId?: string | null;
  onOpenThread: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onJumpTo?: (messageId: string) => void;
  onSaveLater?: (messageId: string) => void;
  onShare?: (messageId: string) => void;
  onEdit?: (messageId: string, markdown: string) => void;
  onRequestDelete?: (messageId: string) => void;
  onTogglePin?: (messageId: string) => void;
  onCopyLink?: (messageId: string) => void;
  onMarkUnread?: (messageId: string) => void;
  onOpenForwardSource?: (conversationId: string, messageId: string) => void;
  /** Auto-scroll to bottom on new message. */
  followLatest?: boolean;
}

const SAME_AUTHOR_WINDOW_MS = 5 * 60 * 1000;

interface RenderItem {
  kind: 'date' | 'message' | 'unread';
  key: string;
  date?: string;
  message?: ChatMessage;
  showHeader?: boolean;
}

export function buildRenderList(
  messages: ChatMessage[],
  unreadSince?: string | null,
  currentUserId?: string | null,
): RenderItem[] {
  const out: RenderItem[] = [];
  let lastDay = '';
  let lastAuthor: string | null = null;
  let lastTime = 0;
  const unreadCutoff = unreadSince ? new Date(unreadSince).getTime() : null;
  let unreadPlaced = false;
  for (const m of messages) {
    const dk = dayKey(m.createdAt);
    if (
      unreadCutoff !== null &&
      !unreadPlaced &&
      m.authorId !== currentUserId &&
      new Date(m.createdAt).getTime() > unreadCutoff
    ) {
      out.push({ kind: 'unread', key: 'unread-divider' });
      unreadPlaced = true;
      // The divider breaks author grouping — the first unread message
      // always shows its full header.
      lastAuthor = null;
      lastTime = 0;
    }
    if (dk !== lastDay) {
      out.push({ kind: 'date', key: `date-${dk}`, date: m.createdAt });
      lastDay = dk;
      lastAuthor = null;
      lastTime = 0;
    }
    const t = new Date(m.createdAt).getTime();
    const sameAuthor = lastAuthor === m.authorId && t - lastTime < SAME_AUTHOR_WINDOW_MS;
    out.push({
      kind: 'message',
      key: m.id,
      message: m,
      showHeader: !sameAuthor,
    });
    if (m.eventType) {
      // Event rows (e.g. huddle_summary) must not suppress the header of the
      // next real message — reset grouping trackers after pushing.
      lastAuthor = null;
      lastTime = 0;
    } else {
      lastAuthor = m.authorId;
      lastTime = t;
    }
  }
  return out;
}

export function MessageList({
  messages,
  loading,
  unreadSince,
  currentUserId,
  savedIds,
  pinnedIds,
  pinnedByMap,
  attachmentsByMessage,
  removingIds,
  jumpHighlightId,
  onOpenThread,
  onToggleReaction,
  onJumpTo,
  onSaveLater,
  onShare,
  onEdit,
  onRequestDelete,
  onTogglePin,
  onCopyLink,
  onMarkUnread,
  onOpenForwardSource,
  followLatest = true,
}: MessageListProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const renderList = useMemo(
    () => buildRenderList(messages, unreadSince, currentUserId),
    [messages, unreadSince, currentUserId],
  );

  useEffect(() => {
    if (!followLatest) return;
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, followLatest]);

  const handleJumpToDate = (iso: string) => {
    const target = new Date(iso);
    target.setHours(0, 0, 0, 0);
    const found = messages.find(m => {
      const d = new Date(m.createdAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() >= target.getTime();
    });
    if (found && onJumpTo) onJumpTo(found.id);
  };

  const handleJumpRecent = () => {
    const last = messages[messages.length - 1];
    if (last && onJumpTo) onJumpTo(last.id);
  };

  const handleJumpBeginning = () => {
    const first = messages[0];
    if (first && onJumpTo) onJumpTo(first.id);
  };

  return (
    <div
      ref={scrollerRef}
      role="log"
      aria-live="polite"
      aria-label="Messages"
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'var(--cv2-bg-panel)',
        paddingBottom: 12,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ flex: '1 0 auto' }} aria-hidden="true" />
      {loading && messages.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            color: 'var(--cv2-text-muted)',
            fontFamily: 'var(--cv2-font)',
            font: 'var(--ds-font-body-small)',
          }}
        >
          Loading messages…
        </div>
      ) : renderList.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            color: 'var(--cv2-text-muted)',
            fontFamily: 'var(--cv2-font)',
            font: 'var(--ds-font-body-small)',
          }}
        >
          No messages yet. Say hello.
        </div>
      ) : (
        renderList.map(item =>
          item.kind === 'unread' ? (
            <div
              key={item.key}
              role="separator"
              aria-label="New messages"
              data-cv2-unread-divider
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--ds-space-100)',
                padding: 'var(--ds-space-050) var(--ds-space-250)',
              }}
            >
              <span style={{ flex: 1, height: 1, background: 'var(--cv2-danger)' }} />
              <span
                style={{
                  font: 'var(--ds-font-body-small)',
                  fontWeight: 600,
                  color: 'var(--cv2-danger)',
                  whiteSpace: 'nowrap',
                }}
              >
                New messages
              </span>
            </div>
          ) : item.kind === 'date' ? (
            <DateSeparator
              key={item.key}
              iso={item.date!}
              onJumpToDate={handleJumpToDate}
              onJumpMostRecent={handleJumpRecent}
              onJumpBeginning={handleJumpBeginning}
            />
          ) : item.message!.eventType === 'huddle_summary' || item.message!.eventType === 'huddle_live' ? (
            <HuddleEventRow key={item.key} message={item.message!} onOpenThread={onOpenThread} />
          ) : (
            <MessageBubble
              key={item.key}
              message={item.message!}
              showHeader={!!item.showHeader}
              isSaved={savedIds?.has(item.message!.id)}
              isPinned={pinnedIds?.has(item.message!.id)}
              pinnedByName={pinnedByMap?.[item.message!.id]?.name ?? null}
              pinnedByMe={pinnedByMap?.[item.message!.id]?.isMe ?? false}
              attachments={attachmentsByMessage?.get(item.message!.id)}
              removing={removingIds?.has(item.message!.id)}
              jumpHighlight={jumpHighlightId === item.message!.id}
              onOpenThread={onOpenThread}
              onToggleReaction={onToggleReaction}
              onSaveLater={onSaveLater}
              onShare={onShare}
              onEdit={onEdit}
              onRequestDelete={onRequestDelete}
              onTogglePin={onTogglePin}
              onCopyLink={onCopyLink}
              onMarkUnread={onMarkUnread}
              onOpenForwardSource={onOpenForwardSource}
            />
          ),
        )
      )}
    </div>
  );
}
