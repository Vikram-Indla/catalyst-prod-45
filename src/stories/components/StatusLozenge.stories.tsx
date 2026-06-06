import type { Meta, StoryObj } from '@storybook/react';
import { StatusLozenge } from '@/components/ui/StatusLozenge';

const meta: Meta<typeof StatusLozenge> = {
  title: 'Components/Status Lozenge',
  component: StatusLozenge,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof StatusLozenge>;

export const ToDo: Story = { args: { status: 'todo' } };
export const InProgress: Story = { args: { status: 'in_progress' } };
export const Done: Story = { args: { status: 'done' } };
export const ReadyForQA: Story = { args: { status: 'ready_for_qa' } };
export const OnHold: Story = { args: { status: 'on_hold' } };

export const AllStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {['todo', 'in_progress', 'in_review', 'ready_for_qa', 'in_qa', 'in_uat', 'done', 'on_hold', 'in_design', 'in_development', 'in_production', 'pending_approval'].map((s) => (
        <StatusLozenge key={s} status={s} />
      ))}
    </div>
  ),
};
