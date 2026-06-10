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
import React, { useMemo, useState, useRef, useEffect, useCallback, useReducer } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useConversations } from '@/hooks/chat/useConversations';
import { useMessages } from '@/hooks/chat/useMessages';
import { useConversationMembers } from '@/hooks/chat/useConversationMembers';
import { useConversationPins, useTogglePin } from '@/hooks/chat/usePinsBookmarks';
import { useMessageSearch } from '@/hooks/chat/useMessageSearch';
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
  const [catySummary, setCatySummary] = useState<{ open: boolean; loading: boolean; text: string }>({ open: false, loading: false, text: '' });
  // In-conversation search (#13)
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Realtime presence: map userId → 'online' | 'offline'
  const [presenceMap, setPresenceMap] = useState<Record<string, 'online' | 'offline'>>({});

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
  const currentUserMuted = useMemo(
    () => memberRows.find((m) => m.userId === currentUserId)?.isMuted ?? false,
    [memberRows, currentUserId],
  );
  const currentUserStarred = useMemo(
    () => memberRows.find((m) => m.userId === currentUserId)?.isStarred ?? false,
    [memberRows, currentUserId],
  );
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
        presence: (presenceMap[m.userId] === 'online' ? 'available' : 'offline') as ChatPerson['presence'],
        presenceNote: null,
      })),
    [memberRows, presenceMap],
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

  // In-conversation search — full-text via Postgres tsvector
  const { results: searchResults, isSearching, search: runSearch } = useMessageSearch(
    searchOpen ? resolvedActiveId : null,
  );

  // Close search when switching conversations
  useEffect(() => { setSearchOpen(false); setSearchQuery(''); }, [resolvedActiveId]);

  // Trigger search on query change (debounced via hook's internal runId)
  useEffect(() => { if (searchOpen && searchQuery.trim().length >= 2) runSearch(searchQuery); }, [searchOpen, searchQuery, runSearch]);

  const handleAskCaty = useCallback(async () => {
    if (!resolvedActiveId) return;
    setCatySummary({ open: true, loading: true, text: '' });
    try {
      const snippet = messages.slice(-30).map((m) => `${m.authorName}: ${m.bodyText}`).join('\n');
      const { data, error } = await (supabase as any).functions.invoke('ai-digest', {
        body: { action: 'summarize_chat', content: snippet, conversationId: resolvedActiveId },
      });
      if (error) throw error;
      const text = (data as any)?.summary ?? (data as any)?.text ?? (data as any)?.content ?? 'No summary available.';
      setCatySummary({ open: true, loading: false, text });
    } catch {
      setCatySummary({ open: true, loading: false, text: 'Unable to summarize this conversation right now.' });
    }
  }, [resolvedActiveId, messages]);

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

  // Realtime presence — broadcast self as online, track others
  useEffect(() => {
    if (!resolvedActiveId || !currentUserId) return;
    const ch = supabase.channel(`chat-presence:${resolvedActiveId}`, {
      config: { presence: { key: currentUserId } },
    });
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<{ status: string }>();
      const next: Record<string, 'online' | 'offline'> = {};
      for (const [userId, arr] of Object.entries(state)) {
        next[userId] = (arr as any[]).some((p: any) => p.status === 'online') ? 'online' : 'offline';
      }
      setPresenceMap(next);
    });
    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ status: 'online', userId: currentUserId });
      }
    });
    const heartbeat = setInterval(() => {
      ch.track({ status: 'online', userId: currentUserId }).catch(() => {});
    }, 30_000);
    return () => {
      clearInterval(heartbeat);
      ch.untrack().catch(() => {});
      supabase.removeChannel(ch);
    };
  }, [resolvedActiveId, currentUserId]);

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
          <ConversationHeader
            conversation={activeConversation}
            members={members}
            currentUserMuted={currentUserMuted}
            currentUserStarred={currentUserStarred}
            onAskCaty={handleAskCaty}
            onOpenSearch={resolvedActiveId ? () => setSearchOpen((v) => !v) : undefined}
          />
          {/* In-conversation search bar (#13) */}
          {searchOpen && (
            <div style={{ borderBottom: '1px solid var(--ds-border, #DFE1E6)', background: 'var(--ds-surface, #FFFFFF)', padding: '8px 16px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="var(--ds-text-subtlest, #6B778C)" strokeWidth={2} style={{ flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  autoFocus
                  type="search"
                  placeholder="Search messages…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); } }}
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 13,
                    color: 'var(--ds-text, #172B4D)',
                  }}
                />
                {isSearching && <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)' }}>Searching…</span>}
                <button
                  type="button"
                  onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 16, lineHeight: 1, padding: '0 4px' }}
                  aria-label="Close search"
                >×</button>
              </div>
              {searchQuery.trim().length >= 2 && (
                <div style={{ marginTop: 8, maxHeight: 320, overflowY: 'auto', borderRadius: 4, border: '1px solid var(--ds-border, #DFE1E6)' }}>
                  {searchResults.length === 0 && !isSearching ? (
                    <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--ds-text-subtlest, #6B778C)' }}>
                      No messages found for "{searchQuery}"
                    </div>
                  ) : (
                    searchResults.map((r) => (
                      <button
                        key={r.message.id}
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery('');
                          // Scroll to the message if in the same conversation
                          const el = document.getElementById(`chat-msg-${r.message.id}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 16px',
                          background: 'transparent',
                          border: 'none',
                          borderBottom: '1px solid var(--ds-border, #DFE1E6)',
                          cursor: 'pointer',
                          fontSize: 13,
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle, #F7F8F9)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <span style={{ fontWeight: 500, color: 'var(--ds-text, #172B4D)', marginRight: 8 }}>{r.message.authorName}</span>
                        <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)' }}>
                          {new Date(r.message.createdAt).toLocaleDateString()}
                        </span>
                        <div style={{ marginTop: 2, color: 'var(--ds-text-subtle, #44546F)' }}>
                          {r.snippetBefore}
                          <strong style={{ color: 'var(--ds-text, #172B4D)' }}>{r.matchedText}</strong>
                          {r.snippetAfter || r.message.bodyText.slice(0, 80)}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

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

      {/* CATY channel summarize modal (#20) */}
      {catySummary.open && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(9,30,66,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => setCatySummary({ open: false, loading: false, text: '' })}
        >
          <div
            style={{
              background: 'var(--ds-surface-overlay, #FFFFFF)',
              borderRadius: 8,
              boxShadow: '0 8px 32px rgba(9,30,66,0.24)',
              width: 520,
              maxWidth: '90vw',
              maxHeight: '70vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Rainbow AI header */}
            <div style={{ padding: '2px', background: 'conic-gradient(from 0deg, #FF3CAC, #784BA0, #2B86C5, #00C9FF, #92FE9D, #FFD700, #FF3CAC)', borderRadius: '8px 8px 0 0', flexShrink: 0 }}>
              <div style={{ background: 'var(--ds-surface-overlay, #FFFFFF)', padding: '12px 16px', borderRadius: '6px 6px 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>✦ Ask Caty — Channel Summary</span>
                <button type="button" onClick={() => setCatySummary({ open: false, loading: false, text: '' })} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 16, lineHeight: 1 }} aria-label="Close">✕</button>
              </div>
            </div>
            <div style={{ padding: 16, overflowY: 'auto', flex: 1, fontSize: 14, color: 'var(--ds-text, #172B4D)', lineHeight: 1.6 }}>
              {catySummary.loading ? (
                <div style={{ color: 'var(--ds-text-subtle, #44546F)', fontStyle: 'italic' }}>Thinking…</div>
              ) : (
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{catySummary.text}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatMainView;
