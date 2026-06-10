/**
 * MessageSearchPanel — search input + results, integrated in MessageStream.
 *
 * Handles:
 * - Opening/closing search (Ctrl+F or Cmd+F)
 * - Navigation through results (Arrow keys)
 * - Scroll to selected message
 * - Keyboard and mouse interactions
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useMessageSearch } from '@/hooks/chat/useMessageSearch';
import { MessageSearchInput } from './MessageSearchInput';
import { MessageSearchResults, type SearchResult } from './MessageSearchResults';
import type { ChatMessage } from '@/types/chat';
import { useTicketRefSearch, isFullTicketKey } from '@/hooks/chat/useTicketRefSearch';
import { openConversationInDock } from '@/lib/chat-dock-bridge';
import './message-search.css';

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
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const { results, search, query } = useMessageSearch(conversationId);

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

  return (
    <>
      <MessageSearchInput
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSearch={search}
        resultCount={results.length}
        selectedIndex={selectedIndex}
        onNavigate={handleNavigate}
        onSelectResult={handleSelectFromKeyboard}
      />

      {isOpen && ticketKeyQuery && ticketConvs.length > 0 && (
        <div
          className="msg-search-ticket-refs"
          data-testid="ticket-ref-section"
          style={{ padding: '8px 12px', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}
        >
          <div
            style={{
              fontSize: 12,
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
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>
                {c.title}
              </span>
              <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', marginLeft: 8 }}>
                {c.matchCount} {c.matchCount === 1 ? 'mention' : 'mentions'}
              </span>
            </button>
          ))}
        </div>
      )}

      {isOpen && query && (
        <MessageSearchResults
          results={results}
          selectedIndex={selectedIndex}
          onSelect={(messageId) => {
            setSelectedIndex(results.findIndex((r) => r.message.id === messageId));
            handleSelectResult(messageId);
          }}
        />
      )}
    </>
  );
}

export default MessageSearchPanel;
