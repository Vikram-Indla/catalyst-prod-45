import type { Meta, StoryObj } from '@storybook/react';
import { NotificationItem } from '@/components/layout/NotificationItem';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import React from 'react';

const meta: Meta<typeof NotificationItem> = {
  title: 'Enterprise Components/Notification Components',
  component: NotificationItem,
  parameters: { layout: 'padded' },
};
export default meta;

export const Unread: StoryObj<typeof NotificationItem> = {
  args: {
    id: 'n1', type: 'mention', title: 'Yazeed mentioned you',
    body: '@Vikram review the validation on BAU-5972',
    timestamp: new Date(Date.now() - 1_800_000).toISOString(),
    read: false, href: '#',
    sourceIcon: <JiraIssueTypeIcon type="Story" size={24} />,
  },
};
export const Read: StoryObj<typeof NotificationItem> = {
  args: {
    id: 'n2', type: 'comment', title: 'Nada on BAU-5831',
    body: 'Deployment ready for staging review.',
    timestamp: new Date(Date.now() - 86_400_000).toISOString(),
    read: true, href: '#',
  },
};
