/**
 * seenReceipts — pure "Seen" caption computation for Chat v2 DMs.
 *
 * WhatsApp-style read receipts, Slack-class restraint:
 *  - Only `dm` and `group_dm` conversations (channels never show receipts).
 *  - Caption attaches to the viewer's LAST own message in the list.
 *  - dm        → "Seen" once the other member's last_read_at >= createdAt.
 *  - group_dm  → "Seen by N" where N = OTHER members who read it (hidden at 0).
 *  - Zero-assumption law: no "Delivered" fabrication — unseen renders nothing.
 */
import type { ChatConversationKind } from '@/types/chat';

export interface SeenMessageLike {
  id: string;
  authorId: string;
  createdAt: string;
  /** Event rows (huddle_summary etc.) are not authored bubbles — ignored. */
  eventType?: string | null;
  deletedAt?: string | null;
}

export interface SeenMemberLike {
  userId: string;
  lastReadAt: string | null;
}

export interface SeenCaption {
  messageId: string;
  text: string;
}

export function computeSeenCaption(
  messages: readonly SeenMessageLike[],
  members: readonly SeenMemberLike[],
  myId: string | null | undefined,
  kind: ChatConversationKind,
): SeenCaption | null {
  if (kind !== 'dm' && kind !== 'group_dm') return null;
  if (!myId) return null;

  // Last own real message (skip event rows and soft-deleted messages).
  let target: SeenMessageLike | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.eventType || m.deletedAt) continue;
    if (m.authorId === myId) {
      target = m;
    }
    break; // only the newest real message qualifies; older own messages don't carry receipts
  }
  if (!target) return null;

  const createdMs = new Date(target.createdAt).getTime();
  if (Number.isNaN(createdMs)) return null;

  const seenCount = members.filter(m => {
    if (m.userId === myId) return false; // my own lastReadAt never counts
    if (!m.lastReadAt) return false;
    const readMs = new Date(m.lastReadAt).getTime();
    return !Number.isNaN(readMs) && readMs >= createdMs;
  }).length;

  if (seenCount === 0) return null;
  return {
    messageId: target.id,
    text: kind === 'dm' ? 'Seen' : `Seen by ${seenCount}`,
  };
}
