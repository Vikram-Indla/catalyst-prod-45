/**
 * useMessageSearch — search chat messages in current conversation.
 *
 * Features:
 * - Full-text search via Postgres tsvector
 * - Limit 50 results
 * - Extracts snippets (±30 chars around match)
 * - Returns SearchResult[] with highlighted text
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { ChatMessage } from '@/types/chat';

export interface SearchResult {
  message: ChatMessage;
  matchIndex: number;
  snippetBefore: string;
  matchedText: string;
  snippetAfter: string;
}

const SNIPPET_CONTEXT = 30; // chars before/after match

export function useMessageSearch(conversationId: string | null | undefined) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState('');

  const search = useCallback(
    async (q: string) => {
      if (!conversationId || !q.trim()) {
        setResults([]);
        setQuery('');
        return;
      }

      setQuery(q);
      setIsSearching(true);

      try {
        // Query full-text search using Postgres tsvector.
        // textSearch() uses plainto_tsquery for word-based matching.
        // LIMIT 50 results. Order by created_at ASC for chronological order.
        const db = supabase as unknown as {
          from: (table: string) => {
            select: (cols: string) => {
              eq: (col: string, val: any) => {
                is: (col: string, val: any) => {
                  textSearch: (col: string, query: string, opts: any) => {
                    order: (col: string, opts: any) => {
                      limit: (n: number) => Promise<{ data: any[]; error: any }>;
                    };
                  };
                };
              };
            };
          };
        };

        const { data, error } = await db
          .from('chat_messages')
          .select(
            `
            id,
            conversation_id,
            parent_id,
            author_id,
            author:profiles(id, full_name, avatar_url),
            body_text,
            body_adf,
            created_at,
            edited_at,
            deleted_at
            `,
          )
          .eq('conversation_id', conversationId)
          .is('deleted_at', null)
          .textSearch('body_text', q, { config: 'english', type: 'plain' })
          .order('created_at', { ascending: true })
          .limit(50);

        if (error) {
          console.error('Message search error:', error);
          setResults([]);
          setIsSearching(false);
          return;
        }

        if (!data || data.length === 0) {
          setResults([]);
          setIsSearching(false);
          return;
        }

        // Map database rows to ChatMessage + extract snippets
        // Data is ordered chronologically (ASC), so oldest first.
        const searchResults: SearchResult[] = data
          .map((row: any, idx: number) => {
            const message: ChatMessage = {
              id: row.id,
              conversationId: row.conversation_id,
              parentId: row.parent_id,
              authorId: row.author_id,
              authorName: row.author?.full_name || 'Unknown',
              authorAvatarUrl: row.author?.avatar_url || null,
              bodyText: row.body_text,
              bodyAdf: row.body_adf,
              createdAt: row.created_at,
              editedAt: row.edited_at,
              deletedAt: row.deleted_at,
              reactions: [],
              replyCount: 0,
            };

            // Extract snippet with match highlight
            const lowerText = row.body_text.toLowerCase();
            const lowerQuery = q.toLowerCase();
            const matchPos = lowerText.indexOf(lowerQuery);

            if (matchPos === -1) {
              // Shouldn't happen if full-text matched, but handle gracefully
              return null;
            }

            // Extract context around match
            const start = Math.max(0, matchPos - SNIPPET_CONTEXT);
            const end = Math.min(row.body_text.length, matchPos + q.length + SNIPPET_CONTEXT);
            const snippetBefore = row.body_text.substring(start, matchPos);
            const matchedText = row.body_text.substring(matchPos, matchPos + q.length);
            const snippetAfter = row.body_text.substring(matchPos + q.length, end);

            // Add ellipsis if truncated
            const before = start > 0 ? '…' + snippetBefore : snippetBefore;
            const after = end < row.body_text.length ? snippetAfter + '…' : snippetAfter;

            return {
              message,
              matchIndex: idx,
              snippetBefore: before,
              matchedText,
              snippetAfter: after,
            };
          })
          .filter((r): r is SearchResult => r !== null);

        setResults(searchResults);
      } catch (err) {
        console.error('Search exception:', err);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [conversationId],
  );

  // Reset results when conversation changes
  useEffect(() => {
    if (!conversationId) {
      setResults([]);
      setQuery('');
    }
  }, [conversationId]);

  return {
    results,
    query,
    isSearching,
    search,
  };
}
