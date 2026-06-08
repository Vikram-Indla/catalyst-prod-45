/**
 * useDraft — per-conversation draft persistence in localStorage.
 * Keyed by conversation id. Drafts survive page reloads + conversation
 * switches. Cleared explicitly on successful send.
 *
 * No server round-trip — Slack/Teams keep drafts local until you send.
 */
import { useCallback, useEffect, useState } from 'react';

const PREFIX = 'catalyst.chat.draft.';
const MAX_LEN = 8000;

export function useDraft(conversationId: string | null | undefined) {
  const [value, setValue] = useState<string>('');

  // Load draft when conversation changes
  useEffect(() => {
    if (!conversationId) {
      setValue('');
      return;
    }
    try {
      const stored = window.localStorage.getItem(PREFIX + conversationId);
      setValue(stored ?? '');
    } catch {
      setValue('');
    }
  }, [conversationId]);

  // Debounced persist on change
  useEffect(() => {
    if (!conversationId) return;
    const id = window.setTimeout(() => {
      try {
        if (value.length === 0) {
          window.localStorage.removeItem(PREFIX + conversationId);
        } else if (value.length <= MAX_LEN) {
          window.localStorage.setItem(PREFIX + conversationId, value);
        }
      } catch {
        /* quota exceeded — silently drop */
      }
    }, 250);
    return () => window.clearTimeout(id);
  }, [conversationId, value]);

  const clear = useCallback(() => {
    if (!conversationId) return;
    try {
      window.localStorage.removeItem(PREFIX + conversationId);
    } catch {
      /* ignore */
    }
    setValue('');
  }, [conversationId]);

  return { value, setValue, clear };
}
