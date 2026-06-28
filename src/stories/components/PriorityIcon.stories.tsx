import type { Meta, StoryObj } from '@storybook/react';
import PriorityIcon from '@/components/shared/PriorityIcon';

const meta: Meta<typeof PriorityIcon> = {
  title: 'Components/Priority Icon',
  component: PriorityIcon,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof PriorityIcon>;

export const Highest: Story = { args: { level: 'Highest', size: 16 } };
export const High: Story = { args: { level: 'High', size: 16 } };
export const Medium: Story = { args: { level: 'Medium', size: 16 } };
export const Low: Story = { args: { level: 'Low', size: 16 } };
export const Lowest: Story = { args: { level: 'Lowest', size: 16 } };
export const Empty: Story = { args: { level: null, size: 16 } };

export const AllLevels: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {['Highest', 'High', 'Medium', 'Low', 'Lowest'].map((level) => (
        <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PriorityIcon level={level} size={16} />
          <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text, #172B4D)' }}>{level}</span>
        </div>
      ))}
    </div>
  ),
};
