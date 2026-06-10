/**
 * NotificationManager — Web Push & Browser Notification API integration.
 *
 * Handles:
 * - Permission request (Notification.requestPermission)
 * - Queueing push notifications for @mentions, DMs, reminders
 * - Permission state tracking (granted | denied | default)
 * - Sound playback for @mentions (off by default, user-configurable)
 */

export type NotificationPermissionState = 'default' | 'granted' | 'denied';
export type NotificationTriggerType = 'mention' | 'direct_message' | 'reminder' | 'reaction';

export interface NotificationPayload {
  type: NotificationTriggerType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string; // Allows replacing notifications with the same tag
  requireInteraction?: boolean; // true for reminders, false for transient notifications
  data?: Record<string, any>;
}

export class NotificationManager {
  private permissionState: NotificationPermissionState = 'default';
  private soundEnabled: boolean = false;
  private audioElement: HTMLAudioElement | null = null;

  constructor() {
    this.init();
  }

  /**
   * Initialize notification permission state and load sound.
   */
  private init(): void {
    if (!('Notification' in window)) {
      console.warn('Browser does not support Notification API');
      return;
    }

    // Sync local state with actual permission
    const perm = Notification.permission as NotificationPermissionState;
    this.permissionState = perm;

    // Pre-load audio asset for @mention sound (muted by default).
    // The audio file should exist at /public/notification-ping.mp3
    this.audioElement = new Audio('/notification-ping.mp3');
    this.audioElement.preload = 'auto';
  }

  /**
   * Request notification permission from the user.
   * Returns true if permission was granted (either newly or already granted).
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notification API not supported');
      return false;
    }

    if (this.permissionState === 'denied') {
      // User has explicitly denied; do not re-prompt
      return false;
    }

    if (this.permissionState === 'granted') {
      // Already granted
      return true;
    }

    // Request from user
    try {
      const result = await Notification.requestPermission();
      this.permissionState = result as NotificationPermissionState;
      return result === 'granted';
    } catch (err) {
      console.error('Failed to request notification permission:', err);
      return false;
    }
  }

  /**
   * Check if notifications are currently permitted.
   */
  isPermitted(): boolean {
    return this.permissionState === 'granted';
  }

  /**
   * Get current permission state.
   */
  getPermissionState(): NotificationPermissionState {
    return this.permissionState;
  }

  /**
   * Show a browser notification (Web Push API).
   * Only works if permission has been granted.
   */
  async notify(payload: NotificationPayload): Promise<Notification | null> {
    if (!this.isPermitted()) {
      return null;
    }

    if (!('Notification' in window)) {
      return null;
    }

    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon,
        badge: payload.badge,
        tag: payload.tag,
        requireInteraction: payload.requireInteraction ?? false,
        data: payload.data,
      });

      return notification;
    } catch (err) {
      console.error('Failed to show notification:', err);
      return null;
    }
  }

  /**
   * Enqueue a notification to be shown when the user is away (if permission granted).
   * This is a helper that could integrate with Service Worker / background sync
   * in a future iteration.
   */
  async enqueueIfAway(payload: NotificationPayload): Promise<void> {
    // For now, this just shows the notification immediately if permitted.
    // In a full implementation, this would:
    // - Check user presence (away vs active)
    // - If away: send to Service Worker for background delivery
    // - If active: optionally show a toast instead
    if (this.isPermitted()) {
      await this.notify(payload);
    }
  }

  /**
   * Play a notification sound for @mentions (user-configurable).
   */
  playSoundIfEnabled(): void {
    if (!this.soundEnabled || !this.audioElement) return;

    try {
      // Reset to start and play
      this.audioElement.currentTime = 0;
      this.audioElement.play().catch((err) => {
        // Autoplay may be blocked by browser policy; gracefully ignore
        console.debug('Could not autoplay notification sound:', err);
      });
    } catch (err) {
      console.error('Error playing notification sound:', err);
    }
  }

  /**
   * Enable/disable notification sound.
   */
  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  /**
   * Check if sound is enabled.
   */
  isSoundEnabled(): boolean {
    return this.soundEnabled;
  }
}

// Singleton instance
export const notificationManager = new NotificationManager();
