/**
 * ChatToastRenderer — Renders toast notifications using @atlaskit/flag + FlagGroup.
 *
 * Integrates with useChatNotifications hook to display the toast queue.
 * Icons and colors:
 * - success: green check + auto-dismiss 3s
 * - error: red X + sticky (manual close)
 * - info: blue info icon + auto-dismiss
 * - warning: amber caution icon + auto-dismiss
 */
import React, { useCallback } from 'react';
import { Flag, FlagGroup } from '@atlaskit/flag';
import SuccessIcon from '@atlaskit/icon/glyph/check-circle';
import ErrorIcon from '@atlaskit/icon/glyph/error';
import InfoIcon from '@atlaskit/icon/glyph/info';
import WarningIcon from '@atlaskit/icon/glyph/warning';
import type { Toast } from '@/hooks/chat/useChatNotifications';

export interface ChatToastRendererProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ChatToastRenderer({ toasts, onDismiss }: ChatToastRendererProps) {
  const getIconForType = useCallback((type: string) => {
    switch (type) {
      case 'success':
        return <SuccessIcon label="success" primaryColor="var(--ds-text-success, #216E4E)" />;
      case 'error':
        return <ErrorIcon label="error" primaryColor="var(--ds-text-danger, #AE2A19)" />;
      case 'info':
        return <InfoIcon label="info" primaryColor="var(--ds-link, #0052CC)" />;
      case 'warning':
        return <WarningIcon label="warning" primaryColor="var(--ds-text-warning, #974F0C)" />;
      default:
        return null;
    }
  }, []);

  const getColorForType = useCallback((type: string) => {
    switch (type) {
      case 'success':
        return 'success';
      case 'error':
        return 'danger';
      case 'info':
        return 'information';
      case 'warning':
        return 'warning';
      default:
        return 'normal';
    }
  }, []);

  return (
    <FlagGroup>
      {toasts.map((toast) => (
        <Flag
          key={toast.id}
          id={toast.id}
          icon={getIconForType(toast.type)}
          title={toast.title}
          description={toast.description}
          appearance={getColorForType(toast.type) as any}
          isDismissAllowed
          onDismissed={() => onDismiss(toast.id)}
        />
      ))}
    </FlagGroup>
  );
}

export default ChatToastRenderer;
