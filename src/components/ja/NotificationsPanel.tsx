import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '@atlaskit/badge';
import { IconButton } from '@atlaskit/atlassian-navigation';
import NotificationIcon from '@atlaskit/icon/glyph/notification';
import Popup from '@atlaskit/popup';
import { NotificationList, type Notification as LayoutNotification } from '@/components/layout/NotificationList';
import { useNotifications, type Notification } from '@/hooks/useNotifications';

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
        <IconButton
          {...triggerProps}
          icon={(iconProps) => <NotificationIcon {...iconProps} label="" />}
          label="Notifications"
          tooltip="Notifications"
          isSelected={open}
          onClick={() => setOpen((current) => !current)}
          badge={unreadCount > 0 ? () => <Badge appearance="important">{unreadCount > 9 ? '9+' : unreadCount}</Badge> : undefined}
        />
      )}
    />
  );
}