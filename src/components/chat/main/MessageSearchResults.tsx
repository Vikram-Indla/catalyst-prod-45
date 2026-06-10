/**
 * MessageSearchResults — matching messages grouped by conversation.
 *
 * Features:
 * - Conversation header rows (kind icon + title) above each group
 * - Highlights matching text in snippet
 * - Click to scroll to message; keyboard navigation (selected = blue)
 * - Empty state with clear-filters CTA
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
  conversationId: string;
  conversationTitle: string;
  conversationKind: string;
}

export interface MessageSearchResultsProps {
  results: SearchResult[];
  selectedIndex: number;
  onSelect: (messageId: string, index: number) => void;
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

function highlightMatch(before: string, match: string, after: string): React.ReactNode {
  if (!match) return <>{after || before}</>;
  return (
    <>
      {before}
      <mark className="cc-msg-search-highlight">{match}</mark>
      {after}
    </>
  );
}

function kindGlyph(kind: string): string {
  switch (kind) {
    case 'dm':
      return '@';
    case 'group_dm':
      return '@@';
    case 'ticket':
      return '◫';
    default:
      return '#';
  }
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

interface ConversationGroup {
  conversationId: string;
  title: string;
  kind: string;
  items: { result: SearchResult; index: number }[];
}

function groupByConversation(results: SearchResult[]): ConversationGroup[] {
  const groups: ConversationGroup[] = [];
  const byId = new Map<string, ConversationGroup>();
  results.forEach((result, index) => {
    let g = byId.get(result.conversationId);
    if (!g) {
      g = {
        conversationId: result.conversationId,
        title: result.conversationTitle,
        kind: result.conversationKind,
        items: [],
      };
      byId.set(result.conversationId, g);
      groups.push(g);
    }
    g.items.push({ result, index });
  });
  return groups;
}

export function MessageSearchResults({
  results,
  selectedIndex,
  onSelect,
  hasFilters = false,
  onClearFilters,
}: MessageSearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="cc-msg-search-empty">
        <div className="cc-msg-search-empty-text">
          {hasFilters ? 'No results — try removing filters' : 'No messages found'}
        </div>
        {hasFilters && onClearFilters && (
          <button
            type="button"
            className="cc-msg-search-clear-filters"
            onClick={onClearFilters}
          >
            Clear filters
          </button>
        )}
      </div>
    );
  }

  const groups = groupByConversation(results);

  return (
    <div className="cc-msg-search-results" role="listbox">
      {groups.map((group) => (
        <div key={group.conversationId} className="cc-msg-search-group">
          <div className="cc-msg-search-group-header">
            <span className="cc-msg-search-group-glyph" aria-hidden="true">
              {kindGlyph(group.kind)}
            </span>
            <span className="cc-msg-search-group-title">{group.title}</span>
            <span className="cc-msg-search-group-count">
              {group.items.length} {group.items.length === 1 ? 'result' : 'results'}
            </span>
          </div>

          {group.items.map(({ result, index }) => {
            const isSelected = index === selectedIndex;
            const msgDate = new Date(result.message.createdAt);
            const timeStr = formatTime(msgDate);

            return (
              <button
                key={result.message.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`cc-msg-search-result ${isSelected ? 'cc-msg-search-result--selected' : ''}`}
                onClick={() => onSelect(result.message.id, index)}
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
                    <span className="cc-msg-search-result-author">
                      {result.message.authorName}
                    </span>
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
      ))}
    </div>
  );
}

export default MessageSearchResults;
