/**
 * useActivityFeed — merged Slack-style "Activity" feed.
 *
 * Sources merged into a single chronological list:
 *  - DM / channel unreads — for every conversation with unreadCount > 0, take
 *    the latest message authored by someone else.
 *  - @mention notifications — chat_mention rows in `notifications` addressed
 *    to me; each carries the underlying chat_messages.id.
 *  - Thread replies — chat_messages where parent_id IS NOT NULL, authored by
 *    someone else, in conversations I'm a member of.
 *
 * Hydrated with the author profile + conversation kind/title so the row can
 * render the avatar, the "DM" / "Thread in DM: …" sub-line and the preview.
 *
 * Defensive: any individual fetch failure resolves to empty, the panel still
 * renders the surviving items.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/chat/useConversations';
import type { ChatConversation } from '@/types/chat';

const db = supabase as unknown as { from: (t: string) => any };

export type ActivityKind = 'dm' | 'mention' | 'thread';

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  conversationId: string;
  conversationKind: ChatConversation['kind'];
  conversationTitle: string;
  /** parent message id when the source is a thread reply */
  parentMessageId: string | null;
  /** message id to highlight when jumping to source */
  targetMessageId: string;
  authorId: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  body: string;
  createdAt: string;
  isUnread: boolean;
  /** rendered as a reply-arrow glyph after the name */
  isReply: boolean;
}

