import type { Meta, StoryObj } from '@storybook/react';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { TEAM } from '../fixtures/production-data';

const meta: Meta<typeof CatalystAvatar> = {
  title: 'Components/Avatar',
  component: CatalystAvatar,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CatalystAvatar>;

export const WithName: Story = { args: { name: TEAM[0].name, size: 'medium' } };
export const XSmall: Story = { args: { name: TEAM[1].name, size: 'xsmall' } };
export const Small: Story = { args: { name: TEAM[2].name, size: 'small' } };
export const Medium: Story = { args: { name: TEAM[3].name, size: 'medium' } };
export const Large: Story = { args: { name: TEAM[4].name, size: 'large' } };
export const NoName: Story = { args: { size: 'medium' } };

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {(['xsmall', 'small', 'medium', 'large', 'xlarge'] as const).map((size, i) => (
        <CatalystAvatar key={size} name={TEAM[i].name} size={size} />
      ))}
    </div>
  ),
};

export const DeterministicColors: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {TEAM.map((member) => (
        <CatalystAvatar key={member.id} name={member.name} size="medium" />
      ))}
    </div>
  ),
};
