/**
 * MessageSearchInput — search control at top of conversation pane.
 *
 * Features:
 * - Placeholder "Search messages…"
 * - Keyboard: Escape to close, Arrow Up/Down to navigate results
 * - Displays "N of M" result counter
 * - Click or Enter to select a result
 */
import React, { useEffect, useRef, useState } from 'react';
import './message-search.css';

export interface MessageSearchInputProps {
  conversationId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  resultCount?: number;
  selectedIndex?: number;
  onNavigate?: (direction: 'up' | 'down') => void;
  onSelectResult?: () => void;
}

export function MessageSearchInput({
  isOpen,
  onClose,
  onSearch,
  resultCount = 0,
  selectedIndex = 0,
  onNavigate,
  onSelectResult,
}: MessageSearchInputProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus input when opened, clear when closed
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setQuery(value);
    onSearch(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onNavigate?.('up');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onNavigate?.('down');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onSelectResult?.();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cc-msg-search-wrap">
      <div className="cc-msg-search-input">
        <svg
          viewBox="0 0 24 24"
          width={16}
          height={16}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="cc-msg-search-icon"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="cc-msg-search-field"
          placeholder="Search messages…"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          aria-label="Search messages in conversation"
        />
        {query && (
          <button
            type="button"
            className="cc-msg-search-clear"
            onClick={() => {
              setQuery('');
              onSearch('');
            }}
            aria-label="Clear search"
            title="Clear search"
          >
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        {query && resultCount > 0 && (
          <span className="cc-msg-search-count">
            {selectedIndex + 1} of {resultCount}
          </span>
        )}
      </div>
    </div>
  );
}

export default MessageSearchInput;
