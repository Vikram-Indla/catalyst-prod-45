/**
 * ChatGlobalRealtime — invisible always-on subscriber.
 *
 * Mounted once at app-shell scope (inside ChatDockMount, regardless of whether the
 * dock is open) so a conversation list is always loaded and subscribed — driving
 * live message delivery and unread red dots even when no chat surface is open.
 * useConversations owns the realtime subscription; this just guarantees a mount.
 * Renders nothing.
 */
import { useConversations } from '@/hooks/chat/useConversations';

export function ChatGlobalRealtime(): null {
  useConversations();
  return null;
}
