export type ChatPresence = 'available' | 'busy' | 'away' | 'offline' | 'on_leave';
export type ChatConversationKind = 'ticket' | 'channel' | 'dm' | 'group_dm';

export interface ChatConversation {
  id: string;
  kind: ChatConversationKind;
  ticketKey: string | null;
  ticketType: string | null;
  projectKey: string | null;
  projectName: string | null;
  title: string;
  isArchived: boolean;
  isMuted?: boolean;
  isStarred?: boolean;
  isPinned?: boolean;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
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
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  reactions: ChatReaction[];
  replyCount: number;
}

export interface ChatPerson {
  id: string;
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
