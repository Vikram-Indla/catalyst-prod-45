/**
 * ChatMainView — full-screen chat workspace (Slack-equivalent layout).
 *
 * Three panes:
 *   1. IconRail (far left)  — Home / DMs / Activity / Later / More
 *   2. Sidebar pane         — per-rail list (conversations, DMs, activity
 *                             feed, saved items, people directory)
 *   3. Conversation pane    — header, message stream, composer, optional
 *                             thread side pane
 *
 * State is URL-driven:
 *   ?conv=<conversationId>  → active conversation
 *   ?rail=<home|dms|activity|later|more|threads> → rail selection
 *   (legacy values mentions/saved/people map to activity/later/more)
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
import { ConversationList } from './main/ConversationList';
import { IconRail, type RailKey } from './main/IconRail';
import { ChatRightPane } from './ChatRightPane';
// ads-scanner:ignore-next-line -- chat.css uses only ADS tokens
import './chat.css';

export interface ChatMainViewProps {
  activeConversationId?: string;
  onSelectConversation?: (id: string) => void;
}

function railFromParam(raw: string | undefined): RailKey | 'threads' {
  switch (raw) {
    case 'dms':
      return 'dms';
    case 'activity':
    case 'mentions':
      return 'activity';
    case 'later':
    case 'saved':
      return 'later';
    case 'more':
    case 'people':
      return 'people';
    case 'threads':
      return 'threads';
    default:
      return 'home';
  }
}

export function ChatMainView({ activeConversationId, onSelectConversation }: ChatMainViewProps) {
  const [params, setParams] = useSearchParams();
  const urlConv = params.get('conv') ?? undefined;
  const rail = railFromParam(params.get('rail') ?? undefined);
  const urlThread = params.get('thread') ?? undefined;
  const [threadParentId, setThreadParentId] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const hasSeenHint = localStorage.getItem('catalyst.chat.hint-seen');
    if (!hasSeenHint) setShowHint(true);
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

  const activityCount = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0),
    [conversations],
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
    setParams(next, { replace: true });
    setThreadParentId(null);
  };

  const handleRailSelect = (key: RailKey) => {
    const next = new URLSearchParams(params);
    if (key === 'home') next.delete('rail');
    else next.set('rail', key);
    setParams(next, { replace: true });
  };

  const threadParentMessage = useMemo(
    () => (threadParentId ? messages.find((m) => m.id === threadParentId) ?? null : null),
    [threadParentId, messages],
  );

  // "New" unread divider — the stream marks the first of the trailing
  // unreadCount top-level messages. Derived from the conversation row
  // because per-message read receipts are not stored.
  const firstUnreadId = useMemo(() => {
    const n = activeConversation?.unreadCount ?? 0;
    if (n <= 0) return undefined;
    const top = messages.filter((m) => !m.parentId && !m.deletedAt);
    return top.length >= n ? top[top.length - n]?.id : top[0]?.id;
  }, [activeConversation, messages]);

  // ── Sidebar pane content per rail selection ──────────────────────────
  const sidebar = (() => {
    switch (rail) {
      case 'dms':
        return (
          <ConversationList
            conversations={conversations}
            activeConversationId={resolvedActiveId}
            onSelectConversation={handleSelect}
            filter="dms"
            showUnreadsToggle
          />
        );
      case 'activity':
        return <ChatMentionsPanel onOpenMessage={() => undefined} />;
      case 'later':
        return <ChatBookmarksPanel onOpenConversation={handleSelect} />;
      case 'people':
        return <PeopleList onConversationCreated={handleSelect} />;
      default:
        return (
          <ConversationList
            conversations={conversations}
            activeConversationId={resolvedActiveId}
            onSelectConversation={handleSelect}
          />
        );
    }
  })();

  // ── Main pane ─────────────────────────────────────────────────────────
  const mainPane =
    rail === 'threads' && resolvedActiveId ? (
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
    ) : (
      <>
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
              firstUnreadId={firstUnreadId}
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
            conversationTitle={activeConversation?.title}
            onAlsoSendToConversation={(text) => sendMessage(text, { adf: null })}
            onClose={() => setThreadParentId(null)}
          />
        )}
      </>
    );

  return (
    <div className="cc-main cc-main--workspace">
      <IconRail
        activeKey={rail === 'threads' ? 'home' : rail}
        onSelect={handleRailSelect}
        activityCount={activityCount}
      />
      <div className="cc-sidebar-pane">{sidebar}</div>
      <div className="cc-conv" style={{ display: 'flex', flex: 1, minWidth: 0 }}>
        {mainPane}
      </div>
    </div>
  );
}

export default ChatMainView;
