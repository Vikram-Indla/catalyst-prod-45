/**
 * useTypingIndicator — ephemeral "is typing" state for a conversation.
 *
 * - Subscribes to chatRealtime typing broadcasts; tracks who is typing.
 * - typingNames excludes the current user.
 * - notifyTyping is debounced (~2s): repeated keystrokes coalesce into one
 *   broadcast, and a peer's name auto-expires ~3s after their last signal.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { chatRealtime } from '@/lib/chat/ChatRealtimeManager';

const BROADCAST_DEBOUNCE_MS = 2000;
const PEER_EXPIRY_MS = 3000;

export function useTypingIndicator(conversationId: string | null): {
  typingNames: string[];
  notifyTyping: () => void;
} {
  const { user } = useAuth();
  const myName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.email as string | undefined) ??
    null;

  const [typingNames, setTypingNames] = useState<string[]>([]);
  const peerTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastBroadcastAt = useRef(0);

  useEffect(() => {
    if (!conversationId) {
      setTypingNames([]);
      return;
    }

    const timers = peerTimers.current;

    const unsubscribe = chatRealtime.subscribeTyping(conversationId, (userName) => {
      if (!userName || userName === myName) return;

      setTypingNames((prev) => (prev.includes(userName) ? prev : [...prev, userName]));

      const existing = timers.get(userName);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        timers.delete(userName);
        setTypingNames((prev) => prev.filter((n) => n !== userName));
      }, PEER_EXPIRY_MS);
      timers.set(userName, timer);
    });

    return () => {
      unsubscribe();
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      setTypingNames([]);
    };
  }, [conversationId, myName]);

  const notifyTyping = useCallback(() => {
    if (!conversationId || !myName) return;
    const now = Date.now();
    if (now - lastBroadcastAt.current < BROADCAST_DEBOUNCE_MS) return;
    lastBroadcastAt.current = now;
    chatRealtime.broadcastTyping(conversationId, myName);
  }, [conversationId, myName]);

  return { typingNames, notifyTyping };
}
