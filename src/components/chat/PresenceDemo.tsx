/**
 * PresenceDemo — Integration example showing full presence system
 *
 * This demonstrates:
 * 1. usePresence hook for heartbeat + Realtime subscription
 * 2. useTypingIndicator middleware for keystroke-based typing broadcasts
 * 3. PresenceIndicator + TypingIndicator + PresenceList UI components
 * 4. record_last_message call on send
 *
 * REMOVE THIS FILE BEFORE MERGING — it's example code only
 */

import React, { useState, useCallback } from 'react';
import { usePresence } from '@/hooks/chat/usePresence';
import { useTypingIndicator } from '@/hooks/chat/useTypingIndicator';
import {
  PresenceIndicator,
  TypingIndicator,
  PresenceList,
} from '@/components/chat/PresenceIndicator';
import { css } from '@emotion/react';

interface PresenceDemoProps {
  conversationId: string;
}

export const PresenceDemo: React.FC<PresenceDemoProps> = ({ conversationId }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ id: string; author: string; text: string }[]>([]);

  // Initialize presence tracking
  const { presenceList, currentUserPresence, isTyping, setTyping, recordMessage } = usePresence({
    conversationId,
    heartbeatIntervalMs: 30000,
    typingTimeoutMs: 3000,
    enabled: true,
  });

  // Wire typing indicator to composer
  const { isComposing, bindComposer, clearTyping } = useTypingIndicator(
    conversationId,
    setTyping,
    { debounceMs: 300, timeoutMs: 3000 }
  );

  // Filter typing users for display
  const typingUsers = presenceList.filter((p) => p.is_typing);

  // Handle message send
  const handleSend = useCallback(async () => {
    if (!message.trim()) return;

    // Add message to local state
    const newMessage = {
      id: `msg-${Date.now()}`,
      author: 'You',
      text: message,
    };
    setMessages((prev) => [...prev, newMessage]);
    setMessage('');

    // Record message send (updates last_message_at, clears typing)
    await recordMessage();
  }, [message, recordMessage]);

  return (
    <div
      css={css`
        display: flex;
        height: 100vh;
        gap: 16px;
        padding: 16px;
        background-color: var(--ds-surface, #FFFFFF);
      `}
    >
      {/* Main conversation area */}
      <div
        css={css`
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 800px;
        `}
      >
        <h1
          css={css`
            font-size: 24px;
            font-weight: 600;
            margin: 0;
          `}
        >
          Chat Presence Demo
        </h1>

        {/* Typing indicator at top */}
        {typingUsers.length > 0 && <TypingIndicator typingUsers={typingUsers} maxNames={2} />}

        {/* Message list */}
        <div
          css={css`
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 12px;
            background-color: var(--ds-surface-sunken, #F7F8F9);
            border-radius: 4px;
          `}
        >
          {messages.length === 0 ? (
            <div
              css={css`
                color: var(--ds-text-subtle, #42526E);
                font-size: 12px;
              `}
            >
              No messages yet. Start typing below.
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                css={css`
                  padding: 8px 12px;
                  background-color: white;
                  border-radius: 4px;
                  border-left: 3px solid var(--ds-border, #DFE1E6);
                `}
              >
                <div
                  css={css`
                    font-size: 11px;
                    font-weight: 600;
                    color: var(--ds-text-subtle, #42526E);
                  `}
                >
                  {msg.author}
                </div>
                <div
                  css={css`
                    font-size: 13px;
                    color: var(--ds-text, #172B4D);
                  `}
                >
                  {msg.text}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Composer */}
        <div
          css={css`
            display: flex;
            flex-direction: column;
            gap: 8px;
          `}
        >
          <textarea
            {...bindComposer}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              } else {
                bindComposer.onKeyDown(e);
              }
            }}
            placeholder="Type a message…"
            css={css`
              padding: 8px 12px;
              border: 1px solid var(--ds-border, #DFE1E6);
              border-radius: 4px;
              font-family: var(--ds-font-family-body, inherit);
              font-size: 13px;
              resize: vertical;
              min-height: 60px;

              &:focus {
                outline: none;
                border-color: var(--ds-link, #0052CC);
                box-shadow: 0 0 0 2px var(--ds-background-information, rgba(222, 224, 255, 0.5));
              }
            `}
          />

          <div
            css={css`
              display: flex;
              gap: 8px;
            `}
          >
            <button
              onClick={handleSend}
              css={css`
                flex: 1;
                padding: 8px 12px;
                background-color: var(--ds-link, #0052CC);
                color: white;
                border: none;
                border-radius: 4px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;

                &:hover {
                  background-color: #0747a6;
                }
              `}
            >
              Send
            </button>
          </div>

          {isComposing && (
            <div
              css={css`
                font-size: 11px;
                color: var(--ds-text-subtlest, #6B778C);
                font-style: italic;
              `}
            >
              ✓ Typing indicator broadcasting
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar: presence list */}
      <div
        css={css`
          width: 240px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background-color: var(--ds-surface-overlay, #FFFFFF);
          border-left: 1px solid var(--ds-border, #DFE1E6);
          padding: 16px;
          border-radius: 4px;
        `}
      >
        <div>
          <h3
            css={css`
              font-size: 13px;
              font-weight: 600;
              color: var(--ds-text, #172B4D);
              margin: 0 0 12px 0;
            `}
          >
            Participants
          </h3>

          {currentUserPresence && (
            <div
              css={css`
                padding: 8px 0;
                border-bottom: 1px solid var(--ds-border, #DFE1E6);
                margin-bottom: 12px;
              `}
            >
              <div
                css={css`
                  font-size: 12px;
                  font-weight: 500;
                  color: var(--ds-text, #172B4D);
                  margin-bottom: 4px;
                `}
              >
                You
              </div>
              <div
                css={css`
                  font-size: 11px;
                  color: var(--ds-text-subtle, #42526E);
                `}
              >
                {currentUserPresence.isOnline ? 'Online' : 'Offline'} ·{' '}
                {isComposing ? 'Typing' : 'Idle'}
              </div>
            </div>
          )}

          <PresenceList presenceList={presenceList} onlineFirst={true} />
        </div>
      </div>
    </div>
  );
};
