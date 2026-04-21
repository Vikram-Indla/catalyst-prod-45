import { useState } from 'react';
import { IconButton } from '@atlaskit/button/new';
import { Bell } from 'lucide-react';
import { Box, xcss } from '@atlaskit/primitives';
import Badge from '@atlaskit/badge';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import { useUnreadCount } from '@/hooks/useUnreadCount';

// Anchor sits above the icon button so the Atlaskit Badge reads as an
// overlay pip, matching Jira's unread count pattern.
//
// IconButton is 32×32 with a 20 px glyph centered → 6 px padding ring.
// Negative offsets (top/right: -4 px) pushed the badge OUTSIDE the button
// bounds, ~10 px away from the visible bell glyph — it looked detached
// (Vikram screenshot critique, Apr 2026). Positive small inset (top/right:
// 2 px) pulls the badge onto the glyph's top-right corner so it reads as
// a pip clipping the icon, exactly like Jira's unread indicator.
const triggerWrapStyles = xcss({ position: 'relative', display: 'inline-block' });
const badgeAnchorStyles = xcss({
  position: 'absolute',
  top: 'space.025',
  insetInlineEnd: 'space.025',
  pointerEvents: 'none',
  zIndex: 'card',
});

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
          <Box
            xcss={badgeAnchorStyles}
            role="status"
            aria-label={`${unreadCount} unread notifications`}
          >
            <Badge appearance="important" max={9}>{unreadCount}</Badge>
          </Box>
        ) : null}
      </Box>
      <NotificationPanel isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
