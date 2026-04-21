import { useState } from 'react';
import { IconButton } from '@atlaskit/button/new';
import { Bell } from 'lucide-react';
import { Box, xcss } from '@atlaskit/primitives';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import { useUnreadCount } from '@/hooks/useUnreadCount';

const triggerWrapStyles = xcss({ position: 'relative', display: 'inline-block' });

// Outline bell to match Jira's transparent/stroked notification icon.
// Atlaskit's `notification` and `notification-all` glyphs are solid-filled,
// so we render Lucide `Bell` (1.75 stroke, no fill) at 20px to mirror Jira.
const BellGlyph = (props: { label: string }) => (
  <Bell size={20} strokeWidth={1.75} aria-label={props.label} />
);

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const { data: unreadCount = 0 } = useUnreadCount();

  return (
    <>
      <Box xcss={triggerWrapStyles}>
        <IconButton
          icon={BellGlyph}
          label="Notifications"
          appearance="subtle"
          isSelected={open}
          onClick={() => setOpen((current) => !current)}
        />
        {unreadCount > 0 ? (
          <span
            aria-label={`${unreadCount} unread notifications`}
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 22,
              height: 16,
              padding: '0 5px',
              borderRadius: 4,
              background: '#F5A6A1',
              color: '#1F1F1F',
              fontSize: 11,
              fontWeight: 700,
              lineHeight: '16px',
              textAlign: 'center',
              pointerEvents: 'none',
              fontFamily: 'Inter, system-ui, sans-serif',
              display: 'inline-block',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </Box>
      <NotificationPanel isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
