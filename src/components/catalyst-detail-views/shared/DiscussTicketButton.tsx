/**
 * DiscussTicketButton — opens a ticket-anchored chat thread in the dock.
 *
 * Mounted in the detail-view header beside Status/Watch/Improve. Calls
 * chat_get_or_create_ticket_thread RPC then dispatches the bridge event so
 * ChatDockMount expands the dock and activates the conversation.
 */
import React from 'react';
import { IconButton } from '@atlaskit/button/new';
import CommentIcon from '@atlaskit/icon/glyph/comment';
import Spinner from '@atlaskit/spinner';
import { useStartTicketThread } from '@/hooks/chat/useStartTicketThread';
import { openConversationInDock } from '@/lib/chat-dock-bridge';

interface DiscussTicketButtonProps {
  issueKey: string;
  variant?: 'icon' | 'full';
}

export function DiscussTicketButton({ issueKey, variant = 'icon' }: DiscussTicketButtonProps) {
  const startThread = useStartTicketThread();

  const handleClick = async () => {
    try {
      const convId = await startThread.mutateAsync(issueKey);
      openConversationInDock(convId);
    } catch (e) {
      console.error('Discuss ticket failed:', e);
    }
  };

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={startThread.isPending}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          border: '1px solid var(--ds-border)',
          borderRadius: 4,
          background: 'var(--ds-surface)',
          color: 'var(--ds-text)',
          fontSize: 'var(--ds-font-size-200)',
          fontWeight: 500,
          cursor: startThread.isPending ? 'not-allowed' : 'pointer',
        }}
        title={`Open chat thread for ${issueKey}`}
      >
        {startThread.isPending ? (
          <Spinner size="small" />
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
        Discuss
      </button>
    );
  }

  return (
    <IconButton
      icon={(p) =>
        startThread.isPending ? (
          <Spinner size="small" />
        ) : (
          <CommentIcon {...p} label="" />
        )
      }
      label={`Discuss ${issueKey}`}
      appearance="subtle"
      spacing="compact"
      onClick={handleClick}
      isDisabled={startThread.isPending}
    />
  );
}

export default DiscussTicketButton;
