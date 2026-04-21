import { useState } from 'react';
import Badge from '@atlaskit/badge';
import { IconButton } from '@atlaskit/button/new';
import NotificationIcon from '@atlaskit/icon/glyph/notification';
import { Box, xcss } from '@atlaskit/primitives';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import { useUnreadCount } from '@/hooks/useUnreadCount';

const triggerWrapStyles = xcss({ position: 'relative', display: 'inline-block' });
const badgeStyles = xcss({ position: 'absolute', insetBlockStart: 'space.0', insetInlineEnd: 'space.0' });

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const { data: unreadCount = 0 } = useUnreadCount();

  return (
    <>
      <Box xcss={triggerWrapStyles}>
        <IconButton
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
      <NotificationPanel isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
