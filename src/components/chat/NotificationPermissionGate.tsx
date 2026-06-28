/**
 * NotificationPermissionGate — Prompts user to enable notifications for chat.
 *
 * Rendered once per session when:
 * - Notification API is available
 * - User hasn't already granted permission
 * - User hasn't explicitly dismissed the prompt (dismissed state tracked in sessionStorage)
 *
 * Button actions:
 * - "Enable" → calls requestPermission() and updates UI
 * - "Not now" → dismisses the banner (session-scoped)
 *
 * Typically mounted near the top of the chat dock or main app shell.
 */
import React, { useEffect, useState } from 'react';
import Button from '@atlaskit/button/new';
import { AtlaskitIcon } from '@atlaskit/icon';
import BellIcon from '@atlaskit/icon/glyph/notification';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import { notificationManager } from '@/lib/chat/NotificationManager';

const DISMISS_KEY = 'catalyst-chat-notification-gate-dismissed';

export interface NotificationPermissionGateProps {
  /**
   * Callback when permission is granted.
   */
  onPermissionGranted?: () => void;
  /**
   * Callback when user dismisses the prompt.
   */
  onDismissed?: () => void;
}

export function NotificationPermissionGate({
  onPermissionGranted,
  onDismissed,
}: NotificationPermissionGateProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  // Determine if the gate should be shown on mount
  useEffect(() => {
    // Check if Notification API is available
    if (!('Notification' in window)) {
      return;
    }

    // Check if permission is already granted
    if (notificationManager.getPermissionState() === 'granted') {
      return;
    }

    // Check if user has dismissed the prompt in this session
    const wasDismissed = sessionStorage.getItem(DISMISS_KEY);
    if (wasDismissed) {
      return;
    }

    // Show the gate
    setIsVisible(true);
  }, []);

  const handleEnableClick = async () => {
    setIsRequesting(true);
    const granted = await notificationManager.requestPermission();
    setIsRequesting(false);

    if (granted) {
      setIsVisible(false);
      if (onPermissionGranted) {
        onPermissionGranted();
      }
    }
  };

  const handleDismissClick = () => {
    sessionStorage.setItem(DISMISS_KEY, 'true');
    setIsVisible(false);
    if (onDismissed) {
      onDismissed();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: 'var(--ds-background-information-subtle)',
        borderBottom: '1px solid var(--ds-border)',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            flexShrink: 0,
          }}
        >
          <BellIcon label="notifications" size="medium" primaryColor="var(--ds-link)" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--ds-font-size-400)',
              fontWeight: 500,
              color: 'var(--ds-text)',
            }}
          >
            Enable notifications for chat
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--ds-font-size-200)',
              color: 'var(--ds-text-subtle)',
            }}
          >
            Get notified of @mentions, direct messages, and reminders.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <Button
          appearance="primary"
          onClick={handleEnableClick}
          isLoading={isRequesting}
          isDisabled={isRequesting}
        >
          Enable
        </Button>
        <Button
          appearance="subtle"
          onClick={handleDismissClick}
          isDisabled={isRequesting}
          iconBefore={<CrossIcon label="dismiss" />}
        />
      </div>
    </div>
  );
}

export default NotificationPermissionGate;
