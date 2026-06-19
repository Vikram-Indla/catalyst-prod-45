/**
 * DockConversationPane — in-dock conversation surface (header + messages + composer).
 *
 * Slack/Teams enterprise pattern: clicking a row in the directory opens the
 * conversation INSIDE the same dock, not in a separate window. Mirrors the
 * pieces from /chat full page (ConversationHeader, MessageStream, MessageComposer)
 * but compacted to dock dimensions.
 */
import React, { useState } from 'react';
import { useMessages } from '@/hooks/chat/useMessages';
import type { ChatConversation, ChatMessage } from '@/types/chat';
import { ConversationHeader } from '@/components/chat/main/ConversationHeader';
import { MessageStream } from '@/components/chat/main/MessageStream';
import { MessageComposer } from '@/components/chat/main/MessageComposer';
import { ThreadPanel } from '@/components/chat/main/ThreadPanel';
import catyIcon from '@/assets/caty-icon.svg';

interface DockConversationPaneProps {
  conversation: ChatConversation;
  onBack: () => void;
}

export function DockConversationPane({ conversation, onBack }: DockConversationPaneProps) {
  const { messages, isLoading, hasMore, loadMore, sendMessage, editMessage, deleteMessage, toggleReaction, currentUserId } = useMessages(conversation.id);
  const [summaryDismissed, setSummaryDismissed] = useState(false);
  const [threadParent, setThreadParent] = useState<ChatMessage | null>(null);

  const handleOpenThread = (messageId: string) => {
    const msg = messages.find(m => m.id === messageId) ?? null;
    setThreadParent(msg);
  };

  return (
    <div className="cc-conv-pane">
      {/* Back affordance */}
      <button type="button" className="cc-conv-pane__back" onClick={onBack} aria-label="Back to directory">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span>All messages</span>
      </button>

      <ConversationHeader
        conversation={conversation}
        currentUserMuted={conversation.isMuted ?? false}
        currentUserStarred={conversation.isStarred ?? false}
        onBack={onBack}
      />

      {/* Ticket summary pill — finding 52: Caty can summarize ticket threads */}
      {conversation.kind === 'ticket' && !summaryDismissed && messages.length >= 3 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          margin: '6px 10px',
          padding: '7px 12px',
          borderRadius: 8,
          background: 'var(--ds-background-information, #E8F2FF)',
          border: '1px solid var(--ds-border-information, #85B8FF)',
          fontSize: 12,
        }}>
          <img src={catyIcon} alt="" width={16} height={16} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, color: 'var(--ds-text-information, #0055CC)', fontWeight: 500 }}>
            {messages.length} messages — summarize this thread?
          </span>
          <button
            type="button"
            style={{ background: 'var(--ds-background-brand-bold, #0C66E4)', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            onClick={() => window.dispatchEvent(new CustomEvent('catalyst:ask-caty', { detail: { prompt: `Summarize the discussion on ${conversation.ticketKey ?? 'this ticket'}` } }))}
          >
            Summarize
          </button>
          <button
            type="button"
            style={{ background: 'transparent', border: 'none', color: 'var(--ds-text-subtlest, #6B778C)', cursor: 'pointer', padding: 2, fontSize: 16, lineHeight: 1 }}
            aria-label="Dismiss"
            onClick={() => setSummaryDismissed(true)}
          >×</button>
        </div>
      )}

      {/* Thread panel overlays the message area when a thread is open (finding 54) */}
      {threadParent ? (
        <ThreadPanel
          conversationId={conversation.id}
          parentMessage={threadParent}
          conversationTitle={conversation.title}
          onClose={() => setThreadParent(null)}
          onAlsoSendToConversation={(text) => sendMessage(text)}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <MessageStream
            conversationId={conversation.id}
            messages={messages}
            isLoading={isLoading}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onEdit={editMessage}
            onDelete={deleteMessage}
            onToggleReaction={toggleReaction}
            onOpenThread={handleOpenThread}
            currentUserId={currentUserId}
          />
          <MessageComposer
            conversationTitle={conversation.ticketKey ?? conversation.title}
            disabled={false}
            onSend={(text) => sendMessage(text)}
          />
        </div>
      )}
    </div>
  );
}

export default DockConversationPane;
