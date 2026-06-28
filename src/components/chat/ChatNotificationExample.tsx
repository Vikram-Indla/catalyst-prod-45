/**
 * ChatNotificationExample — Reference implementation showing how to integrate
 * the notification system into the chat UI.
 *
 * This file demonstrates:
 * 1. Toast notifications in MessageComposer
 * 2. Push notifications for @mentions and DMs
 * 3. Notification permission gate
 * 4. Sound settings
 *
 * Copy and adapt the patterns to your actual chat components.
 */
import React, { useEffect } from 'react';
import Button from '@atlaskit/button/new';
import { useMessagesWithNotifications } from '@/hooks/chat/useMessagesWithNotifications';
import { ChatToastRenderer } from './ChatToastRenderer';
import { NotificationPermissionGate } from './NotificationPermissionGate';

/**
 * Example: MessageComposer with toast notifications
 */
export function MessageComposerWithNotifications({
  conversationId,
  onSend,
}: {
  conversationId?: string;
  onSend?: (text: string) => void;
}) {
  const [text, setText] = React.useState('');
  const [sending, setSending] = React.useState(false);

  const { toasts, removeToast, notifyMessageSent, notifyMessageFailed } =
    useMessagesWithNotifications(conversationId ?? null);

  const handleSend = async () => {
    if (!text.trim() || !conversationId) return;

    setSending(true);
    try {
      // Your send logic here
      if (onSend) {
        await onSend(text);
      }

      // Show success toast
      notifyMessageSent();
      setText('');
    } catch (err) {
      // Show error toast (sticky, user must dismiss)
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      notifyMessageFailed(errorMsg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Toast notifications appear here */}
      <ChatToastRenderer toasts={toasts} onDismiss={removeToast} />

      {/* Composer UI */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a message..."
        style={{
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid var(--ds-border)',
          fontFamily: 'inherit',
          fontSize: 'var(--ds-font-size-400)',
          minHeight: '80px',
        }}
      />

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <Button
          appearance="primary"
          onClick={handleSend}
          isLoading={sending}
          isDisabled={sending || !text.trim()}
        >
          Send
        </Button>
      </div>
    </div>
  );
}

/**
 * Example: ChatMainView with push notifications and permission gate
 */
export function ChatMainViewWithNotifications({
  conversationId,
}: {
  conversationId?: string;
}) {
  const {
    messages,
    sendMessage,
    toggleReaction,
    toasts,
    removeToast,
    requestPushPermission,
    setSoundEnabled,
    getPushPermissionState,
  } = useMessagesWithNotifications(conversationId ?? null);

  // Request push permission once on mount
  useEffect(() => {
    // In a real app, you might want to defer this to user interaction
    // to avoid aggressive prompting. Here we do it on mount for demo.
    requestPushPermission();
  }, [requestPushPermission]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Notification permission gate banner */}
      <NotificationPermissionGate
        onPermissionGranted={() => {
          console.debug('Push notifications enabled');
        }}
        onDismissed={() => {
          console.debug('User dismissed notification prompt');
        }}
      />

      {/* Sound settings (optional) */}
      <div style={{ padding: '12px', borderBottom: '1px solid var(--ds-border)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            onChange={(e) => setSoundEnabled(e.target.checked)}
            defaultChecked={false}
          />
          <span style={{ fontSize: 'var(--ds-font-size-200)' }}>
            Play sound on @mention
          </span>
        </label>
      </div>

      {/* Toast notifications */}
      <ChatToastRenderer toasts={toasts} onDismiss={removeToast} />

      {/* Messages list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          backgroundColor: 'var(--ds-surface)',
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              marginBottom: '12px',
              padding: '8px',
              borderRadius: '4px',
              backgroundColor: 'var(--ds-surface-sunken)',
            }}
          >
            <div style={{ fontWeight: 500, fontSize: 'var(--ds-font-size-200)' }}>
              {msg.authorName}
            </div>
            <div style={{ fontSize: 'var(--ds-font-size-400)', marginTop: '4px' }}>
              {msg.bodyText}
            </div>

            {/* Reaction strip (demo) */}
            {msg.reactions.length > 0 && (
              <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                {msg.reactions.map((r) => (
                  <button
                    key={r.emoji}
                    onClick={() => toggleReaction(msg.id, r.emoji)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      border: `1px solid ${r.reactedByMe ? 'blue' : 'var(--ds-border)'}`,
                      backgroundColor: r.reactedByMe ? '#e8f4ff' : 'var(--ds-surface-sunken)',
                      cursor: 'pointer',
                      fontSize: 'var(--ds-font-size-200)',
                    }}
                  >
                    {r.emoji} {r.count}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Composer */}
      <MessageComposerWithNotifications
        conversationId={conversationId}
        onSend={(text) => sendMessage(text)}
      />
    </div>
  );
}

/**
 * Example: Minimal setup for quick integration
 */
export function ChatWithNotifications({ conversationId }: { conversationId?: string }) {
  return <ChatMainViewWithNotifications conversationId={conversationId} />;
}

export default ChatWithNotifications;
