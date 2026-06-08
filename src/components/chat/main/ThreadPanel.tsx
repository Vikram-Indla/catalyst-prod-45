/**
 * ThreadPanel — side panel showing replies to a parent message.
 * Mounted by ChatMainView when the user clicks "N replies" on a message.
 * Uses useThreadMessages for the reply list + reply composer.
 */
import React, { useState } from 'react';
import Button from '@atlaskit/button/new';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import type { ChatMessage } from '@/types/chat';
import { useThreadMessages } from '@/hooks/chat/useThreadMessages';
import { Avatar, initialsOf } from './avatar';

export interface ThreadPanelProps {
  conversationId: string;
  parentMessage: ChatMessage;
  onClose: () => void;
}

export function ThreadPanel({ conversationId, parentMessage, onClose }: ThreadPanelProps) {
  const { messages, isLoading, sendReply } = useThreadMessages(conversationId, parentMessage.id);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await sendReply(text);
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        width: 360,
        borderLeft: '1px solid var(--ds-border, #DFE1E6)',
        background: 'var(--ds-surface, #FFFFFF)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
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
        <div style={{ fontWeight: 500, fontSize: 14 }}>Thread</div>
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
            <div style={{ fontWeight: 500, fontSize: 13 }}>{parentMessage.authorName || initialsOf(parentMessage.authorName)}</div>
            <div style={{ fontSize: 14, color: 'var(--ds-text, #172B4D)', marginTop: 2 }}>{parentMessage.bodyText}</div>
          </div>
        </div>

        {/* Replies */}
        {isLoading && <div style={{ color: 'var(--ds-text-subtle, #44546F)', fontSize: 13 }}>Loading…</div>}
        {!isLoading && messages.length === 0 && (
          <div style={{ color: 'var(--ds-text-subtle, #44546F)', fontSize: 13 }}>No replies yet.</div>
        )}
        {messages.map((m) => (
          <div key={m.id} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Avatar name={m.authorName} seed={m.authorId} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{m.authorName}</div>
              <div style={{ fontSize: 14, color: 'var(--ds-text, #172B4D)' }}>{m.bodyText}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Reply composer */}
      <div style={{ borderTop: '1px solid var(--ds-border, #DFE1E6)', padding: 12 }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Reply…"
          rows={2}
          style={{
            width: '100%',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 4,
            padding: 8,
            fontSize: 14,
            resize: 'none',
            fontFamily: 'inherit',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <Button appearance="primary" isDisabled={!draft.trim() || sending} onClick={submit}>
            {sending ? 'Sending…' : 'Reply'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ThreadPanel;
