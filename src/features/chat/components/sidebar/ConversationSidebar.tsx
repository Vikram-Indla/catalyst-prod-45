import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ChatConversation } from '@/types/chat';
import { ConversationRow } from './ConversationRow';
import { useChatSearch } from '@/hooks/chat/useChatSearch';
// ads-scanner:ignore-next-line -- CSS file uses only var(--c-chat-*) tokens
import './conversation-row.css';
// ads-scanner:ignore-next-line -- CSS file uses only var(--c-chat-*) tokens
import './conversation-sidebar.css';

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/>
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

interface ConversationSidebarProps {
  conversations: ChatConversation[];
  activeConversationId: string | undefined;
  onSelectConversation: (id: string) => void;
  onNewConversation?: () => void;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
}

// ── DM presence: batched online status from user_presence ──────────────────
//
// Online rule (verified against prod schema lmqwtldpfacrrlvdnmld):
//   - presence_state enum is on_set | remote | away | on_leave (NO 'online').
//   - A user is "online" when state IN ('onsite','remote') AND last_seen_at is
//     fresh (within ONLINE_WINDOW). away / on_leave are never online.
//   - clean_stale_presence() flips stale rows to 'away' after 5 min; we enforce
//     the same window client-side so a not-yet-run cron can't show a stale dot.
//   - user_presence is keyed globally by user_id (NOT per-conversation), so we
//     first resolve each DM's OTHER member from chat_conversation_members, then
//     batch one query over those partner user_ids.
// If presence can't be confirmed for a partner → NO dot (zero-assumption).

const ONLINE_STATES = ['onsite', 'remote'];
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

function useDMPresence(dmConvIds: string[]): Map<string, boolean> {
  const { user } = useAuth();
  const myId = user?.id ?? null;
  const key = dmConvIds.slice().sort().join(',');
  const { data } = useQuery({
    queryKey: ['chat', 'dm-presence', key, myId],
    enabled: dmConvIds.length > 0 && !!myId,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const map = new Map<string, boolean>();

      // 1. Resolve each DM's other member (one batched query for all DMs).
      const { data: memberRows } = await (supabase as any)
        .from('chat_conversation_members')
        .select('conversation_id, user_id')
        .in('conversation_id', dmConvIds)
        .neq('user_id', myId);
      const partners = (memberRows ?? []) as Array<{ conversation_id: string; user_id: string }>;
      if (partners.length === 0) return map;

      const partnerIds = Array.from(new Set(partners.map(p => p.user_id)));

      // 2. Batch presence for all partner user_ids.
      const freshSince = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
      const { data: presenceRows } = await (supabase as any)
        .from('user_presence')
        .select('user_id, state, last_seen_at')
        .in('user_id', partnerIds)
        .in('state', ONLINE_STATES)
        .gte('last_seen_at', freshSince);
      const onlineUserIds = new Set(
        ((presenceRows ?? []) as Array<{ user_id: string }>).map(r => r.user_id),
      );

      // 3. A DM is online when its resolved partner is online.
      for (const p of partners) {
        if (onlineUserIds.has(p.user_id)) map.set(p.conversation_id, true);
      }
      return map;
    },
  });
  return data ?? new Map<string, boolean>();
}

interface SectionConfig {
  id: string;
  label: string;
}

export function groupConversationsForTest(conversations: ChatConversation[]) {
  const active = conversations.filter(c => !c.isArchived);
  const archived = conversations.filter(c => c.isArchived);
  return {
    projects: active.filter(c =>
      c.kind === 'ticket' ||
      (c.kind === 'channel' && !!c.projectKey)
    ),
    channels: active.filter(c =>
      c.kind === 'custom_channel' ||
      (c.kind === 'channel' && !c.projectKey)
    ),
    dms: active.filter(c => c.kind === 'dm' || c.kind === 'group_dm'),
    archived,
  };
}

const SECTIONS: SectionConfig[] = [
  { id: 'projects',  label: 'Projects' },
  { id: 'channels',  label: 'Channels' },
  { id: 'dms',       label: 'Direct Messages' },
  { id: 'archived',  label: 'Archived' },
];

const ChevronIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <path d="M6 9l6 6 6-6"/>
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);
const CollapseIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
);
const ExpandIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M9 18l6-6-6-6"/>
  </svg>
);

