import type { Meta, StoryObj } from '@storybook/react';
import { PriorityIndicator } from '@/components/shared/PriorityIndicator';

const meta: Meta<typeof PriorityIndicator> = {
  title: 'Components/Priority Indicator',
  component: PriorityIndicator,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof PriorityIndicator>;

export const Critical: Story = { args: { priority: 'Critical' } };
export const High: Story = { args: { priority: 'High' } };
export const Medium: Story = { args: { priority: 'Medium' } };
export const Low: Story = { args: { priority: 'Low' } };
export const BarsOnly: Story = { args: { priority: 'High', showLabel: false } };

export const AllLevels: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {['Critical', 'High', 'Medium', 'Low'].map((p) => (
        <PriorityIndicator key={p} priority={p} />
      ))}
    </div>
  ),
};
