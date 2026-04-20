import type { ReactNode } from 'react';
import Avatar from '@atlaskit/avatar';
import Lozenge from '@atlaskit/lozenge';
import { LinkItem } from '@atlaskit/menu';
import { Box, Flex, Stack, Text, xcss } from '@atlaskit/primitives';

export type LayoutNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  href?: string | null;
  sourceIcon?: ReactNode;
};

const bodyStyles = xcss({ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });

function relativeTime(timestamp: string) {
  const then = new Date(timestamp).getTime();
  if (!Number.isFinite(then)) return '';
  const minutes = Math.max(1, Math.round((Date.now() - then) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function NotificationItem({ title, body, timestamp, read, href, sourceIcon }: LayoutNotification) {
  return (
    <LinkItem
      href={href ?? '#'}
      iconBefore={sourceIcon ?? <Avatar size="small" />}
      description={
        <Stack space="space.025">
          <Box xcss={bodyStyles}><Text>{body}</Text></Box>
          <Text size="small" color="color.text.subtlest">{relativeTime(timestamp)}</Text>
        </Stack>
      }
    >
      <Flex alignItems="center" justifyContent="space-between" gap="space.100">
        <Text weight="semibold">{title}</Text>
        {!read ? <Lozenge appearance="inprogress">NEW</Lozenge> : null}
      </Flex>
    </LinkItem>
  );
}