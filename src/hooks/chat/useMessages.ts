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
import { resolveAvatarUrl } from '@/lib/avatars';
import type { ChatMessage, ChatReaction } from '@/types/chat';

const PAGE_SIZE = 50;

const db = supabase as unknown as { from: (table: string) => any };

const MESSAGE_FIELDS_CORE =
  'id, conversation_id, parent_id, author_id, body_text, body_adf, created_at, edited_at, deleted_at, reply_count, last_reply_at, is_also_in_channel';
// Optional column groups, each gated by its own migration. When a migration
// hasn't been applied yet the column is undefined (Postgres 42703). We probe on
// first call and drop the offending group so the chat keeps loading instead of
// blanking the whole feed.
let scheduleColumnsAvailable: boolean | null = null; // scheduled_for / delivered_at
let eventColumnsAvailable: boolean | null = null;    // event_type / event_meta

/** Build the select list including whichever optional groups are known-present. */
function buildMessageFields(): string {
  let f = MESSAGE_FIELDS_CORE;
  if (eventColumnsAvailable !== false) f += ', event_type, event_meta';
  if (scheduleColumnsAvailable !== false) f += ', scheduled_for, delivered_at';
  return f;
}

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
  scheduled_for: string | null;
  delivered_at: string | null;
  reply_count: number;
  last_reply_at: string | null;
  is_also_in_channel: boolean;
  event_type: string | null;
  event_meta: Record<string, unknown> | null;
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

    // Exclude thread replies from main feed unless explicitly "Also send to channel".
    const mainFeedFilter = 'parent_id.is.null,is_also_in_channel.eq.true';

    const runQuery = (fields: string) => db
      .from('chat_messages')
      .select(fields)
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .or(mainFeedFilter)
      .order('created_at', { ascending: false })
      .range(from, to);

    let queryRes = await runQuery(buildMessageFields());

    // Undefined-column fallback: schedule and/or event columns may not be
    // migrated yet. On a 42703, drop the named (or, if generic, any remaining)
    // optional group and retry so the feed still loads. Loop in case BOTH groups
    // are missing — each retry surfaces the next missing column.
    let guard = 0;
    while (queryRes.error && queryRes.error.code === '42703' && guard < 3) {
      guard++;
      const msg = queryRes.error.message ?? '';
      let dropped = false;
      if (/scheduled_for|delivered_at/i.test(msg) && scheduleColumnsAvailable !== false) {
        scheduleColumnsAvailable = false; dropped = true;
      }
      if (/event_type|event_meta/i.test(msg) && eventColumnsAvailable !== false) {
        eventColumnsAvailable = false; dropped = true;
      }
      if (!dropped) {
        // Generic 42703 (column not named) — drop one still-enabled group and retry.
        if (eventColumnsAvailable !== false) { eventColumnsAvailable = false; dropped = true; }
        else if (scheduleColumnsAvailable !== false) { scheduleColumnsAvailable = false; dropped = true; }
      }
      if (!dropped) break;
      queryRes = await runQuery(buildMessageFields());
    }
    if (!queryRes.error) {
      if (scheduleColumnsAvailable === null) scheduleColumnsAvailable = true;
      if (eventColumnsAvailable === null) eventColumnsAvailable = true;
    }

    const { data: rows, error } = queryRes;
    if (error || !rows) return { messages: [], hasMore: false };

    const allRows = rows as MessageRow[];
    const hasMore = allRows.length === PAGE_SIZE;
    // Hide pending scheduled-send rows from the chat message list — they
    // belong on the Drafts & sent → Scheduled tab until the cron worker
    // flips delivered_at. Applies to the author as well; the message
    // becomes visible to everyone (including the author's chat view) once
    // delivered_at is set.
    const msgRows = allRows.filter(
      m => !(m.scheduled_for && !m.delivered_at),
    );
    const ids = msgRows.map((m) => m.id);
    const authorIds = Array.from(new Set(msgRows.map((m) => m.author_id))).filter(Boolean);

    let reactionsByMessage = new Map<string, ChatReaction[]>();
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
        authorAvatarUrl: resolveAvatarUrl(author?.full_name ?? null) ?? author?.avatar_url ?? null,
        bodyText: m.body_text ?? '',
        bodyAdf: m.body_adf ?? null,
        eventType: m.event_type ?? null,
        eventMeta: m.event_meta ?? null,
        createdAt: m.created_at,
        editedAt: m.edited_at ?? null,
        deletedAt: m.deleted_at ?? null,
        scheduledFor: m.scheduled_for ?? null,
        deliveredAt: m.delivered_at ?? null,
        reactions: reactionsByMessage.get(m.id) ?? [],
        replyCount: m.reply_count,
        lastReplyAt: m.last_reply_at ?? null,
        isAlsoInChannel: m.is_also_in_channel,
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
  sendMessage: (
    bodyText: string,
    opts?: { parentId?: string; adf?: unknown | null; scheduledFor?: string },
  ) => Promise<void>;
  editMessage: (messageId: string, bodyText: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  currentUserId: string | null;
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
    async (
      bodyText: string,
      opts?: { parentId?: string; adf?: unknown | null; scheduledFor?: string },
    ) => {
      const parentId = opts?.parentId;
      const adf = opts?.adf ?? null;
      const scheduledFor = opts?.scheduledFor;
      if (!conversationId || !myId || !bodyText.trim()) return;
      try {
        // For scheduled messages, set created_at = scheduled_for so the row
        // sorts at the delivery position for the author's view. delivered_at
        // stays null until the chat-deliver-scheduled-messages cron runs.
        const row: Record<string, unknown> = {
          conversation_id: conversationId,
          parent_id: parentId ?? null,
          author_id: myId,
          body_text: bodyText,
          body_adf: adf,
        };
        if (scheduledFor && scheduleColumnsAvailable !== false) {
          row.scheduled_for = scheduledFor;
          row.created_at = scheduledFor;
        }
        const { error: insertErr } = await db.from('chat_messages').insert(row);
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

  const editMessage = useCallback(
    async (messageId: string, bodyText: string) => {
      if (!myId || !bodyText.trim()) return;
      try {
        const { error: e } = await db
          .from('chat_messages')
          .update({ body_text: bodyText, edited_at: new Date().toISOString() })
          .eq('id', messageId)
          .eq('author_id', myId);
        if (e) { setError(e); return; }
        await queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
      } catch (e) { setError(e); }
    },
    [conversationId, myId, queryClient],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!myId) return;
      try {
        const { error: e } = await db
          .from('chat_messages')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', messageId)
          .eq('author_id', myId);
        if (e) { setError(e); return; }
        await queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
        await queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      } catch (e) { setError(e); }
    },
    [conversationId, myId, queryClient],
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!myId) return;
      try {
        // Check if reaction already exists from me
        const { data: existing } = await db
          .from('chat_message_reactions')
          .select('id')
          .eq('message_id', messageId)
          .eq('user_id', myId)
          .eq('emoji', emoji)
          .maybeSingle();
        if (existing?.id) {
          await db.from('chat_message_reactions').delete().eq('id', existing.id);
        } else {
          await db.from('chat_message_reactions').insert({
            message_id: messageId, user_id: myId, emoji,
          });
        }
        await queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
      } catch (e) { setError(e); }
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
    editMessage,
    deleteMessage,
    toggleReaction,
    currentUserId: myId,
  };
}
