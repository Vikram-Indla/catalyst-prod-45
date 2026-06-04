/**
 * chatToCds — adapter mapping chat domain objects onto the canonical
 * catalyst-ds comment thread contract (CdsComment / CdsUser).
 *
 * This lets the generic CommentThread component render the chat
 * active-conversation pane unchanged: reactions, edit, delete, mentions,
 * rich composer and emoji all come for free from the design-system component.
 */
import type { CdsComment, CdsUser } from '@/components/catalyst-ds/types';
import type { ChatMessage, ChatPerson } from '@/types/chat';

export function chatMessageToCds(m: ChatMessage): CdsComment {
  return {
    id: m.id,
    author: {
      id: m.authorId,
      name: m.authorName,
      avatarUrl: m.authorAvatarUrl,
    },
    content: m.bodyAdf ? JSON.stringify(m.bodyAdf) : m.bodyText,
    createdAt: m.createdAt,
    isEdited: !!m.editedAt,
    reactions: m.reactions.map((r) => ({
      emoji: r.emoji,
      count: r.count,
      reacted_by_me: r.reactedByMe,
    })),
  };
}

export function chatPersonToCds(p: ChatPerson): CdsUser {
  return {
    id: p.id,
    name: p.name,
    avatarUrl: p.avatarUrl,
  };
}
