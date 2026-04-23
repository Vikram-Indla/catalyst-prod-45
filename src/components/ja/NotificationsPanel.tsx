import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { IconButton } from '@atlaskit/button/new';
import { Bell } from 'lucide-react';
import { Box, xcss } from '@atlaskit/primitives';
import Badge from '@atlaskit/badge';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import { useUnreadCount, markNotificationsViewed } from '@/hooks/useUnreadCount';
import { useUnreadCountFromSync } from '@/hooks/useDirectFromSync';

// Anchor sits above the icon button so the Atlaskit Badge reads as an
// overlay pip, matching Jira's unread count pattern.
const triggerWrapStyles = xcss({ position: 'relative', display: 'inline-block' });
const badgeAnchorStyles = xcss({
  position: 'absolute',
  top: 'space.negative.050',
  insetInlineEnd: 'space.negative.050',
  pointerEvents: 'none',
});

// Outline bell to match Jira's transparent/stroked notification icon.
// Atlaskit's `notification` and `notification-all` glyphs are solid-filled,
// so we render Lucide `Bell` (1.75 stroke, no fill) at 20px to mirror Jira.
const BellGlyph = (props: { label: string }) => (
  <Bell size={20} strokeWidth={1.75} aria-label={props.label} />
);

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const { data: unreadCount = 0 } = useUnreadCountFromSync();
  const queryClient = useQueryClient();

  return (
    <>
      <Box xcss={triggerWrapStyles}>
        <IconButton
          icon={BellGlyph}
          label="Notifications"
          appearance="subtle"
          isSelected={open}
          onClick={() => setOpen((current) => {
            if (!current) {
              // Stamp the "last viewed" timestamp then force badge to re-query
              // so it immediately drops to 0 — matches Jira's behaviour exactly.
              markNotificationsViewed();
              queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
            }
            return !current;
          })}
        />
        {unreadCount > 0 ? (
          <Box
            xcss={badgeAnchorStyles}
            role="status"
            aria-label={`${unreadCount} unread notifications`}
          >
            <Badge appearance="important" max={99}>{unreadCount}</Badge>
          </Box>
        ) : null}
      </Box>
      <NotificationPanel isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
