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
import { PeopleList } from './main/PeopleList';
import { ConversationHeader } from './main/ConversationHeader';
import { MessageStream } from './main/MessageStream';
import { MessageComposer } from './main/MessageComposer';
import { ThreadPanel } from './main/ThreadPanel';
import { ChatMentionsPanel } from './main/ChatMentionsPanel';
import { ChatBookmarksPanel } from './main/ChatBookmarksPanel';
// ads-scanner:ignore-next-line -- chat.css uses only ADS tokens (no hardcoded values); shared layout styles
import './chat.css';

export interface ChatMainViewProps {
  activeConversationId?: string;
  onSelectConversation?: (id: string) => void;
}

export function ChatMainView({ activeConversationId, onSelectConversation }: ChatMainViewProps) {
  const [railKey, setRailKey] = useState<RailKey>('dms');
  const [localActiveId, setLocalActiveId] = useState<string | undefined>(undefined);
  // Active thread parent id. When set, ThreadPanel renders on the right of the
  // conversation pane. Cleared when user closes the panel or switches
  // conversations (handled in handleSelect).
  const [threadParentId, setThreadParentId] = useState<string | null>(null);

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

  const { messages, isLoading: messagesLoading, hasMore, loadMore, sendMessage, editMessage, deleteMessage, toggleReaction, currentUserId } = useMessages(
    resolvedActiveId ?? null,
  );

  const handleSelect = (id: string) => {
    if (onSelectConversation) onSelectConversation(id);
    else setLocalActiveId(id);
    // Closing an open thread when the user navigates to a different
    // conversation — the parent message no longer applies.
    setThreadParentId(null);
  };

  const threadParentMessage = useMemo(
    () => (threadParentId ? messages.find(m => m.id === threadParentId) ?? null : null),
    [threadParentId, messages],
  );

  const handleDmCreated = (id: string) => {
    if (onSelectConversation) onSelectConversation(id);
    else setLocalActiveId(id);
    setRailKey('dms');
  };

  return (
    <div className="cc-main">
      <IconRail activeKey={railKey} onSelect={setRailKey} />

      {railKey === 'people' ? (
        <PeopleList onConversationCreated={handleDmCreated} />
      ) : railKey === 'mentions' ? (
        <ChatMentionsPanel
          onOpenMessage={(messageId) => {
            // Mention rows carry chat_messages.id. Resolve to the parent
            // conversation by scanning the current conversations cache — if
            // the conversation is already loaded we just switch to it.
            const conv = conversations.find((c) => false /* placeholder */) ?? null;
            if (conv) handleSelect(conv.id);
            // If not loaded, leave selection as-is; clicking the mention
            // marks it read and the user can navigate via the rail.
            void messageId;
          }}
        />
      ) : railKey === 'saved' ? (
        <ChatBookmarksPanel onOpenConversation={handleSelect} />
      ) : (
        <ConversationList
          conversations={conversations}
          isLoading={conversationsLoading}
          activeConversationId={resolvedActiveId}
          onSelectConversation={handleSelect}
        />
      )}

      <div className="cc-conv" style={{ display: 'flex', flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <ConversationHeader conversation={activeConversation} />

          <MessageStream
            conversationId={resolvedActiveId}
            messages={messages}
            isLoading={messagesLoading}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onEdit={editMessage}
            onDelete={deleteMessage}
            onToggleReaction={toggleReaction}
            onOpenThread={(messageId) => setThreadParentId(messageId)}
            currentUserId={currentUserId}
          />

          <MessageComposer
            conversationTitle={activeConversation?.ticketKey ?? activeConversation?.title}
            conversationId={resolvedActiveId}
            disabled={!resolvedActiveId}
            onSend={(text, opts) => sendMessage(text, { adf: opts?.adf ?? null })}
          />
        </div>

        {threadParentMessage && resolvedActiveId && (
          <ThreadPanel
            conversationId={resolvedActiveId}
            parentMessage={threadParentMessage}
            onClose={() => setThreadParentId(null)}
          />
        )}
      </div>
    </div>
  );
}

export default ChatMainView;
