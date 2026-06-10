/**
 * useTypingIndicator — Keyboard input middleware for typing indicator
 *
 * Automatically broadcasts typing state to Realtime:
 * - Start typing on first keystroke (300ms debounce)
 * - Clear typing 3s after last keystroke
 * - Clear typing on message send (detected via onMessageSent callback)
 *
 * Usage:
 *   const { isComposing, bindComposer } = useTypingIndicator(conversationId, setTyping);
 *
 *   <textarea
 *     {...bindComposer}
 *     value={message}
 *     onChange={(e) => setMessage(e.target.value)}
 *   />
 */

import { useCallback, useRef, useState } from 'react';

interface TypingIndicatorConfig {
  debounceMs?: number; // Default: 300 (wait 300ms before broadcasting)
  timeoutMs?: number; // Default: 3000 (clear typing after 3s idle)
}

interface TypingIndicatorBindings {
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
}

/**
 * useTypingIndicator hook
 *
 * @param conversationId - conversation UUID
 * @param setTyping - callback from usePresence.setTyping
 * @param config - debounce/timeout options
 * @returns { isComposing, bindComposer, clearTyping }
 */
export function useTypingIndicator(
  conversationId: string | null,
  setTyping: (typing: boolean) => Promise<void>,
  config: TypingIndicatorConfig = {}
) {
  const { debounceMs = 300, timeoutMs = 3000 } = config;

  const [isComposing, setIsComposing] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTyping = useCallback(async () => {
    if (isComposing) {
      setIsComposing(false);
      await setTyping(false);
    }
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
  }, [isComposing, setTyping]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      if (!conversationId) return;

      // Clear existing timers
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);

      // Debounce: wait 300ms before broadcasting typing
      debounceTimerRef.current = setTimeout(() => {
        if (!isComposing) {
          setIsComposing(true);
          setTyping(true).catch((err) => {
            console.error('[useTypingIndicator] Failed to broadcast typing:', err);
          });
        }
      }, debounceMs);

      // Timeout: clear typing 3s after last keystroke
      timeoutTimerRef.current = setTimeout(() => {
        clearTyping();
      }, timeoutMs);
    },
    [conversationId, isComposing, setTyping, debounceMs, timeoutMs, clearTyping]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      // Optionally clear typing when field loses focus
      // Comment this out if you want typing to persist until timeout
      clearTyping();
    },
    [clearTyping]
  );

  const bindComposer: TypingIndicatorBindings = {
    onKeyDown: handleKeyDown,
    onBlur: handleBlur,
  };

  return {
    isComposing,
    bindComposer,
    clearTyping,
  };
}
