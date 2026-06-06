import type { Meta, StoryObj } from '@storybook/react';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { TEAM } from '../fixtures/production-data';

const meta: Meta<typeof UserAvatar> = {
  title: 'Components/User Avatar',
  component: UserAvatar,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof UserAvatar>;

export const WithName: Story = { args: { name: TEAM[0].name, size: 'medium' } };
export const WithCountry: Story = { args: { name: TEAM[1].name, country: TEAM[1].country, size: 'medium' } };
export const Small: Story = { args: { name: TEAM[2].name, size: 'small' } };
export const Large: Story = { args: { name: TEAM[3].name, size: 'large' } };

export const TeamWithFlags: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {TEAM.map((m) => (
        <UserAvatar key={m.id} name={m.name} country={m.country} size="medium" />
      ))}
    </div>
  ),
};
