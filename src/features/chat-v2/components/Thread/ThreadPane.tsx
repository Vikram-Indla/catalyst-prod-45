import React, { useEffect, useMemo, useState } from 'react';
import { useThreadMessages } from '@/hooks/chat/useThreadMessages';
import { useMessages } from '@/hooks/chat/useMessages';
import { useChatMessageActions } from '@/hooks/chat/useChatMessageActions';
import { MessageBubble } from '../MessagePanel/MessageBubble';
import { Composer } from '../Composer/Composer';
import { SummarizeIcon, XIcon } from '../shared/Icon';
import { dayKey } from '../../lib/formatTimestamp';
import type { ChatConversation } from '@/types/chat';

interface ThreadPaneProps {
  conversation: ChatConversation;
  parentMessageId: string;
  onClose: () => void;
  /** When provided, the thread header shows a Summarize button. */
  onSummarize?: () => void;
  /**
   * Which CSS grid area this pane occupies. Defaults to 'thread' (right
   * column). In Activity / Later mode the panel slot is reused for the
   * thread — pass 'panel' so the pane fills the whole panel area instead of
   * landing in an implicit grid cell at the bottom-right.
   */
  gridArea?: 'thread' | 'panel';
  /** When set, the pane scroll-jumps + pulses this message id (parent or reply)
   *  whenever the value changes. */
  initialJumpMessageId?: string | null;
}

export function ThreadPane({ conversation, parentMessageId, onClose, onSummarize, gridArea = 'thread', initialJumpMessageId }: ThreadPaneProps) {
  const { messages: allMessages, toggleReaction: toggleParentReaction } = useMessages(conversation.id);
  const { messages: replies, isLoading, sendReply } = useThreadMessages(conversation.id, parentMessageId);
  // Replies are ordinary chat_messages rows — the same reaction RPC used for
  // top-level messages works on reply ids too. useThreadMessages already
  // subscribes to the reactions realtime channel and invalidates its own
  // cache when a reply's reaction changes, so this write is picked up
  // without any extra wiring here.
  const { toggleReaction: toggleReplyReaction } = useChatMessageActions(conversation.id);
  const [jumpHighlightId, setJumpHighlightId] = useState<string | null>(null);

  const parent = useMemo(
    () => allMessages.find(m => m.id === parentMessageId) ?? null,
    [allMessages, parentMessageId],
  );

  useEffect(() => {
    if (!initialJumpMessageId) return;
    const matchesParent = parent?.id === initialJumpMessageId;
    const matchesReply = replies.some(r => r.id === initialJumpMessageId);
    if (!matchesParent && !matchesReply) return;
    setJumpHighlightId(initialJumpMessageId);
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-message-id="${initialJumpMessageId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    const t = setTimeout(() => setJumpHighlightId(null), 2400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJumpMessageId, parent?.id, replies.length]);

  return (
    <section
      aria-label="Thread"
      style={{
        gridArea,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--cv2-bg-panel)',
        borderLeft: gridArea === 'thread' ? '1px solid var(--cv2-border-strong)' : 'none',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <Header conversationTitle={conversation.title} onClose={onClose} onSummarize={onSummarize} />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          paddingBottom: 12,
        }}
      >
        {parent ? (
          <MessageBubble
            message={parent}
            showHeader
            hideThreadMeta
            jumpHighlight={jumpHighlightId === parent.id}
            onOpenThread={() => {}}
            onToggleReaction={(id, emoji) => { void toggleParentReaction(id, emoji); }}
          />
        ) : (
          <div style={{ padding: 24, font: 'var(--ds-font-body-small)', color: 'var(--cv2-text-muted)', textAlign: 'center' }}>
            Loading parent…
          </div>
        )}
        {parent && (
          <RepliesDivider count={replies.length} />
        )}
        {isLoading && replies.length === 0 ? (
          <div style={{ padding: 24, font: 'var(--ds-font-body-small)', color: 'var(--cv2-text-muted)', textAlign: 'center' }}>
            Loading replies…
          </div>
        ) : (
          replies.map((m, idx) => {
            const prev = idx > 0 ? replies[idx - 1] : null;
            const showHeader =
              !prev ||
              prev.authorId !== m.authorId ||
              dayKey(prev.createdAt) !== dayKey(m.createdAt);
            return (
              <MessageBubble
                key={m.id}
                message={m}
                showHeader={showHeader}
                hideThreadMeta
                jumpHighlight={jumpHighlightId === m.id}
                // Nested threads (a thread on a reply) aren't a modeled
                // feature — single-level threading only — so this is
                // intentionally inert rather than a stub.
                onOpenThread={() => {}}
                onToggleReaction={(id, emoji) => { void toggleReplyReaction(id, emoji); }}
              />
            );
          })
        )}
      </div>
      <Composer
        placeholder="Reply..."
        conversationId={conversation.id}
        onSend={text => { void sendReply(text); }}
      />
    </section>
  );
}

function Header({
  conversationTitle,
  onClose,
  onSummarize,
}: {
  conversationTitle: string;
  onClose: () => void;
  onSummarize?: () => void;
}) {
  return (
    <div
      style={{
        height: 'var(--cv2-header-h, 56px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid var(--cv2-border)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--cv2-font)',
            font: 'var(--ds-font-body)',
            fontWeight: 700,
            color: 'var(--cv2-text-strong)',
          }}
        >
          Thread
        </div>
        <div
          style={{
            fontFamily: 'var(--cv2-font)',
            font: 'var(--ds-font-body-small)',
            color: 'var(--cv2-text-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {conversationTitle}
        </div>
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {onSummarize && (
          <button
            type="button"
            onClick={onSummarize}
            aria-label="Summarize thread"
            title="Summarize thread"
            style={{
              width: 32, height: 32,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', color: 'var(--cv2-text-subtle)',
              border: 'none', borderRadius: 'var(--cv2-radius-sm)', cursor: 'pointer',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <SummarizeIcon size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close thread"
          style={{
            width: 32, height: 32,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', color: 'var(--cv2-text-subtle)',
            border: 'none', borderRadius: 'var(--cv2-radius-sm)', cursor: 'pointer',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <XIcon size={16} />
        </button>
      </div>
    </div>
  );
}

function RepliesDivider({ count }: { count: number }) {
  // Left-anchored label + line filling the right ("1 reply ─────────────").
  // This matches the Slack thread look the user asked for in image 180.
  const label = count === 0 ? 'No replies yet' : `${count} ${count === 1 ? 'reply' : 'replies'}`;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        margin: '12px 16px',
      }}
    >
      <span
        style={{
          font: 'var(--ds-font-body-small)',
          fontWeight: 600,
          color: 'var(--cv2-text-muted)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        style={{
          flex: 1,
          height: 1,
          background: 'var(--cv2-divider)',
        }}
      />
    </div>
  );
}
