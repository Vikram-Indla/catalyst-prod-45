/**
 * useMessageSearch — search chat messages.
 *
 * Features:
 * - Full-text search via Postgres tsvector on body_text
 * - Operator parsing: from:@name, in:#channel, key:BAU-123, "phrase", -term
 *   (src/lib/chat/search-query.ts). Filter chips win over operators on conflict.
 * - Cross-conversation search when any filter/operator widens scope;
 *   otherwise scoped to the current conversation.
 * - Limit 50 results, snippets ±30 chars around match.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { ChatMessage } from '@/types/chat';
import { parseChatSearchQuery } from '@/lib/chat/search-query';
import { resolveAvatarUrl } from '@/lib/avatars';
import type { ChatSearchFilterState } from '@/components/chat/main/ChatSearchFilters';
import { EMPTY_CHAT_SEARCH_FILTERS, hasActiveFilters } from '@/components/chat/main/ChatSearchFilters';

export interface SearchResult {
  message: ChatMessage;
  matchIndex: number;
  snippetBefore: string;
  matchedText: string;
  snippetAfter: string;
  conversationId: string;
  conversationTitle: string;
  conversationKind: string;
}

const SNIPPET_CONTEXT = 30; // chars before/after match

function buildSnippet(bodyText: string, term: string) {
  const lowerText = bodyText.toLowerCase();
  const matchPos = term ? lowerText.indexOf(term.toLowerCase()) : -1;
  if (matchPos === -1) {
    const end = Math.min(bodyText.length, 80);
    return {
      snippetBefore: '',
      matchedText: '',
      snippetAfter: bodyText.substring(0, end) + (end < bodyText.length ? '…' : ''),
    };
  }
  const start = Math.max(0, matchPos - SNIPPET_CONTEXT);
  const end = Math.min(bodyText.length, matchPos + term.length + SNIPPET_CONTEXT);
  const snippetBefore = (start > 0 ? '…' : '') + bodyText.substring(start, matchPos);
  const matchedText = bodyText.substring(matchPos, matchPos + term.length);
  const snippetAfter =
    bodyText.substring(matchPos + term.length, end) + (end < bodyText.length ? '…' : '');
  return { snippetBefore, matchedText, snippetAfter };
}

export function useMessageSearch(
  conversationId: string | null | undefined,
  filters: ChatSearchFilterState = EMPTY_CHAT_SEARCH_FILTERS,
) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState('');
  const runId = useRef(0);

  const search = useCallback(
    async (q: string) => {
      const filtersActive = hasActiveFilters(filters);
      if (!q.trim() && !filtersActive) {
        setResults([]);
        setQuery('');
        return;
      }

      setQuery(q);
      setIsSearching(true);
      const myRun = ++runId.current;

      try {
        const parsed = parseChatSearchQuery(q);

        // Chips win over operators per dimension.
        const authorIds = filters.authorIds;
        const fromNames = authorIds.length > 0 ? [] : parsed.from;
        const projectKeys = filters.projectKeys;
        const channelNames = projectKeys.length > 0 ? [] : parsed.channels;
        const issueKeys = filters.issueKeys.length > 0 ? filters.issueKeys : parsed.keys;
        const kinds = filters.kinds;

        const sb = supabase as any;

        // Resolve from:@name → author ids
        let resolvedAuthorIds = authorIds;
        if (fromNames.length > 0) {
          const ors = fromNames.map((n) => `full_name.ilike.%${n}%`).join(',');
          const { data: profs } = await sb.from('profiles').select('id').or(ors).limit(50);
          resolvedAuthorIds = (profs ?? []).map((p: any) => p.id);
          if (resolvedAuthorIds.length === 0) {
            if (runId.current === myRun) setResults([]);
            return;
          }
        }

        // Resolve conversation scope (project / in:#channel / kind)
        let conversationIds: string[] | null = null;
        const needConvFilter =
          projectKeys.length > 0 || channelNames.length > 0 || kinds.length > 0;
        if (needConvFilter) {
          let cq = sb.from('chat_conversations').select('id');
          if (projectKeys.length > 0) cq = cq.in('project_key', projectKeys);
          if (channelNames.length > 0) {
            cq = cq.or(channelNames.map((n) => `title.ilike.%${n}%`).join(','));
          }
          if (kinds.length > 0) cq = cq.in('kind', kinds);
          const { data: convs } = await cq.limit(200);
          conversationIds = (convs ?? []).map((c: any) => c.id);
          if (conversationIds.length === 0) {
            if (runId.current === myRun) setResults([]);
            return;
          }
        }

        // Resolve ticket keys → message ids
        let messageIds: string[] | null = null;
        if (issueKeys.length > 0) {
          const { data: refs } = await sb
            .from('chat_message_issue_refs')
            .select('message_id')
            .in('issue_key', issueKeys)
            .limit(500);
          messageIds = (refs ?? []).map((r: any) => r.message_id);
          if (messageIds.length === 0) {
            if (runId.current === myRun) setResults([]);
            return;
          }
        }

        const widenScope =
          filtersActive || fromNames.length > 0 || channelNames.length > 0 || issueKeys.length > 0;

        let mq = sb
          .from('chat_messages')
          .select(
            `
            id,
            conversation_id,
            parent_id,
            author_id,
            author:profiles(id, full_name, avatar_url),
            conversation:chat_conversations(id, title, kind),
            body_text,
            body_adf,
            created_at,
            edited_at,
            deleted_at
            `,
          )
          .is('deleted_at', null);

        if (conversationIds) {
          mq = mq.in('conversation_id', conversationIds);
        } else if (!widenScope) {
          if (!conversationId) {
            if (runId.current === myRun) setResults([]);
            return;
          }
          mq = mq.eq('conversation_id', conversationId);
        }
        if (resolvedAuthorIds.length > 0) mq = mq.in('author_id', resolvedAuthorIds);
        if (messageIds) mq = mq.in('id', messageIds);

        const ftsText = [parsed.text, ...parsed.phrases].filter(Boolean).join(' ');
        if (ftsText) {
          mq = mq.textSearch('body_text', ftsText, { config: 'english', type: 'plain' });
        }

        const { data, error } = await mq.order('created_at', { ascending: true }).limit(50);

        if (runId.current !== myRun) return;

        if (error) {
          console.error('Message search error:', error);
          setResults([]);
          return;
        }

        const highlightTerm = parsed.phrases[0] || parsed.text.split(/\s+/)[0] || '';

        const searchResults: SearchResult[] = (data ?? [])
          .filter((row: any) => {
            const lower = (row.body_text || '').toLowerCase();
            if (parsed.phrases.some((p) => !lower.includes(p.toLowerCase()))) return false;
            if (parsed.exclude.some((x) => lower.includes(x.toLowerCase()))) return false;
            return true;
          })
          .map((row: any, idx: number) => {
            const message: ChatMessage = {
              id: row.id,
              conversationId: row.conversation_id,
              parentId: row.parent_id,
              authorId: row.author_id,
              authorName: row.author?.full_name || 'Unknown',
              authorAvatarUrl: resolveAvatarUrl(row.author?.full_name ?? null) ?? row.author?.avatar_url ?? null,
              bodyText: row.body_text,
              bodyAdf: row.body_adf,
              createdAt: row.created_at,
              editedAt: row.edited_at,
              deletedAt: row.deleted_at,
              reactions: [],
              replyCount: 0,
              lastReplyAt: null,
              isAlsoInChannel: false,
            };
            return {
              message,
              matchIndex: idx,
              ...buildSnippet(row.body_text || '', highlightTerm),
              conversationId: row.conversation_id,
              conversationTitle: row.conversation?.title || 'Untitled conversation',
              conversationKind: row.conversation?.kind || 'channel',
            };
          });

        setResults(searchResults);
      } catch (err) {
        console.error('Search exception:', err);
        if (runId.current === myRun) setResults([]);
      } finally {
        if (runId.current === myRun) setIsSearching(false);
      }
    },
    [conversationId, filters],
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