function SectionHeader({
  label,
  count,
  expanded,
  onToggle,
}: {
  label: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className="c-sb-section__head"
      onClick={onToggle}
      aria-expanded={expanded}
    >
      <span className="c-sb-section__chev">
        <ChevronIcon />
      </span>
      <span className="c-sb-section__lbl">{label}</span>
      {count > 0 && <span className="c-sb-section__count">{count}</span>}
    </button>
  );
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onToggleCollapse,
  isCollapsed,
}: ConversationSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    projects: true,
    channels: true,
    dms: true,
    archived: false,
  });
  const [searchQuery, setSearchQuery] = useState('');

  const { hits, isLoading: isSearching, isEnabled: searchActive } = useChatSearch(searchQuery, 'all', 20);

  const dmConvIds = useMemo(
    () => conversations.filter(c => c.kind === 'dm' || c.kind === 'group_dm').map(c => c.id),
    [conversations],
  );
  const dmOnline = useDMPresence(dmConvIds);

  const clearSearch = useCallback(() => setSearchQuery(''), []);

  // Build a map of conversationId → ChatConversation for quick lookup in search results
  const convById = useMemo(() => {
    const m = new Map<string, ChatConversation>();
    for (const c of conversations) m.set(c.id, c);
    return m;
  }, [conversations]);

  const grouped = useMemo(() => {
    const active = conversations.filter(c => !c.isArchived);
    const archived = conversations.filter(c => c.isArchived);
    return {
      projects: active.filter(c =>
        c.kind === 'ticket' ||
        (c.kind === 'channel' && !!c.projectKey)
      ),
      channels: active.filter(c =>
        c.kind === 'custom_channel' ||
        (c.kind === 'channel' && !c.projectKey)
      ),
      dms: active.filter(c => c.kind === 'dm' || c.kind === 'group_dm'),
      archived,
    };
  }, [conversations]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const sectionData: Record<string, ChatConversation[]> = grouped;

  return (
    <aside className="c-chat-sidebar" aria-label="Conversations">
      {/* Header */}
      <div className="c-sb-head">
        {!isCollapsed && (
          <h1 className="c-sb-head__title">Conversations</h1>
        )}
        <div className="c-sb-head__actions">
          {!isCollapsed && onNewConversation && (
            <button
              className="c-sb-head__btn hide-collapsed"
              aria-label="New conversation"
              title="New conversation"
              onClick={onNewConversation}
            >
              <PlusIcon />
            </button>
          )}
          <button
            className="c-sb-head__btn"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isCollapsed}
            onClick={onToggleCollapse}
          >
            {isCollapsed ? <ExpandIcon /> : <CollapseIcon />}
          </button>
        </div>
      </div>

      {/* Search input — hidden when collapsed */}
      {!isCollapsed && (
        <div className="c-sb-search">
          <span className="c-sb-search__icon" aria-hidden="true"><SearchIcon /></span>
          <input
            className="c-sb-search__input"
            type="search"
            placeholder="Search conversations…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Search conversations"
          />
          {searchQuery && (
            <button className="c-sb-search__clear" onClick={clearSearch} aria-label="Clear search">
              <CloseIcon />
            </button>
          )}
        </div>
      )}

      {/* Scrollable conversation list */}
      <nav className="c-sb-scroll" aria-label="Conversation list">
        {searchActive ? (
          /* ── Search results ── */
          isSearching ? (
            <div className="c-sb-search-status">Searching…</div>
          ) : hits.length === 0 ? (
            <div className="c-sb-search-status">No results for "{searchQuery}"</div>
          ) : (
            <div className="c-sb-section">
              <div className="c-sb-section__head c-sb-section__head--plain">
                Results
              </div>
              {hits.map(hit => {
                const conv = hit.conversationId ? convById.get(hit.conversationId) : undefined;
                return (
                  <button
                    key={`${hit.resultType}-${hit.id}`}
                    className={`c-sb-search-hit${conv && conv.id === activeConversationId ? ' c-sb-search-hit--active' : ''}`}
                    onClick={() => {
                      clearSearch();
                      if (conv) onSelectConversation(conv.id);
                      else if (hit.conversationId) onSelectConversation(hit.conversationId);
                    }}
                    title={hit.subtitle ?? hit.title}
                  >
                    <span className="c-sb-search-hit__type">{hit.resultType[0].toUpperCase()}</span>
                    <span className="c-sb-search-hit__body">
                      <span className="c-sb-search-hit__title">{hit.title}</span>
                      {hit.subtitle && (
                        <span className="c-sb-search-hit__sub">{hit.subtitle}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )
        ) : (
          /* ── Normal sections ── */
          SECTIONS.map(section => {
            const items = sectionData[section.id] ?? [];
            if (items.length === 0) return null;
            const isExpanded = expandedSections[section.id] ?? true;

            return (
              <div key={section.id} className="c-sb-section">
                <SectionHeader
                  label={section.label}
                  count={items.filter(c => c.unreadCount > 0).length}
                  expanded={isExpanded}
                  onToggle={() => toggleSection(section.id)}
                />
                {isExpanded && items.map(conv => (
                  <ConversationRow
                    key={conv.id}
                    conversation={conv}
                    isActive={conv.id === activeConversationId}
                    onSelect={onSelectConversation}
                    isOnline={
                      (conv.kind === 'dm' || conv.kind === 'group_dm')
                        ? (dmOnline.get(conv.id) ?? false)
                        : undefined
                    }
                  />
                ))}
              </div>
            );
          })
        )}
      </nav>
    </aside>
  );
}
