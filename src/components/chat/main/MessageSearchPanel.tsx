/**
 * MessageSearchPanel — search input + filter chips + results, integrated in MessageStream.
 *
 * Handles:
 * - Opening/closing search (Ctrl+F or Cmd+F)
 * - Filter chips: Person / Project / Ticket / Type (ChatSearchFilters)
 * - Query operators: from:@name, in:#channel, key:BAU-123, "phrase", -term
 * - Recent searches (last 5, localStorage) shown when input is empty
 * - Navigation through results (Arrow keys), scroll to selected message
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useMessageSearch } from '@/hooks/chat/useMessageSearch';
import { MessageSearchInput } from './MessageSearchInput';
import { MessageSearchResults } from './MessageSearchResults';
import type { ChatMessage } from '@/types/chat';
import { useTicketRefSearch, isFullTicketKey } from '@/hooks/chat/useTicketRefSearch';
import { openConversationInDock } from '@/lib/chat-dock-bridge';
import {
  ChatSearchFilters,
  EMPTY_CHAT_SEARCH_FILTERS,
  hasActiveFilters,
  type ChatSearchFilterState,
} from './ChatSearchFilters';
import './message-search.css';

const RECENT_SEARCHES_KEY = 'cc-chat-recent-searches';
const RECENT_SEARCHES_MAX = 5;

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(q: string): string[] {
  const trimmed = q.trim();
  if (!trimmed) return loadRecentSearches();
  const next = [trimmed, ...loadRecentSearches().filter((s) => s !== trimmed)].slice(
    0,
    RECENT_SEARCHES_MAX,
  );
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode — non-fatal */
  }
  return next;
}

export interface MessageSearchPanelProps {
  conversationId?: string | null;
  messages: ChatMessage[];
  onScrollToMessage?: (messageId: string) => void;
}

export function MessageSearchPanel({
  conversationId,
  messages,
  onScrollToMessage,
}: MessageSearchPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filters, setFilters] = useState<ChatSearchFilterState>(EMPTY_CHAT_SEARCH_FILTERS);
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches);
  const [injectedQuery, setInjectedQuery] = useState<string | undefined>(undefined);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { results, search, query } = useMessageSearch(conversationId, filters);

  // Ticket-key mode: when the query IS a ticket key (e.g. "BAU-5757"),
  // also surface every conversation whose messages mention that key
  // (chat_message_issue_refs, server-extracted).
  const ticketKeyQuery = isFullTicketKey(query) ? query.trim().toUpperCase() : '';
  const { data: ticketConvs = [] } = useTicketRefSearch(query);

  // Global keyboard shortcut (Cmd+F / Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsOpen((v) => !v);
        setSelectedIndex(0);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  // Re-run search when filter chips change while panel is open
  useEffect(() => {
    if (!isOpen) return;
    search(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleSearch = useCallback(
    (q: string) => {
      setInjectedQuery(undefined);
      search(q);
      // Persist to recent searches after the user pauses typing
      if (persistTimer.current) clearTimeout(persistTimer.current);
      if (q.trim()) {
        persistTimer.current = setTimeout(() => {
          setRecentSearches(saveRecentSearch(q));
        }, 1500);
      }
    },
    [search],
  );

  const handleRecentClick = useCallback(
    (q: string) => {
      setInjectedQuery(q);
      search(q);
      setRecentSearches(saveRecentSearch(q));
    },
    [search],
  );

  const handleNavigate = useCallback(
    (direction: 'up' | 'down') => {
      if (results.length === 0) return;

      setSelectedIndex((prev) => {
        if (direction === 'down') {
          return (prev + 1) % results.length;
        } else {
          return (prev - 1 + results.length) % results.length;
        }
      });
    },
    [results.length],
  );

  const handleSelectResult = useCallback(
    (messageId: string) => {
      if (onScrollToMessage) {
        onScrollToMessage(messageId);
      }
      // Keep search panel open for further searches
    },
    [onScrollToMessage],
  );

  const handleSelectFromKeyboard = useCallback(() => {
    if (results.length > 0 && selectedIndex >= 0 && selectedIndex < results.length) {
      handleSelectResult(results[selectedIndex].message.id);
    }
  }, [results, selectedIndex, handleSelectResult]);

  const filtersActive = hasActiveFilters(filters);
  const clearFilters = useCallback(() => setFilters(EMPTY_CHAT_SEARCH_FILTERS), []);

  return (
    <>
      <MessageSearchInput
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSearch={handleSearch}
        resultCount={results.length}
        selectedIndex={selectedIndex}
        onNavigate={handleNavigate}
        onSelectResult={handleSelectFromKeyboard}
        value={injectedQuery}
      />

      {isOpen && <ChatSearchFilters filters={filters} onChange={setFilters} />}

      {isOpen && !query && recentSearches.length > 0 && (
        <div className="cc-msg-search-recent" data-testid="chat-search-recent">
          <div className="cc-msg-search-recent-title">Recent searches</div>
          {recentSearches.map((q) => (
            <button
              key={q}
              type="button"
              className="cc-msg-search-recent-item"
              onClick={() => handleRecentClick(q)}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {isOpen && ticketKeyQuery && ticketConvs.length > 0 && (
        <div
          className="msg-search-ticket-refs"
          data-testid="ticket-ref-section"
          style={{ padding: '8px 12px', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}
        >
          <div
            style={{
              fontSize: 'var(--ds-font-size-200)',
              fontWeight: 600,
              color: 'var(--ds-text-subtlest, #6B778C)',
              marginBottom: 4,
            }}
          >
            Conversations mentioning {ticketKeyQuery}
          </div>
          {ticketConvs.map((c) => (
            <button
              key={c.conversationId}
              type="button"
              onClick={() => openConversationInDock(c.conversationId)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '4px 8px',
                border: 'none',
                background: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                font: 'inherit',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,.06))')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>
                {c.title}
              </span>
              <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, #6B778C)', marginLeft: 8 }}>
                {c.matchCount} {c.matchCount === 1 ? 'mention' : 'mentions'}
              </span>
            </button>
          ))}
        </div>
      )}

      {isOpen && (query || filtersActive) && (
        <MessageSearchResults
          results={results}
          selectedIndex={selectedIndex}
          onSelect={(messageId) => {
            setSelectedIndex(results.findIndex((r) => r.message.id === messageId));
            handleSelectResult(messageId);
          }}
          hasFilters={filtersActive}
          onClearFilters={clearFilters}
        />
      )}
    </>
  );
}

export default MessageSearchPanel;
