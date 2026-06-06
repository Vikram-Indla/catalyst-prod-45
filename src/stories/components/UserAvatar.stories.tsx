import type { Meta, StoryObj } from '@storybook/react';
import { UserAvatar } from '@/components/shared/UserAvatar';

const meta: Meta<typeof UserAvatar> = {
  title: 'Components/User Avatar',
  component: UserAvatar,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof UserAvatar>;

export const WithName: Story = { args: { name: 'Vikram Indla', size: 'medium' } };
export const WithCountry: Story = { args: { name: 'Syed Habib', country: 'Saudi Arabia', size: 'medium' } };
export const WithPhoto: Story = { args: { name: 'Alice Brown', src: 'https://i.pravatar.cc/150?u=alice', size: 'medium' } };
export const Small: Story = { args: { name: 'Bob Chen', size: 'small' } };
export const Large: Story = { args: { name: 'Carol Davis', size: 'large' } };

export const CountryFlags: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {[
        { name: 'Vikram', country: 'India' },
        { name: 'Syed', country: 'Saudi Arabia' },
        { name: 'Ahmed', country: 'Egypt' },
        { name: 'Ali', country: 'Pakistan' },
        { name: 'Omar', country: 'UAE' },
      ].map((u) => (
        <UserAvatar key={u.name} name={u.name} country={u.country} size="medium" />
      ))}
    </div>
  ),
};
