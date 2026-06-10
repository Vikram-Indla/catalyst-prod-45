/**
 * MessageItem Example — Integration of AtlaskitAvatar in message list items.
 *
 * This example shows how to integrate the new AtlaskitAvatar component
 * in place of the legacy Avatar component for message rendering.
 *
 * To migrate MessageRow in MessageStream.tsx:
 * 1. Import the new component: `import { AtlaskitAvatar } from './AtlaskitAvatar';`
 * 2. Replace the Avatar call with AtlaskitAvatar
 * 3. Update prop names: seed → seed, name → name, presence → presence
 * 4. Add optional tooltip: fullName={msg.authorName} status="Online"
 *
 * Before:
 * ```tsx
 * <Avatar name={msg.authorName} seed={msg.authorId} color={colorFor(msg.authorId)} className="cc-msg__av" />
 * ```
 *
 * After:
 * ```tsx
 * <AtlaskitAvatar
 *   name={msg.authorName}
 *   seed={msg.authorId}
 *   presence={getUserPresence(msg.authorId)} // optional
 *   fullName={msg.authorName}
 *   status={getUserStatus(msg.authorId)} // optional
 *   pixelSize={28}
 *   className="cc-msg__av"
 * />
 * ```
 */

import React from 'react';
import { AtlaskitAvatar, type AvatarPresenceColor } from './AtlaskitAvatar';
import type { ChatMessage } from '@/types/chat';

interface MessageItemProps {
  msg: ChatMessage;
  isOwn?: boolean;
}

/**
 * Example MessageItem component using AtlaskitAvatar.
 * This demonstrates the recommended pattern for new message components.
 */
export function MessageItem({ msg, isOwn }: MessageItemProps) {
  return (
    <div className="message-item">
      {/* Avatar with tooltip showing user name and presence status */}
      <AtlaskitAvatar
        name={msg.authorName}
        seed={msg.authorId}
        pixelSize={32}
        presence="green" // Placeholder — fetch from real presence data
        fullName={msg.authorName}
        status="Online" // Placeholder — fetch from real user status
        className="message-avatar"
      />

      {/* Message content */}
      <div className="message-content">
        <div className="message-header">
          <span className="author-name">{msg.authorName}</span>
          <span className="timestamp">{msg.createdAt}</span>
        </div>
        <div className="message-body">{msg.bodyText}</div>
      </div>
    </div>
  );
}

/**
 * Example ChatSidebar integration with AtlaskitAvatar.
 * Shows how to use the component in a conversation list.
 */
export function ChatSidebarExample({
  conversations,
}: {
  conversations: Array<{
    id: string;
    title: string;
    isActive: boolean;
    kind: 'dm' | 'channel' | 'ticket';
  }>;
}) {
  return (
    <div className="chat-sidebar">
      {conversations
        .filter((c) => c.kind === 'dm')
        .map((conv) => (
          <div
            key={conv.id}
            className={`conversation-row${conv.isActive ? ' active' : ''}`}
          >
            {/* Avatar with presence indicator for DMs */}
            <AtlaskitAvatar
              name={conv.title}
              seed={conv.id}
              pixelSize={24}
              presence="green"
              className="dm-avatar"
            />
            <span className="dm-name">{conv.title}</span>
          </div>
        ))}
    </div>
  );
}

/**
 * Migration path for existing code:
 *
 * BEFORE (using legacy Avatar):
 * ────────────────────────────
 * import { Avatar, colorFor } from './avatar';
 *
 * function ChatRow() {
 *   return (
 *     <Avatar
 *       name={user.name}
 *       seed={user.id}
 *       color={colorFor(user.id)}
 *       presence={getPresence(user.id)}
 *       className="sidebar-avatar"
 *     />
 *   );
 * }
 *
 * AFTER (using AtlaskitAvatar):
 * ──────────────────────────────
 * import { AtlaskitAvatar } from './AtlaskitAvatar';
 *
 * function ChatRow() {
 *   return (
 *     <AtlaskitAvatar
 *       name={user.name}
 *       seed={user.id}
 *       presence={getPresence(user.id)}
 *       fullName={user.fullName}
 *       status={getUserStatus(user.id)}
 *       pixelSize={28}
 *       className="sidebar-avatar"
 *     />
 *   );
 * }
 *
 * Key differences:
 * ────────────────
 * - No need to import `colorFor` — color seeding is automatic
 * - Add `fullName` + `status` for tooltip support (optional)
 * - Use `pixelSize` instead of `size` for explicit pixel control
 * - Use `presence` directly — no color mapping needed
 * - Uses @atlaskit/avatar under the hood for standard Atlaskit rendering
 */
