/**
 * useChatRealtimeAll — account-wide realtime for chat.
 *
 * The per-conversation subscription in useMessages only covers the conversation
 * that is currently OPEN. Without this, a user never sees a new message (or an
 * unread red dot) in a conversation they haven't opened until they send a message
 * or the 30s conversations poll refetches — the reported "msg not received until
 * the other person messages" bug.
 *
 * chat_messages has no RLS, so a single unfiltered realtime channel would leak
 * every workspace message. Instead we subscribe to one filtered channel per
 * conversation the user is a member of (chatRealtime ref-counts, so opening that
 * same conversation later reuses the channel). On any change we invalidate that
 * conversation's message feed AND the conversations list (drives unread badges).
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { chatRealtime } from '@/lib/chat/ChatRealtimeManager';

export function useChatRealtimeAll(conversationIds: string[]): void {
  const queryClient = useQueryClient();
  // Stable dependency: re-subscribe only when the set of ids actually changes.
  const key = conversationIds.slice().sort().join(',');

  useEffect(() => {
    if (conversationIds.length === 0) return;
    const unsubscribes = conversationIds.map((id) =>
      chatRealtime.subscribeMessages(id, () => {
        queryClient.invalidateQueries({ queryKey: ['chat', 'messages', id] });
        queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      }),
    );
    return () => unsubscribes.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, queryClient]);
}