interface LatestMessageRow {
  id: string;
  conversation_id: string;
  author_id: string;
  body_text: string | null;
  created_at: string;
  parent_id: string | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface MentionRow {
  id: string;
  entity_id: string;
  actor_user_id: string | null;
  created_at: string;
  read_at: string | null;
}

interface ThreadReplyRow {
  id: string;
  conversation_id: string;
  parent_id: string;
  body_text: string | null;
  author_id: string;
  created_at: string;
}

async function fetchProfiles(ids: string[]): Promise<Map<string, ProfileRow>> {
  const map = new Map<string, ProfileRow>();
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return map;
  try {
    const { data } = await db
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', unique);
    if (Array.isArray(data)) for (const p of data as ProfileRow[]) map.set(p.id, p);
  } catch {
    // fall through with empty map
  }
  return map;
}

/**
 * For every conversation with unread > 0, fetch the latest non-mine message.
 * One query per batch via `.in()` + post-process.
 */
async function fetchUnreadHeads(
  conversations: ChatConversation[],
  userId: string,
): Promise<LatestMessageRow[]> {
  const unreadConvIds = conversations
    .filter(c => c.unreadCount > 0)
    .map(c => c.id);
  if (unreadConvIds.length === 0) return [];
  try {
    const { data } = await db
      .from('chat_messages')
      .select('id, conversation_id, author_id, body_text, created_at, parent_id')
      .in('conversation_id', unreadConvIds)
      .is('deleted_at', null)
      .neq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (!Array.isArray(data)) return [];
    // Keep only the newest row per conversation.
    const seen = new Set<string>();
    const out: LatestMessageRow[] = [];
    for (const row of data as LatestMessageRow[]) {
      if (seen.has(row.conversation_id)) continue;
      seen.add(row.conversation_id);
      out.push(row);
    }
    return out;
  } catch {
    return [];
  }
}

async function fetchMentions(userId: string): Promise<MentionRow[]> {
  try {
    const { data } = await db
      .from('notifications')
      .select('id, entity_id, actor_user_id, created_at, read_at')
      .eq('notification_type', 'chat_mention')
      .eq('recipient_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    return Array.isArray(data) ? (data as MentionRow[]) : [];
  } catch {
    return [];
  }
}

async function fetchMessagesByIds(ids: string[]): Promise<Map<string, LatestMessageRow>> {
  const map = new Map<string, LatestMessageRow>();
  if (ids.length === 0) return map;
  try {
    const { data } = await db
      .from('chat_messages')
      .select('id, conversation_id, author_id, body_text, created_at, parent_id')
      .in('id', ids);
    if (Array.isArray(data)) for (const row of data as LatestMessageRow[]) map.set(row.id, row);
  } catch {
    // fall through
  }
  return map;
}

async function fetchThreadReplies(userId: string): Promise<ThreadReplyRow[]> {
  try {
    const { data: members } = await db
      .from('chat_conversation_members')
      .select('conversation_id')
      .eq('user_id', userId);
    if (!Array.isArray(members) || members.length === 0) return [];
    const convIds = (members as { conversation_id: string }[]).map(r => r.conversation_id);
    const { data } = await db
      .from('chat_messages')
      .select('id, conversation_id, parent_id, body_text, author_id, created_at')
      .in('conversation_id', convIds)
      .not('parent_id', 'is', null)
      .is('deleted_at', null)
      .neq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    return Array.isArray(data) ? (data as ThreadReplyRow[]) : [];
  } catch {
    return [];
  }
}

function conversationKindLabel(c: ChatConversation): string {
  switch (c.kind) {
    case 'dm':
    case 'group_dm':
      return 'DM';
    case 'ticket':
      return c.ticketKey ?? 'Ticket';
    case 'channel':
    case 'custom_channel':
      return `#${c.title}`;
    default:
      return c.title;
  }
}

export function useActivityFeed(): {
  items: ActivityItem[];
  unreadCount: number;
  isLoading: boolean;
  countsByTab: { all: number; dms: number; mentions: number; threads: number };
} {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { conversations } = useConversations();

  const convById = useMemo(() => {
    const m = new Map<string, ChatConversation>();
    for (const c of conversations) m.set(c.id, c);
    return m;
  }, [conversations]);

  const { data, isLoading } = useQuery({
    queryKey: ['chat-v2', 'activity-feed', userId, conversations.map(c => `${c.id}:${c.unreadCount}`).join('|')],
    enabled: !!userId,
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!userId) return [];

      const [unreadHeads, mentions, threadReplies] = await Promise.all([
        fetchUnreadHeads(conversations, userId),
        fetchMentions(userId),
        fetchThreadReplies(userId),
      ]);

      // Hydrate any mention messages we don't already have heads for.
      const mentionMsgIds = mentions.map(m => m.entity_id).filter(Boolean);
      const mentionMessages = await fetchMessagesByIds(mentionMsgIds);

      // Collect author ids to batch-resolve profile names + avatars.
      const authorIds: string[] = [];
      for (const r of unreadHeads) authorIds.push(r.author_id);
      for (const r of threadReplies) authorIds.push(r.author_id);
      for (const m of mentions) if (m.actor_user_id) authorIds.push(m.actor_user_id);
      for (const r of mentionMessages.values()) authorIds.push(r.author_id);
      const profiles = await fetchProfiles(authorIds);

      const items: ActivityItem[] = [];
      // Track ids we've already emitted (mention may dup an unread head).
      const seen = new Set<string>();

      // DM/channel unread heads
      for (const row of unreadHeads) {
        const conv = convById.get(row.conversation_id);
        if (!conv) continue;
        const p = profiles.get(row.author_id);
        items.push({
          id: `dm:${row.id}`,
          kind: 'dm',
          conversationId: conv.id,
          conversationKind: conv.kind,
          conversationTitle: conv.title,
          parentMessageId: row.parent_id,
          targetMessageId: row.id,
          authorId: row.author_id,
          authorName: p?.full_name ?? conv.title ?? 'Someone',
          authorAvatarUrl: p?.avatar_url ?? null,
          body: row.body_text ?? '',
          createdAt: row.created_at,
          isUnread: true,
          isReply: !!row.parent_id,
        });
        seen.add(row.id);
      }

      // @mentions
      for (const m of mentions) {
        if (!m.entity_id || seen.has(m.entity_id)) continue;
        const msg = mentionMessages.get(m.entity_id);
        if (!msg) continue;
        const conv = convById.get(msg.conversation_id);
        if (!conv) continue;
        const p = profiles.get(msg.author_id);
        items.push({
          id: `mention:${m.id}`,
          kind: 'mention',
          conversationId: conv.id,
          conversationKind: conv.kind,
          conversationTitle: conv.title,
          parentMessageId: msg.parent_id,
          targetMessageId: msg.id,
          authorId: msg.author_id,
          authorName: p?.full_name ?? 'Someone',
          authorAvatarUrl: p?.avatar_url ?? null,
          body: msg.body_text ?? '',
          createdAt: m.created_at,
          isUnread: !m.read_at,
          isReply: false,
        });
        seen.add(m.entity_id);
      }

      // Thread replies
      for (const r of threadReplies) {
        if (seen.has(r.id)) continue;
        const conv = convById.get(r.conversation_id);
        if (!conv) continue;
        const p = profiles.get(r.author_id);
        items.push({
          id: `thread:${r.id}`,
          kind: 'thread',
          conversationId: conv.id,
          conversationKind: conv.kind,
          conversationTitle: conversationKindLabel(conv).replace(/^#/, ''),
          parentMessageId: r.parent_id,
          targetMessageId: r.id,
          authorId: r.author_id,
          authorName: p?.full_name ?? 'Someone',
          authorAvatarUrl: p?.avatar_url ?? null,
          body: r.body_text ?? '',
          createdAt: r.created_at,
          isUnread: false,
          isReply: false,
        });
        seen.add(r.id);
      }

      // Newest first.
      items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      return items;
    },
    staleTime: 15_000,
  });

  const items = data ?? [];
  const unreadCount = items.filter(i => i.isUnread).length;
  const countsByTab = {
    all: items.length,
    dms: items.filter(i => i.kind === 'dm').length,
    mentions: items.filter(i => i.kind === 'mention').length,
    threads: items.filter(i => i.kind === 'thread').length,
  };

  return {
    items,
    unreadCount,
    isLoading: !!userId && isLoading,
    countsByTab,
  };
}
