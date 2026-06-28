/**
 * ThreadPanel — side panel showing replies to a parent message.
 * Mounted by ChatMainView when the user clicks "N replies" on a message.
 * Uses useThreadMessages for the reply list + reply composer.
 */
import React, { useState } from 'react';
import { Checkbox } from '@atlaskit/checkbox';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import type { ChatMessage } from '@/types/chat';
import { useThreadMessages } from '@/hooks/chat/useThreadMessages';
import { Avatar, initialsOf } from './avatar';
import { MessageComposer } from './MessageComposer';

export interface ThreadPanelProps {
  conversationId: string;
  parentMessage: ChatMessage;
  onClose: () => void;
  /** Conversation name shown in the header ("Thread · <name>"). */
  conversationTitle?: string;
  /** When set, the "Also send to <conversation>" checkbox posts the reply to the conversation too. */
  onAlsoSendToConversation?: (text: string) => void | Promise<void>;
}

export function ThreadPanel({
  conversationId,
  parentMessage,
  onClose,
  conversationTitle,
  onAlsoSendToConversation,
}: ThreadPanelProps) {
  const { messages, isLoading, sendReply } = useThreadMessages(conversationId, parentMessage.id);
  const [sending, setSending] = useState(false);
  const [alsoSend, setAlsoSend] = useState(false);

  return (
    <div
      style={{
        borderLeft: '1px solid var(--ds-border, #DFE1E6)',
        background: 'var(--ds-surface, #FFFFFF)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid var(--ds-border, #DFE1E6)',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 'var(--ds-font-size-400)', display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
          <span>Thread</span>
          {conversationTitle && (
            <span
              style={{
                fontWeight: 400,
                fontSize: 'var(--ds-font-size-200)',
                color: 'var(--ds-text-subtle, #44546F)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              · {conversationTitle}
            </span>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close thread"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: 'var(--ds-text-subtle, #44546F)',
          }}
        >
          <CrossIcon label="" size="small" />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {/* Parent message */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
          <Avatar name={parentMessage.authorName} seed={parentMessage.authorId} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 'var(--ds-font-size-300)' }}>{parentMessage.authorName || initialsOf(parentMessage.authorName)}</div>
            <div style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text, #172B4D)', marginTop: 2 }}>{parentMessage.bodyText}</div>
          </div>
        </div>

        {/* Replies */}
        {isLoading && <div style={{ color: 'var(--ds-text-subtle, #44546F)', fontSize: 'var(--ds-font-size-300)' }}>Loading…</div>}
        {!isLoading && messages.length === 0 && (
          <div style={{ color: 'var(--ds-text-subtle, #44546F)', fontSize: 'var(--ds-font-size-300)' }}>No replies yet.</div>
        )}
        {messages.map((m) => (
          <div key={m.id} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Avatar name={m.authorName} seed={m.authorId} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 'var(--ds-font-size-300)' }}>{m.authorName}</div>
              <div style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text, #172B4D)' }}>{m.bodyText}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Reply composer — canonical MessageComposer (same as main conversation) */}
      <div style={{ borderTop: '1px solid var(--ds-border, #DFE1E6)' }}>
        {onAlsoSendToConversation && (
          <div style={{ padding: '6px 12px 0' }}>
            <Checkbox
              isChecked={alsoSend}
              onChange={(e) => setAlsoSend(e.currentTarget.checked)}
              label={`Also send to ${conversationTitle ?? 'conversation'}`}
            />
          </div>
        )}
        <MessageComposer
          conversationTitle="Reply…"
          disabled={sending}
          onSend={async (text) => {
            if (!text.trim() || sending) return;
            setSending(true);
            try {
              await sendReply(text);
              if (alsoSend && onAlsoSendToConversation) await onAlsoSendToConversation(text);
            } finally {
              setSending(false);
            }
          }}
        />
      </div>
    </div>
  );
}

export default ThreadPanel;
