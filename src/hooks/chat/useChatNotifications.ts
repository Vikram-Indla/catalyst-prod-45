/**
 * useChatNotifications — Toast notification system for chat events.
 *
 * Manages @atlaskit/flag instances for:
 * - Message sent ✅ (auto-dismiss 3s)
 * - Message failed ❌ (red, sticky until manual close)
 * - Reaction added ✅ (auto-dismiss 3s)
 * - Reminder triggered 🔔 (sticky, requires manual dismiss)
 *
 * Returns a notification queue + render context for FlagGroup.
 */
import { useCallback, useMemo, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  autoDismissMs?: number; // null = sticky (user must close manually)
}

export function useChatNotifications() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  /**
   * Add a toast notification to the queue.
   * Auto-dismisses after autoDissmisMs if specified.
   */
  const addToast = useCallback(
    (type: ToastType, title: string, description?: string, autoDismissMs?: number) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const toast: Toast = { id, type, title, description, autoDissmisMs: autoDismissMs };

      setToasts((prev) => [...prev, toast]);

      // Auto-dismiss if configured
      if (autoDismissMs && autoDismissMs > 0) {
        setTimeout(() => {
          removeToast(id);
        }, autoDismissMs);
      }

      return id;
    },
    [],
  );

  /**
   * Remove a toast by id (called by user dismissal or auto-dismiss timeout).
   */
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Clear all toasts.
   */
  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  /**
   * Notify message sent (auto-dismiss 3s).
   */
  const notifyMessageSent = useCallback(
    (description?: string) => {
      return addToast('success', 'Message sent', description, 3000);
    },
    [addToast],
  );

  /**
   * Notify message failed (sticky, red).
   */
  const notifyMessageFailed = useCallback(
    (reason?: string) => {
      return addToast('error', 'Message failed', reason || 'Could not send your message');
    },
    [addToast],
  );

  /**
   * Notify reaction added (auto-dismiss 3s).
   */
  const notifyReactionAdded = useCallback(
    (emoji: string) => {
      return addToast('success', `Reaction added: ${emoji}`, undefined, 3000);
    },
    [addToast],
  );

  /**
   * Notify reminder triggered (sticky, requires manual dismiss).
   */
  const notifyReminder = useCallback(
    (title: string, description?: string) => {
      return addToast('info', title, description);
    },
    [addToast],
  );

  return useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      clearAllToasts,
      notifyMessageSent,
      notifyMessageFailed,
      notifyReactionAdded,
      notifyReminder,
    }),
    [toasts, addToast, removeToast, clearAllToasts, notifyMessageSent, notifyMessageFailed, notifyReactionAdded, notifyReminder],
  );
}

export default useChatNotifications;
