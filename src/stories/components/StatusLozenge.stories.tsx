import type { Meta, StoryObj } from '@storybook/react';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import { STATUSES } from '../fixtures/production-data';

const meta: Meta<typeof StatusLozenge> = {
  title: 'Components/Status Lozenge',
  component: StatusLozenge,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof StatusLozenge>;

export const ToDo: Story = { args: { status: 'ToDo' } };
export const InProgress: Story = { args: { status: 'In Progress' } };
export const Done: Story = { args: { status: 'Done' } };
export const OnHold: Story = { args: { status: 'On Hold' } };
export const BetaReady: Story = { args: { status: 'BETA READY' } };

export const AllProductionStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {STATUSES.map((s) => (
        <StatusLozenge key={s.name} status={s.name} />
      ))}
    </div>
  ),
};
