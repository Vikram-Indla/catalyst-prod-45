export type ChatPresence = 'onsite' | 'remote' | 'away' | 'on_leave';
export type ChatConversationKind = 'ticket' | 'channel' | 'dm' | 'group_dm' | 'custom_channel';

export interface ChatConversation {
  id: string;
  kind: ChatConversationKind;
  ticketKey: string | null;
  ticketType: string | null;
  projectKey: string | null;
  projectName: string | null;
  title: string;
  description?: string | null;
  isArchived: boolean;
  isMuted?: boolean;
  isStarred?: boolean;
  isPinned?: boolean;
  isPrivate?: boolean;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  /** Number of other members in a group DM. Only populated for kind === 'group_dm'. */
  memberCount?: number;
  /** Avatar URLs of OTHER members. Populated for `dm` and `group_dm` kinds. */
  dmAvatarUrls?: string[];
  /** User ids of OTHER members. Populated for `dm` and `group_dm` kinds.
   *  Used to show a "on a huddle" indicator in the DM list. */
  dmMemberIds?: string[];
  /** Display names of OTHER members in their original (full) form.
   *  Populated for `dm` and `group_dm` kinds; used by the DM tab list to
   *  show full names ("Adnan Ali, Mazen Yehia") instead of the compact
   *  comma-joined first-names that appear in the sidebar title. */
  dmMemberNames?: string[];
  /** Display name of the ticket assignee. Populated for `ticket` kind only. */
  assigneeName?: string | null;
}

export interface ChatReaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  bodyText: string;
  bodyAdf: unknown | null;
  /** Non-null for system/event rows (e.g. 'huddle_summary'). Normal messages: null. */
  eventType?: string | null;
  /** Event payload for event rows. Normal messages: null. */
  eventMeta?: Record<string, unknown> | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  /** When this message should be delivered. null = sent immediately. */
  scheduledFor: string | null;
  /** When this message became visible to non-authors. null = pending. */
  deliveredAt: string | null;
  reactions: ChatReaction[];
  replyCount: number;
  lastReplyAt: string | null;
  isAlsoInChannel: boolean;
}

export interface ChatPerson {
  id: string;
  /** profiles.id — the canonical USER_ID used by `data-mention-id`. */
  profileId: string | null;
  name: string;
  role: string | null;
  avatarUrl: string | null;
  presence: ChatPresence;
  presenceNote: string | null;
}

export interface ChatPeopleGroup {
  presence: ChatPresence;
  people: ChatPerson[];
}

export interface ChatThread {
  id: string;
  parentMessageSnippet: string;
  replyCount: number;
  lastReplyAt: string;
}
