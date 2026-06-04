/**
 * ChatMainView — the 3-pane Catalyst Chat main window (Slack-style):
 *   A) IconRail (72px)        — DMs / Channels / Threads / Mentions / Saved + Caty AI
 *   B) ConversationList (300) — Channels / Tickets / Direct messages / Archived
 *   C) Conversation pane      — header + message stream + composer
 *
 * Real data comes from useConversations() and useMessages(conversationId).
 * The component is a controlled/uncontrolled hybrid: it accepts an
 * activeConversationId + onSelectConversation, and falls back to local
 * selection state when those props are omitted.
 */
import React, { useMemo, useState } from 'react';
import { useConversations } from '@/hooks/chat/useConversations';
import { useMessages } from '@/hooks/chat/useMessages';
import { IconRail, type RailKey } from './main/IconRail';
import { ConversationList } from './main/ConversationList';
import { ConversationHeader } from './main/ConversationHeader';
import { MessageStream } from './main/MessageStream';
import { MessageComposer } from './main/MessageComposer';
// ads-scanner:ignore-next-line -- chat.css uses only ADS tokens (no hardcoded values); shared layout styles
import './chat.css';

export interface ChatMainViewProps {
  activeConversationId?: string;
  onSelectConversation?: (id: string) => void;
}

export function ChatMainView({ activeConversationId, onSelectConversation }: ChatMainViewProps) {
  const [railKey, setRailKey] = useState<RailKey>('dms');
  const [localActiveId, setLocalActiveId] = useState<string | undefined>(undefined);

  const { conversations, isLoading: conversationsLoading } = useConversations();

  // Resolve the active conversation: controlled prop wins, then local state,
  // then the first available conversation as a graceful default.
  const resolvedActiveId =
    activeConversationId ??
    localActiveId ??
    conversations.find(c => !c.isArchived)?.id;

  const activeConversation = useMemo(
    () => conversations.find(c => c.id === resolvedActiveId) ?? null,
    [conversations, resolvedActiveId],
  );

  const { messages, isLoading: messagesLoading, hasMore, loadMore, sendMessage } = useMessages(
    resolvedActiveId ?? null,
  );

  const handleSelect = (id: string) => {
    if (onSelectConversation) onSelectConversation(id);
    else setLocalActiveId(id);
  };

  return (
    <div className="cc-main">
      <IconRail activeKey={railKey} onSelect={setRailKey} />

      <ConversationList
        conversations={conversations}
        isLoading={conversationsLoading}
        activeConversationId={resolvedActiveId}
        onSelectConversation={handleSelect}
      />

      <div className="cc-conv">
        <ConversationHeader conversation={activeConversation} />

        <MessageStream
          messages={messages}
          isLoading={messagesLoading}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />

        <MessageComposer
          conversationTitle={activeConversation?.ticketKey ?? activeConversation?.title}
          disabled={!resolvedActiveId}
          onSend={text => sendMessage(text)}
        />
      </div>
    </div>
  );
}

export default ChatMainView;
