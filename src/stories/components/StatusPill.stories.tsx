import type { Meta, StoryObj } from '@storybook/react';
import { StatusPill } from '@/components/shared/StatusPill';

const meta: Meta<typeof StatusPill> = {
  title: 'Components/Status Pill (Neutral)',
  component: StatusPill,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof StatusPill>;

export const Default: Story = { args: { value: 'in_progress' } };
export const CustomLabel: Story = { args: { value: 'ready_for_qa', label: 'Ready for QA' } };
export const Empty: Story = { args: { value: null } };

export const AllStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {['new_request', 'in_progress', 'in_review', 'approved', 'done', 'on_hold', 'cancelled'].map((v) => (
        <StatusPill key={v} value={v} />
      ))}
    </div>
  ),
};
