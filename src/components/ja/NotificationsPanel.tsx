import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '@atlaskit/badge';
import { IconButton } from '@atlaskit/button/new';
import NotificationIcon from '@atlaskit/icon/glyph/notification';
import Popup from '@atlaskit/popup';
import { Box, xcss } from '@atlaskit/primitives';
import { NotificationList, type Notification as LayoutNotification } from '@/components/layout/NotificationList';
import { useNotifications, type Notification } from '@/hooks/useNotifications';

const triggerWrapStyles = xcss({ position: 'relative', display: 'inline-block' });
const badgeStyles = xcss({ position: 'absolute', insetBlockStart: 'space.0', insetInlineEnd: 'space.0' });

function toLayoutNotification(notification: Notification): LayoutNotification {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.message || notification.title,
    timestamp: notification.created_at,
    read: notification.is_read,
    href: notification.link,
  };
}

export function NotificationsPanel() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead } = useNotifications();

  const handleItemClick = async (id: string) => {
    const notification = notifications.find((item) => item.id === id);
    if (!notification) return;
    if (!notification.is_read) await markAsRead(id);
    if (notification.link) {
      setOpen(false);
      navigate(notification.link);
    }
  };

  return (
    <Popup
      isOpen={open}
      onClose={() => setOpen(false)}
      placement="bottom-end"
      content={() => (
        <NotificationList
          notifications={notifications.map(toLayoutNotification)}
          onItemClick={handleItemClick}
        />
      )}
      trigger={(triggerProps) => (
        <Box xcss={triggerWrapStyles}>
          <IconButton
            {...triggerProps}
            icon={NotificationIcon}
            label="Notifications"
            appearance="subtle"
            isSelected={open}
            onClick={() => setOpen((current) => !current)}
          />
          {unreadCount > 0 ? (
            <Box xcss={badgeStyles} aria-label={`${unreadCount} unread notifications`}>
              <Badge appearance="important">{unreadCount > 9 ? '9+' : unreadCount}</Badge>
            </Box>
          ) : null}
        </Box>
      )}
    />
  );
}