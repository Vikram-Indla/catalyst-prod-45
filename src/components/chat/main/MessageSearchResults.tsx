/**
 * MessageSearchResults — list of matching messages with snippet preview.
 *
 * Features:
 * - Shows matched message with author, timestamp, and snippet
 * - Highlights matching text in snippet (yellow background)
 * - Click to scroll to message
 * - Keyboard navigation (selected result has blue background)
 * - Shows "0 results" state
 */
import React from 'react';
import type { ChatMessage } from '@/types/chat';
import { Avatar, colorFor } from './avatar';
import './message-search.css';

export interface SearchResult {
  message: ChatMessage;
  matchIndex: number; // Index in the full results array
  snippetBefore: string; // Text before match
  matchedText: string; // The actual matched text
  snippetAfter: string; // Text after match
}

export interface MessageSearchResultsProps {
  results: SearchResult[];
  selectedIndex: number;
  onSelect: (messageId: string, index: number) => void;
}

function highlightMatch(before: string, match: string, after: string): React.ReactNode {
  return (
    <>
      {before}
      <mark className="cc-msg-search-highlight">{match}</mark>
      {after}
    </>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDate.getTime() === today.getTime()) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  if (msgDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function MessageSearchResults({
  results,
  selectedIndex,
  onSelect,
}: MessageSearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="cc-msg-search-empty">
        <div className="cc-msg-search-empty-text">No messages found</div>
      </div>
    );
  }

  return (
    <div className="cc-msg-search-results" role="listbox">
      {results.map((result, idx) => {
        const isSelected = idx === selectedIndex;
        const msgDate = new Date(result.message.createdAt);
        const timeStr = formatTime(msgDate);

        return (
          <button
            key={result.message.id}
            type="button"
            role="option"
            aria-selected={isSelected}
            className={`cc-msg-search-result ${isSelected ? 'cc-msg-search-result--selected' : ''}`}
            onClick={() => onSelect(result.message.id, idx)}
          >
            <div className="cc-msg-search-result-avatar">
              <Avatar
                name={result.message.authorName}
                seed={result.message.authorId}
                color={colorFor(result.message.authorId)}
                size={32}
              />
            </div>

            <div className="cc-msg-search-result-content">
              <div className="cc-msg-search-result-header">
                <span className="cc-msg-search-result-author">{result.message.authorName}</span>
                <span className="cc-msg-search-result-time">{timeStr}</span>
              </div>

              <div className="cc-msg-search-result-snippet">
                {highlightMatch(result.snippetBefore, result.matchedText, result.snippetAfter)}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default MessageSearchResults;
