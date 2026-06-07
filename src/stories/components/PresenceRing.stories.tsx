import type { Meta, StoryObj } from '@storybook/react';
import { PresenceRing } from '@/components/shared/PresenceRing';

const meta: Meta<typeof PresenceRing> = {
  title: 'Components/Presence Ring',
  component: PresenceRing,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof PresenceRing>;

export const Online: Story = { args: { status: 'online', name: 'Vikram Indla' } };
export const Away: Story = { args: { status: 'away', name: 'Syed Habib' } };
export const Offline: Story = { args: { status: 'offline', name: 'Bob Chen' } };
