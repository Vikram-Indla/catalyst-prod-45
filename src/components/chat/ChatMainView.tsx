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
import { useConversationMembers } from '@/hooks/chat/useConversationMembers';
import { useConversationPins, useTogglePin } from '@/hooks/chat/usePinsBookmarks';
import type { ChatPerson } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [convTab, setConvTab] = useState<'messages' | 'files' | 'pins'>('messages');

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

  const { data: memberRows = [] } = useConversationMembers(resolvedActiveId ?? null);
  const { data: pins = [] } = useConversationPins(resolvedActiveId ?? null);
  const togglePin = useTogglePin();

  // File attachments in this conversation — messages with attachment_url set
  const fileMessages = useMemo(
    () => messages.filter((m) => (m as any).attachmentUrl || (m as any).attachment_url),
    [messages],
  );
  const members = useMemo<ChatPerson[]>(
    () =>
      memberRows.map((m) => ({
        id: m.userId,
        name: m.name,
        role: m.role,
        avatarUrl: null,
        presence: 'offline' as const,
        presenceNote: null,
      })),
    [memberRows],
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

  // Mark a specific message as unread by rolling back last_read_at
  const handleMarkUnread = async (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg || !currentUserId || !resolvedActiveId) return;
    const rollbackTs = new Date(new Date(msg.createdAt).getTime() - 1).toISOString();
    await (supabase as any)
      .from('chat_conversation_members')
      .update({ last_read_at: rollbackTs })
      .eq('conversation_id', resolvedActiveId)
      .eq('user_id', currentUserId);
  };

  // Save for later (reminder) — bookmark the message with remind_at note
  const handleSetReminder = async (messageId: string, minutesFromNow: number) => {
    if (!resolvedActiveId) return;
    const remindAt = new Date(Date.now() + minutesFromNow * 60000).toISOString();
    await (supabase as any)
      .from('chat_bookmarks')
      .upsert(
        { message_id: messageId, conversation_id: resolvedActiveId, note: `remind:${remindAt}` },
        { onConflict: 'message_id' },
      );
  };

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
          <ConversationHeader conversation={activeConversation} members={members} />

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

          {/* Channel tabs — Messages / Files / Pins */}
          {activeConversation?.kind === 'channel' && (
            <div className="cc-conv-tabs" role="tablist" aria-label="Channel content">
              {(['messages', 'files', 'pins'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={convTab === t}
                  className={`cc-conv-tab${convTab === t ? ' is-active' : ''}`}
                  onClick={() => setConvTab(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  {t === 'files' && fileMessages.length > 0 && ` (${fileMessages.length})`}
                  {t === 'pins' && pins.length > 0 && ` (${pins.length})`}
                </button>
              ))}
            </div>
          )}

          {convTab === 'files' && activeConversation?.kind === 'channel' ? (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {fileMessages.length === 0 ? (
                <div style={{ color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 13, textAlign: 'center', paddingTop: 32 }}>
                  No files shared in this channel yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {fileMessages.map((m) => {
                    const url = (m as any).attachmentUrl ?? (m as any).attachment_url ?? '';
                    const name = url.split('/').pop() ?? 'file';
                    return (
                      <a
                        key={m.id}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 12px',
                          border: '1px solid var(--ds-border, #DFE1E6)',
                          borderRadius: 4,
                          textDecoration: 'none',
                          color: 'var(--ds-text, #172B4D)',
                          fontSize: 13,
                          background: 'var(--ds-surface, #FFFFFF)',
                        }}
                      >
                        <span style={{ color: 'var(--ds-text-brand, #0C66E4)', fontSize: 16 }}>📎</span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                        <span style={{ color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 11 }}>{m.authorName}</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          ) : convTab === 'pins' && activeConversation?.kind === 'channel' ? (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {pins.length === 0 ? (
                <div style={{ color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 13, textAlign: 'center', paddingTop: 32 }}>
                  No pinned messages yet. Hover a message and pin it.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pins.map((pin) => {
                    const msg = messages.find((m) => m.id === pin.message_id);
                    return (
                      <div
                        key={pin.id}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid var(--ds-border, #DFE1E6)',
                          borderRadius: 4,
                          fontSize: 13,
                          background: 'var(--ds-surface, #FFFFFF)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 8,
                        }}
                      >
                        <span style={{ fontSize: 16 }}>📌</span>
                        <div style={{ flex: 1 }}>
                          {msg ? (
                            <>
                              <span style={{ fontWeight: 500, marginRight: 8 }}>{msg.authorName}</span>
                              <span style={{ color: 'var(--ds-text-subtle, #44546F)' }}>{msg.bodyText.slice(0, 200)}</span>
                            </>
                          ) : (
                            <span style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>Message no longer available</span>
                          )}
                        </div>
                        <button
                          type="button"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 12, padding: '2px 4px' }}
                          title="Unpin"
                          onClick={() => resolvedActiveId && togglePin.mutate({ conversationId: resolvedActiveId, messageId: pin.message_id, currentlyPinned: true })}
                        >
                          Unpin
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : messages.length === 0 ? (
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
              onMarkUnread={handleMarkUnread}
              onSetReminder={handleSetReminder}
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
      <div
        className={`cc-sidebar-pane${sidebarCollapsed ? ' cc-sidebar-pane--collapsed' : ''}`}
        style={{ position: 'relative' }}
      >
        {!sidebarCollapsed && sidebar}
        {/* Chevron toggle — matches project module sidebar pattern */}
        <button
          type="button"
          className="cc-sidebar-chevron"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setSidebarCollapsed((v) => !v)}
        >
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2}>
            {sidebarCollapsed
              ? <polyline points="9 18 15 12 9 6" />
              : <polyline points="15 18 9 12 15 6" />}
          </svg>
        </button>
      </div>
      <div className="cc-conv" style={{ display: 'flex', flex: 1, minWidth: 0 }}>
        {mainPane}
      </div>
    </div>
  );
}

export default ChatMainView;
