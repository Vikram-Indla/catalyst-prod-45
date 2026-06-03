/**
 * chatMappers — pure mapping/util functions for the Catalyst Chat data layer.
 *
 * These are deliberately pure (no Supabase, no network) so they are unit-testable
 * and reusable across hooks. The chat hooks (useConversations / useMessages /
 * useChatPeople) and the archival logic share these helpers.
 *
 * Covered by src/components/chat/__tests__/chat-data.test.ts.
 */
import type {
  ChatConversation,
  ChatConversationKind,
  ChatMessage,
  ChatPerson,
  ChatPeopleGroup,
  ChatPresence,
  ChatReaction,
} from '@/types/chat';

/** Number of days a conversation may be idle before it becomes archivable. */
export const CHAT_ARCHIVE_IDLE_DAYS = 21;

const PRESENCE_ORDER: ChatPresence[] = [
  'available',
  'busy',
  'away',
  'offline',
  'on_leave',
];

/** Map a raw chat_conversations DB row (snake_case) to a ChatConversation. */
export function mapConversationRow(row: Record<string, unknown>): ChatConversation {
  return {
    id: String(row.id),
    kind: (row.kind as ChatConversationKind) ?? 'channel',
    ticketKey: (row.ticket_key as string | null) ?? null,
    projectKey: (row.project_key as string | null) ?? null,
    title: (row.title as string) ?? '',
    isArchived: Boolean(row.is_archived),
    lastMessageAt: (row.last_message_at as string | null) ?? null,
    lastMessagePreview: (row.last_message_preview as string | null) ?? null,
    unreadCount: typeof row.unread_count === 'number' ? row.unread_count : 0,
  };
}

/** Map raw chat_messages rows to ChatMessage[], excluding soft-deleted rows. */
export function mapMessageRows(rows: Record<string, unknown>[]): ChatMessage[] {
  return rows
    .filter((r) => r.deleted_at == null)
    .map((r) => ({
      id: String(r.id),
      conversationId: String(r.conversation_id),
      parentId: (r.parent_id as string | null) ?? null,
      authorId: String(r.author_id),
      authorName: (r.author_name as string) ?? '',
      authorAvatarUrl: (r.author_avatar_url as string | null) ?? null,
      bodyText: (r.body_text as string) ?? '',
      bodyAdf: (r.body_adf as unknown) ?? null,
      createdAt: (r.created_at as string) ?? '',
      editedAt: (r.edited_at as string | null) ?? null,
      deletedAt: (r.deleted_at as string | null) ?? null,
      reactions: Array.isArray(r.reactions) ? (r.reactions as ChatReaction[]) : [],
      replyCount: typeof r.reply_count === 'number' ? r.reply_count : 0,
    }));
}

/**
 * Aggregate raw reaction rows ({ emoji, user_id }) into ChatReaction[]:
 * grouped by emoji (first-seen order), with count and whether the current
 * user reacted.
 */
export function aggregateReactions(
  rows: { emoji: string; user_id: string }[],
  currentUserId: string,
): ChatReaction[] {
  const byEmoji = new Map<string, ChatReaction>();
  for (const { emoji, user_id } of rows) {
    const existing = byEmoji.get(emoji);
    if (existing) {
      existing.count += 1;
      if (user_id === currentUserId) existing.reactedByMe = true;
    } else {
      byEmoji.set(emoji, {
        emoji,
        count: 1,
        reactedByMe: user_id === currentUserId,
      });
    }
  }
  return Array.from(byEmoji.values());
}

/**
 * Group people by presence in the canonical order, omitting empty groups.
 */
export function groupPeopleByPresence(people: ChatPerson[]): ChatPeopleGroup[] {
  return PRESENCE_ORDER.map((presence) => ({
    presence,
    people: people.filter((p) => p.presence === presence),
  })).filter((g) => g.people.length > 0);
}

/**
 * A conversation is archivable when its last message is older than
 * CHAT_ARCHIVE_IDLE_DAYS. No last message → not archivable.
 */
export function isConversationArchivable(
  lastMessageAt: string | null,
  now: Date = new Date(),
): boolean {
  if (!lastMessageAt) return false;
  const last = new Date(lastMessageAt).getTime();
  const idleMs = now.getTime() - last;
  return idleMs > CHAT_ARCHIVE_IDLE_DAYS * 24 * 60 * 60 * 1000;
}
