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
