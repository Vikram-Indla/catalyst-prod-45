/**
 * seenReceipts — pure read-receipt caption computation for Chat v2.
 *
 * WhatsApp-style receipts, Slack-class restraint:
 *  - Caption attaches ONLY to the viewer's LAST own message — never to
 *    other people's messages, and never per-message down the list. So a
 *    channel shows at most one receipt (on your own latest post), which
 *    keeps it from becoming the creepy per-message read tracker Slack
 *    deliberately avoids.
 *  - dm                     → "Seen" once the other member read it.
 *  - group_dm               → "Seen by N" (N = OTHER members who read it).
 *  - channel/custom_channel → "Read by N" (same math; different verb).
 *  - Hidden entirely at N = 0. Zero-assumption law: no "Delivered"
 *    fabrication — unseen renders nothing.
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
  // Ticket threads have no meaningful "read by" audience — skip. All other
  // kinds (dm, group_dm, channel, custom_channel) show a receipt.
  if (kind === 'ticket') return null;
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
  const text =
    kind === 'dm'
      ? 'Seen'
      : kind === 'group_dm'
        ? `Seen by ${seenCount}`
        : `Read by ${seenCount}`;
  return { messageId: target.id, text };
}
