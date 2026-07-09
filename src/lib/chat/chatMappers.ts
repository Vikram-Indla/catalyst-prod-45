/**
 * chatMappers.ts — pure mapping/util functions for the Catalyst Chat data
 * contract. No network calls, no Supabase — DB row shapes in, typed
 * view-model shapes out. Consumed by chat data hooks and covered by
 * src/components/chat/__tests__/chat-data.test.ts.
 */
import type {
  ChatConversation,
  ChatMessage,
  ChatPeopleGroup,
  ChatPerson,
  ChatPresence,
  ChatReaction,
} from '@/types/chat';

/** Raw DB row shapes (snake_case) — kept loose since callers pass Supabase rows. */
type ConversationRow = Record<string, unknown>;
type MessageRow = Record<string, unknown>;
type ReactionRow = { emoji: string; user_id: string };

export function mapConversationRow(row: ConversationRow): ChatConversation {
  return {
    id: row.id as string,
    kind: row.kind as ChatConversation['kind'],
    ticketKey: (row.ticket_key as string | null) ?? null,
    projectKey: (row.project_key as string | null) ?? null,
    title: row.title as string,
    isArchived: Boolean(row.is_archived),
    lastMessageAt: (row.last_message_at as string | null) ?? null,
    lastMessagePreview: (row.last_message_preview as string | null) ?? null,
    unreadCount: (row.unread_count as number | undefined) ?? 0,
  } as ChatConversation;
}

export function mapMessageRows(rows: MessageRow[]): ChatMessage[] {
  return rows
    .filter((row) => row.deleted_at == null)
    .map((row) => ({
      id: row.id as string,
      conversationId: row.conversation_id as string,
      parentId: (row.parent_id as string | null) ?? null,
      authorId: row.author_id as string,
      authorName: row.author_name as string,
      authorAvatarUrl: (row.author_avatar_url as string | null) ?? null,
      bodyText: (row.body_text as string) ?? '',
      bodyAdf: (row.body_adf as unknown) ?? null,
      createdAt: row.created_at as string,
      editedAt: (row.edited_at as string | null) ?? null,
      deletedAt: (row.deleted_at as string | null) ?? null,
      scheduledFor: (row.scheduled_for as string | null) ?? null,
      deliveredAt: (row.delivered_at as string | null) ?? null,
      reactions: [] as ChatReaction[],
      replyCount: (row.reply_count as number | undefined) ?? 0,
      lastReplyAt: (row.last_reply_at as string | null) ?? null,
      isAlsoInChannel: Boolean(row.is_also_in_channel),
    })) as ChatMessage[];
}

export function aggregateReactions(
  rows: ReactionRow[],
  currentUserId: string,
): ChatReaction[] {
  const order: string[] = [];
  const byEmoji = new Map<string, { count: number; reactedByMe: boolean }>();

  for (const row of rows) {
    const existing = byEmoji.get(row.emoji);
    if (existing) {
      existing.count += 1;
      if (row.user_id === currentUserId) existing.reactedByMe = true;
    } else {
      order.push(row.emoji);
      byEmoji.set(row.emoji, {
        count: 1,
        reactedByMe: row.user_id === currentUserId,
      });
    }
  }

  return order.map((emoji) => ({
    emoji,
    count: byEmoji.get(emoji)!.count,
    reactedByMe: byEmoji.get(emoji)!.reactedByMe,
  }));
}

const PRESENCE_ORDER: ChatPresence[] = ['onsite', 'remote', 'away', 'on_leave'];

export function groupPeopleByPresence(people: ChatPerson[]): ChatPeopleGroup[] {
  const groups: ChatPeopleGroup[] = [];

  for (const presence of PRESENCE_ORDER) {
    const inGroup = people.filter((person) => person.presence === presence);
    if (inGroup.length > 0) {
      groups.push({ presence, people: inGroup });
    }
  }

  return groups;
}

const ARCHIVABLE_IDLE_DAYS = 21;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isConversationArchivable(
  lastMessageAt: string | null,
  now: Date = new Date(),
): boolean {
  if (!lastMessageAt) return false;
  const idleMs = now.getTime() - new Date(lastMessageAt).getTime();
  return idleMs > ARCHIVABLE_IDLE_DAYS * MS_PER_DAY;
}
