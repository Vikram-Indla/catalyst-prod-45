/**
 * ChatMainView — conversation pane only.
 *
 * Workspace navigation (DMs, channels, threads, mentions, saved, drafts,
 * people, conversation list) lives in ChatSidebar (CatalystShell). This
 * component owns the right-of-sidebar conversation pane: header, message
 * stream, composer, optional thread right pane.
 *
 * State is URL-driven:
 *   ?conv=<conversationId>  → active conversation
 *   ?rail=<threads|mentions|saved|drafts|people> → secondary panel
 */
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useConversations } from '@/hooks/chat/useConversations';
import { useMessages } from '@/hooks/chat/useMessages';
import { ConversationHeader } from './main/ConversationHeader';
import { MessageStream } from './main/MessageStream';
import { MessageComposer } from './main/MessageComposer';
import { ConversationEmptyState } from './main/ConversationEmptyState';
import { ThreadPanel } from './main/ThreadPanel';
import { ChatMentionsPanel } from './main/ChatMentionsPanel';
import { ChatBookmarksPanel } from './main/ChatBookmarksPanel';
import { PeopleList } from './main/PeopleList';
import { ChatRightPane } from './ChatRightPane';
// ads-scanner:ignore-next-line -- chat.css uses only ADS tokens
import './chat.css';

export interface ChatMainViewProps {
  activeConversationId?: string;
  onSelectConversation?: (id: string) => void;
}

export function ChatMainView({ activeConversationId, onSelectConversation }: ChatMainViewProps) {
  const [params, setParams] = useSearchParams();
  const urlConv = params.get('conv') ?? undefined;
  const rail = params.get('rail') ?? undefined;
  const urlThread = params.get('thread') ?? undefined;
  const [threadParentId, setThreadParentId] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const hasSeenHint = localStorage.getItem('catalyst.chat.hint-seen');
    if (!hasSeenHint) {
      setShowHint(true);
    }
  }, []);

  const dismissHint = () => {
    localStorage.setItem('catalyst.chat.hint-seen', 'true');
    setShowHint(false);
  };

  const { conversations } = useConversations();

  const resolvedActiveId =
    activeConversationId ??
    urlConv ??
    conversations.find((c) => !c.isArchived)?.id;

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === resolvedActiveId) ?? null,
    [conversations, resolvedActiveId],
  );

  const {
    messages,
    isLoading: messagesLoading,
    hasMore,
    loadMore,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    currentUserId,
  } = useMessages(resolvedActiveId ?? null);

  const handleSelect = (id: string) => {
    if (onSelectConversation) onSelectConversation(id);
    const next = new URLSearchParams(params);
    next.set('conv', id);
    next.delete('rail');
    setParams(next, { replace: true });
    setThreadParentId(null);
  };

  const threadParentMessage = useMemo(
    () => (threadParentId ? messages.find((m) => m.id === threadParentId) ?? null : null),
    [threadParentId, messages],
  );

  // Rail panel surfaces — when a `?rail=` param is set, the secondary
  // panel replaces the conversation pane (Mentions / Saved / People).
  // Threads rail renders ChatRightPane; Drafts falls through to conversation view
  // (next-turn scope: dedicated aggregated views).
  if (rail === 'mentions') {
    return (
      <div className="cc-main cc-main--rail">
        <ChatMentionsPanel onOpenMessage={() => undefined} />
      </div>
    );
  }
  if (rail === 'saved') {
    return (
      <div className="cc-main cc-main--rail">
        <ChatBookmarksPanel onOpenConversation={handleSelect} />
      </div>
    );
  }
  if (rail === 'people') {
    return (
      <div className="cc-main cc-main--rail">
        <PeopleList onConversationCreated={handleSelect} />
      </div>
    );
  }
  if (rail === 'threads' && resolvedActiveId) {
    return (
      <div className="cc-main cc-main--rail">
        <ChatRightPane
          conversationId={resolvedActiveId}
          threadParentId={urlThread}
          onSelectThread={(id) => {
            const next = new URLSearchParams(params);
            next.set('thread', id);
            setParams(next);
          }}
          onClose={() => {
            const next = new URLSearchParams(params);
            next.delete('thread');
            next.delete('rail');
            setParams(next);
          }}
        />
      </div>
    );
  }

  return (
    <div className="cc-main cc-main--conv-only">
      <div className="cc-conv" style={{ display: 'flex', flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <ConversationHeader conversation={activeConversation} />

          {showHint && (
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--ds-background-information-subtle, #E9F2FE)',
                borderBottom: '1px solid var(--ds-border-information, #0C66E4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                fontSize: '13px',
                color: 'var(--ds-text, #172B4D)',
              }}
            >
              <span>💡 Hover over messages for actions — copy, react, or turn into a work item</span>
              <button
                onClick={dismissHint}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--ds-text-subtle, #44546F)',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '0 4px',
                }}
                aria-label="Dismiss hint"
              >
                ×
              </button>
            </div>
          )}

          {messages.length === 0 ? (
            <ConversationEmptyState
              onStartConversation={() => {
                composerRef.current?.focus();
              }}
            />
          ) : (
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
          )}

          <MessageComposer
            ref={composerRef}
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
