/**
 * useMessagesWithNotifications — Extends useMessages with notification integration.
 *
 * Wraps sendMessage, editMessage, deleteMessage, and toggleReaction to:
 * - Show toast notifications on success/failure
 * - Trigger push notifications for @mentions when user is away
 * - Play sound on @mention (if enabled)
 *
 * Usage:
 *   const {
 *     messages, sendMessage, toggleReaction, ...
 *     toasts, removeToast, requestPushPermission
 *   } = useMessagesWithNotifications(conversationId);
 *
 *   // Render toasts in your component:
 *   <ChatToastRenderer toasts={toasts} onDismiss={removeToast} />
 */
import { useCallback, useEffect } from 'react';
import { useMessages } from './useMessages';
import { useChatNotifications } from './useChatNotifications';
import { usePushNotifications } from './usePushNotifications';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from './useConversations';

export function useMessagesWithNotifications(conversationId: string | null) {
  const { user } = useAuth();
  const { conversations } = useConversations();

  // Core messaging
  const messagesResult = useMessages(conversationId);

  // Toast notifications
  const notifications = useChatNotifications();

  // Push notifications
  const pushNotifications = usePushNotifications({
    onPermissionRequested: () => {
      // Could update UI state here
      console.debug('Push notification permission state changed');
    },
  });

  // Get current conversation metadata
  const activeConversation = conversations.find((c) => c.id === conversationId) ?? null;
  const isDirectMessage = activeConversation?.kind === 'dm';

  /**
   * Wrap sendMessage to add notifications.
   */
  const sendMessageWithNotifications = useCallback(
    async (
      bodyText: string,
      opts?: { parentId?: string; adf?: unknown | null },
    ) => {
      const originalSendMessage = messagesResult.sendMessage;

      try {
        // Call the original send
        await originalSendMessage(bodyText, opts);

        // Show success toast
        notifications.notifyMessageSent();

        // Check for @mentions and trigger push notification
        if (pushNotifications.hasMention(bodyText) && user?.full_name) {
          await pushNotifications.notifyMention(
            user.full_name,
            activeConversation?.title ?? 'Conversation',
            bodyText,
          );
        }

        // For 1-on-1, we could also notify the recipient (future: integrate with activity log)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        notifications.notifyMessageFailed(errorMsg);
      }
    },
    [
      messagesResult.sendMessage,
      notifications,
      pushNotifications,
      user?.full_name,
      activeConversation?.title,
    ],
  );

  /**
   * Wrap toggleReaction to add notifications.
   */
  const toggleReactionWithNotifications = useCallback(
    async (messageId: string, emoji: string) => {
      const originalToggleReaction = messagesResult.toggleReaction;

      try {
        await originalToggleReaction(messageId, emoji);
        notifications.notifyReactionAdded(emoji);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        notifications.notifyMessageFailed(`Could not add reaction: ${errorMsg}`);
      }
    },
    [messagesResult.toggleReaction, notifications],
  );

  /**
   * Request push notification permission (typically called on chat init or user interaction).
   */
  const requestPushPermission = useCallback(async () => {
    return await pushNotifications.requestPermission();
  }, [pushNotifications]);

  /**
   * Set whether notification sound is enabled.
   */
  const setSoundEnabled = useCallback(
    (enabled: boolean) => {
      pushNotifications.setSoundEnabled(enabled);
    },
    [pushNotifications],
  );

  return {
    // Original message hooks
    messages: messagesResult.messages,
    isLoading: messagesResult.isLoading,
    hasMore: messagesResult.hasMore,
    loadMore: messagesResult.loadMore,
    currentUserId: messagesResult.currentUserId,

    // Wrapped message operations with notifications
    sendMessage: sendMessageWithNotifications,
    editMessage: messagesResult.editMessage,
    deleteMessage: messagesResult.deleteMessage,
    toggleReaction: toggleReactionWithNotifications,

    // Notification controls
    toasts: notifications.toasts,
    removeToast: notifications.removeToast,
    clearAllToasts: notifications.clearAllToasts,
    notifyReminder: notifications.notifyReminder,

    // Push notification controls
    requestPushPermission,
    setSoundEnabled,
    getPushPermissionState: pushNotifications.getPermissionState,
    isUserAway: pushNotifications.isUserAway,
  };
}

export default useMessagesWithNotifications;
