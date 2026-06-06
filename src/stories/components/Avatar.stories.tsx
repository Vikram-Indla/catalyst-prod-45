import type { Meta, StoryObj } from '@storybook/react';
import CatalystAvatar from '@/components/shared/CatalystAvatar';

const meta: Meta<typeof CatalystAvatar> = {
  title: 'Components/Avatar',
  component: CatalystAvatar,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CatalystAvatar>;

export const WithName: Story = { args: { name: 'Vikram Indla', size: 'medium' } };
export const WithImage: Story = { args: { name: 'Syed Habib', src: 'https://i.pravatar.cc/150?u=syed', size: 'medium' } };
export const XSmall: Story = { args: { name: 'Alice Brown', size: 'xsmall' } };
export const Small: Story = { args: { name: 'Bob Chen', size: 'small' } };
export const Medium: Story = { args: { name: 'Carol Davis', size: 'medium' } };
export const Large: Story = { args: { name: 'David Evans', size: 'large' } };

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <CatalystAvatar name="A B" size="xsmall" />
      <CatalystAvatar name="C D" size="small" />
      <CatalystAvatar name="E F" size="medium" />
      <CatalystAvatar name="G H" size="large" />
      <CatalystAvatar name="I J" size="xlarge" />
    </div>
  ),
};

export const NoName: Story = { args: { size: 'medium' } };

export const DeterministicColors: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {['Vikram Indla', 'Syed Habib', 'Yazeed Daraz', 'Alice Brown', 'Bob Chen', 'Carol Davis', 'David Evans', 'Emma Fox'].map((name) => (
        <CatalystAvatar key={name} name={name} size="medium" />
      ))}
    </div>
  ),
};
