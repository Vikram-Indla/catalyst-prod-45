import type { Meta, StoryObj } from '@storybook/react';
import { CatalystBanner } from '@/components/ads/CatalystBanner';

const meta: Meta<typeof CatalystBanner> = {
  title: 'Components/Banner',
  component: CatalystBanner,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof CatalystBanner>;

export const Announcement: Story = {
  args: { children: 'Catalyst v3.0 is now live. Check the release notes for new features.', appearance: 'announcement' },
};

export const Warning: Story = {
  args: { children: 'Jira sync is paused. Data may be stale.', appearance: 'warning' },
};

export const Error: Story = {
  args: { children: 'Connection to Supabase lost. Retrying...', appearance: 'error' },
};
