import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import NotificationPanel from '@/components/notifications/NotificationPanel';

const meta: Meta<typeof NotificationPanel> = {
  title: 'Enterprise Components/Notification Panel',
  component: NotificationPanel,
  parameters: { layout: 'padded' },
};
export default meta;

export const Open: StoryObj<typeof NotificationPanel> = {
  args: { isOpen: true, onClose: fn() },
};
export const Closed: StoryObj<typeof NotificationPanel> = {
  args: { isOpen: false, onClose: fn() },
};
