/**
 * DockConversationPane — in-dock conversation surface (header + messages + composer).
 *
 * Slack/Teams enterprise pattern: clicking a row in the directory opens the
 * conversation INSIDE the same dock, not in a separate window. Mirrors the
 * pieces from /chat full page (ConversationHeader, MessageStream, MessageComposer)
 * but compacted to dock dimensions.
 */
import React from 'react';
import { useMessages } from '@/hooks/chat/useMessages';
import type { ChatConversation } from '@/types/chat';
import { ConversationHeader } from '@/components/chat/main/ConversationHeader';
import { MessageStream } from '@/components/chat/main/MessageStream';
import { MessageComposer } from '@/components/chat/main/MessageComposer';

interface DockConversationPaneProps {
  conversation: ChatConversation;
  onBack: () => void;
}

export function DockConversationPane({ conversation, onBack }: DockConversationPaneProps) {
  const { messages, isLoading, hasMore, loadMore, sendMessage, editMessage, deleteMessage, toggleReaction, currentUserId } = useMessages(conversation.id);

  return (
    <div className="cc-conv-pane">
      {/* Back affordance */}
      <button type="button" className="cc-conv-pane__back" onClick={onBack} aria-label="Back to directory">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span>All messages</span>
      </button>

      <ConversationHeader conversation={conversation} />

      <MessageStream
        messages={messages}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onEdit={editMessage}
        onDelete={deleteMessage}
        onToggleReaction={toggleReaction}
        currentUserId={currentUserId}
      />

      <MessageComposer
        conversationTitle={conversation.ticketKey ?? conversation.title}
        disabled={false}
        onSend={(text) => sendMessage(text)}
      />
    </div>
  );
}

export default DockConversationPane;
