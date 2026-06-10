/**
 * usePushNotifications — Browser push notification triggering for chat events.
 *
 * Detects:
 * - @mention in a message → send Web Push if user is away
 * - Direct message in 1-on-1 conversation → send Web Push if away
 * - Reminder triggered → always send Web Push (sticky)
 *
 * Gates all notifications on:
 * - User has granted Notification permission
 * - User is not currently focused on the app (away detection)
 */
import { useEffect, useRef, useCallback } from 'react';
import { notificationManager } from '@/lib/chat/NotificationManager';

export interface PushNotificationOptions {
  onPermissionRequested?: () => void;
}

export function usePushNotifications(options?: PushNotificationOptions) {
  const pageVisibilityRef = useRef<boolean>(true);
  const hasRequestedPermissionRef = useRef<boolean>(false);

  /**
   * Detect when user returns to the app after being away.
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      pageVisibilityRef.current = !document.hidden;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  /**
   * Request notification permission (call once on app load or on user interaction).
   */
  const requestPermission = useCallback(async () => {
    if (hasRequestedPermissionRef.current) return;
    hasRequestedPermissionRef.current = true;

    const granted = await notificationManager.requestPermission();
    if (options?.onPermissionRequested) {
      options.onPermissionRequested();
    }
    return granted;
  }, [options]);

  /**
   * Check if user is currently away from the app.
   */
  const isUserAway = useCallback(() => {
    return document.hidden;
  }, []);

  /**
   * Detect @mentions in message body text.
   * Returns true if the text contains @mention patterns (future: could validate against roster).
   */
  const hasMention = useCallback((text: string): boolean => {
    if (!text) return false;
    // Simple pattern: @word where word is alphanumeric
    return /@[\w]+/.test(text);
  }, []);

  /**
   * Send push notification for @mention.
   * Only sends if user is away and permission is granted.
   */
  const notifyMention = useCallback(
    async (authorName: string, conversationTitle: string, preview: string) => {
      if (!isUserAway() || !notificationManager.isPermitted()) {
        return;
      }

      const title = `@mention from ${authorName}`;
      const body = `in ${conversationTitle}: ${preview.substring(0, 80)}${preview.length > 80 ? '...' : ''}`;

      await notificationManager.notify({
        type: 'mention',
        title,
        body,
        tag: `mention-${authorName}`,
        requireInteraction: false,
        data: { type: 'mention', author: authorName, conversation: conversationTitle },
      });

      // Play sound if enabled
      notificationManager.playSoundIfEnabled();
    },
    [isUserAway],
  );

  /**
   * Send push notification for direct message in 1-on-1 conversation.
   * Only sends if user is away and permission is granted.
   */
  const notifyDirectMessage = useCallback(
    async (senderName: string, conversationTitle: string, preview: string) => {
      if (!isUserAway() || !notificationManager.isPermitted()) {
        return;
      }

      const title = `Message from ${senderName}`;
      const body = `${conversationTitle}: ${preview.substring(0, 80)}${preview.length > 80 ? '...' : ''}`;

      await notificationManager.notify({
        type: 'direct_message',
        title,
        body,
        tag: `dm-${senderName}`,
        requireInteraction: false,
        data: { type: 'direct_message', sender: senderName, conversation: conversationTitle },
      });
    },
    [isUserAway],
  );

  /**
   * Send push notification for reminder.
   * Always sends if permission is granted (no away check).
   */
  const notifyReminder = useCallback(
    async (title: string, description: string) => {
      if (!notificationManager.isPermitted()) {
        return;
      }

      await notificationManager.notify({
        type: 'reminder',
        title,
        body: description,
        tag: 'reminder',
        requireInteraction: true, // Sticky until user interacts
        data: { type: 'reminder' },
      });
    },
    [],
  );

  /**
   * Enable/disable notification sound for @mentions.
   */
  const setSoundEnabled = useCallback((enabled: boolean) => {
    notificationManager.setSoundEnabled(enabled);
  }, []);

  /**
   * Get current notification permission state.
   */
  const getPermissionState = useCallback(() => {
    return notificationManager.getPermissionState();
  }, []);

  return {
    requestPermission,
    isUserAway,
    hasMention,
    notifyMention,
    notifyDirectMessage,
    notifyReminder,
    setSoundEnabled,
    getPermissionState,
  };
}

export default usePushNotifications;
