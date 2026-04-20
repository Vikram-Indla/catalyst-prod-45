import { Section, MenuGroup } from '@atlaskit/menu';
import Heading from '@atlaskit/heading';
import { Box, Text, xcss } from '@atlaskit/primitives';
import { NotificationItem, type LayoutNotification } from './NotificationItem';

export type Notification = LayoutNotification;

interface NotificationListProps {
  notifications: Notification[];
  onItemClick?: (id: string) => void;
}

const scrollStyles = xcss({ maxBlockSize: '480px', overflow: 'auto' });
const emptyStyles = xcss({ paddingBlock: 'space.600', textAlign: 'center' });

export function NotificationList({ notifications, onItemClick }: NotificationListProps) {
  return (
    <Box xcss={scrollStyles}>
      <MenuGroup menuLabel="Notifications" spacing="cozy">
        <Section title={<Heading size="small">Notifications</Heading>}>
          {notifications.length === 0 ? (
            <Box xcss={emptyStyles}>
              <Text color="color.text.subtle">You're all caught up</Text>
            </Box>
          ) : (
            notifications.map((notification) => (
              <Box key={notification.id} onClick={() => onItemClick?.(notification.id)}>
                <NotificationItem {...notification} />
              </Box>
            ))
          )}
        </Section>
      </MenuGroup>
    </Box>
  );
}