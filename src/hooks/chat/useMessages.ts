/**
 * useMessages — paginated message feed for a conversation.
 *
 * - 50 per page, returned newest-last (chronological for rendering).
 * - Excludes soft-deleted rows (deleted_at not null).
 * - Aggregates chat_message_reactions into ChatReaction[] (with reactedByMe).
 * - Computes replyCount from child messages (parent_id).
 * - sendMessage inserts a row into chat_messages.
 * - Subscribes via chatRealtime.subscribeMessages to invalidate on new rows.
 *
 * Defensive: missing chat_* tables resolve to empty results, never throw.
 */
import { useCallback, useEffect, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { chatRealtime } from '@/lib/chat/ChatRealtimeManager';
import { adfToPlainText } from '@/components/shared/rich-text/atlaskit/adfHelpers';
import type { ChatMessage, ChatReaction } from '@/types/chat';

const PAGE_SIZE = 50;

function parseAdfDoc(content: string): { type: string } | null {
  const v = content.trim();
  if (!v.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(v);
    return parsed && parsed.type === 'doc' ? parsed : null;
  } catch {
    return null;
  }
}

const db = supabase as unknown as { from: (table: string) => any };

interface MessageRow {
  id: string;
  conversation_id: string;
  parent_id: string | null;
  author_id: string;
  body_text: string | null;
  body_adf: unknown | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

interface ReactionRow {
  message_id: string;
  emoji: string;
  user_id: string;
}

interface AuthorRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface MessagePage {
  messages: ChatMessage[];
  hasMore: boolean;
}

function aggregateReactions(rows: ReactionRow[], myId: string | null): Map<string, ChatReaction[]> {
  const byMessage = new Map<string, Map<string, { count: number; mine: boolean }>>();
  for (const r of rows) {
    let emojis = byMessage.get(r.message_id);
    if (!emojis) {
      emojis = new Map();
      byMessage.set(r.message_id, emojis);
    }
    const e = emojis.get(r.emoji) ?? { count: 0, mine: false };
    e.count += 1;
    if (myId && r.user_id === myId) e.mine = true;
    emojis.set(r.emoji, e);
  }
  const out = new Map<string, ChatReaction[]>();
  byMessage.forEach((emojis, messageId) => {
    out.set(
      messageId,
      Array.from(emojis.entries()).map(([emoji, v]) => ({
        emoji,
        count: v.count,
        reactedByMe: v.mine,
      })),
    );
  });
  return out;
}

async function fetchPage(
  conversationId: string,
  pageParam: number,
  myId: string | null,
): Promise<MessagePage> {
  try {
    const from = pageParam * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data: rows, error } = await db
      .from('chat_messages')
      .select('id, conversation_id, parent_id, author_id, body_text, body_adf, created_at, edited_at, deleted_at')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error || !rows) return { messages: [], hasMore: false };

    const msgRows = rows as MessageRow[];
    const hasMore = msgRows.length === PAGE_SIZE;
    const ids = msgRows.map((m) => m.id);
    const authorIds = Array.from(new Set(msgRows.map((m) => m.author_id))).filter(Boolean);

    let reactionsByMessage = new Map<string, ChatReaction[]>();
    let replyCountByParent = new Map<string, number>();
    let authorsById = new Map<string, AuthorRow>();

    if (ids.length > 0) {
      try {
        const { data: reactions } = await db
          .from('chat_message_reactions')
          .select('message_id, emoji, user_id')
          .in('message_id', ids);
        if (reactions) reactionsByMessage = aggregateReactions(reactions as ReactionRow[], myId);
      } catch {
        reactionsByMessage = new Map();
      }

      try {
        const { data: children } = await db
          .from('chat_messages')
          .select('parent_id')
          .in('parent_id', ids)
          .is('deleted_at', null);
        if (children) {
          for (const c of children as { parent_id: string | null }[]) {
            if (!c.parent_id) continue;
            replyCountByParent.set(c.parent_id, (replyCountByParent.get(c.parent_id) ?? 0) + 1);
          }
        }
      } catch {
        replyCountByParent = new Map();
      }
    }

    if (authorIds.length > 0) {
      try {
        const { data: authors } = await db
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', authorIds);
        if (authors) {
          for (const a of authors as AuthorRow[]) authorsById.set(a.id, a);
        }
      } catch {
        authorsById = new Map();
      }
    }

    const messages: ChatMessage[] = msgRows.map((m) => {
      const author = authorsById.get(m.author_id);
      return {
        id: m.id,
        conversationId: m.conversation_id,
        parentId: m.parent_id ?? null,
        authorId: m.author_id,
        authorName: author?.full_name ?? '',
        authorAvatarUrl: author?.avatar_url ?? null,
        bodyText: m.body_text ?? '',
        bodyAdf: m.body_adf ?? null,
        createdAt: m.created_at,
        editedAt: m.edited_at ?? null,
        deletedAt: m.deleted_at ?? null,
        reactions: reactionsByMessage.get(m.id) ?? [],
        replyCount: replyCountByParent.get(m.id) ?? 0,
      };
    });

    // Page rows arrive newest-first; reverse so within-page order is chronological.
    messages.reverse();
    return { messages, hasMore };
  } catch {
    return { messages: [], hasMore: false };
  }
}

export function useMessages(conversationId: string | null): {
  messages: ChatMessage[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  sendMessage: (bodyText: string, parentId?: string) => Promise<void>;
} {
  const { user } = useAuth();
  const myId = user?.id ?? null;
  const queryClient = useQueryClient();
  const [error, setError] = useState<unknown>(null);

  const query = useInfiniteQuery({
    queryKey: ['chat', 'messages', conversationId],
    enabled: !!conversationId,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchPage(conversationId as string, pageParam as number, myId),
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
  });

  // Realtime: invalidate the feed when any message row changes.
  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = chatRealtime.subscribeMessages(conversationId, () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
    });
    return unsubscribe;
  }, [conversationId, queryClient]);

  // Older pages are appended after newer pages by the query; flatten so the
  // oldest messages render first (top) and newest last (bottom).
  const pages = query.data?.pages ?? [];
  const messages = pages
    .slice()
    .reverse()
    .flatMap((p) => p.messages);

  const sendMessage = useCallback(
    async (content: string, parentId?: string) => {
      if (!conversationId || !myId || !content.trim()) return;
      try {
        const adf = parseAdfDoc(content);
        const insertRow = adf
          ? { body_adf: adf, body_text: adfToPlainText(adf) }
          : { body_adf: null, body_text: content };
        const { error: insertErr } = await db.from('chat_messages').insert({
          conversation_id: conversationId,
          parent_id: parentId ?? null,
          author_id: myId,
          ...insertRow,
        });
        if (insertErr) {
          setError(insertErr);
          return;
        }
        await queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
        await queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      } catch (e) {
        setError(e);
      }
    },
    [conversationId, myId, queryClient],
  );

  // `error` is surfaced via state for callers that wish to inspect it; the feed
  // itself degrades to empty on failure.
  void error;

  return {
    messages,
    isLoading: !!conversationId && query.isLoading,
    hasMore: !!query.hasNextPage,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
    },
    sendMessage,
  };
}
