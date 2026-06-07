import type { Meta, StoryObj } from '@storybook/react';
import { SyncStatusIndicator } from '@/components/ui/SyncStatusIndicator';

const meta: Meta<typeof SyncStatusIndicator> = {
  title: 'Components/Sync Status Indicator',
  component: SyncStatusIndicator,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof SyncStatusIndicator>;

export const Synced: Story = { args: { status: 'synced' } };
export const Syncing: Story = { args: { status: 'syncing' } };
export const Error: Story = { args: { status: 'error' } };
