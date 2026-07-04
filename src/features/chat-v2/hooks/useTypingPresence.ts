/**
 * useTypingPresence — live "X is typing…" state for a conversation.
 *
 * Rides the existing ChatRealtimeManager ephemeral typing broadcast
 * (self: false, so the local user never sees their own indicator).
 * Names expire TYPING_TTL_MS after their last broadcast; outgoing
 * notifications are throttled so a continuous keystream sends at most
 * one broadcast per THROTTLE_MS.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { chatRealtime } from '@/lib/chat/ChatRealtimeManager';

const TYPING_TTL_MS = 4000;
const THROTTLE_MS = 2500;

export function useTypingPresence(
  conversationId: string | null,
  myName: string | null,
): { typingUsers: string[]; notifyTyping: () => void } {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const expiryRef = useRef<Map<string, number>>(new Map());
  const sweepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    expiryRef.current.clear();
    setTypingUsers([]);
    if (!conversationId) return;

    const sweep = () => {
      sweepTimerRef.current = null;
      const now = Date.now();
      let changed = false;
      expiryRef.current.forEach((expiry, name) => {
        if (expiry <= now) {
          expiryRef.current.delete(name);
          changed = true;
        }
      });
      if (changed) setTypingUsers(Array.from(expiryRef.current.keys()));
      if (expiryRef.current.size > 0 && !sweepTimerRef.current) {
        sweepTimerRef.current = setTimeout(sweep, 1000);
      }
    };

    const unsubscribe = chatRealtime.subscribeTyping(conversationId, (userName) => {
      expiryRef.current.set(userName, Date.now() + TYPING_TTL_MS);
      setTypingUsers(Array.from(expiryRef.current.keys()));
      if (!sweepTimerRef.current) sweepTimerRef.current = setTimeout(sweep, 1000);
    });

    return () => {
      unsubscribe();
      if (sweepTimerRef.current) {
        clearTimeout(sweepTimerRef.current);
        sweepTimerRef.current = null;
      }
    };
  }, [conversationId]);

  const notifyTyping = useCallback(() => {
    if (!conversationId || !myName) return;
    const now = Date.now();
    if (now - lastSentRef.current < THROTTLE_MS) return;
    lastSentRef.current = now;
    chatRealtime.broadcastTyping(conversationId, myName);
  }, [conversationId, myName]);

  return { typingUsers, notifyTyping };
}
