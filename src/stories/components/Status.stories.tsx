import type { Meta, StoryObj } from '@storybook/react';
import { StatusLozengeDropdown } from '@/components/shared/StatusLozenge';
import { STATUSES } from '../fixtures/production-data';

const meta: Meta<typeof StatusLozengeDropdown> = {
  title: 'Components/Status',
  component: StatusLozengeDropdown,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof StatusLozengeDropdown>;

export const ToDo: Story = { args: { status: 'ToDo', statusCategory: 'new' } };
export const InProgress: Story = { args: { status: 'In Progress', statusCategory: 'indeterminate' } };
export const Done: Story = { args: { status: 'Done', statusCategory: 'done' } };
export const OnHold: Story = { args: { status: 'On Hold', statusCategory: 'indeterminate' } };
export const BetaReady: Story = { args: { status: 'BETA READY', statusCategory: 'done' } };

export const AllProductionStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {STATUSES.map((s) => (
        <StatusLozengeDropdown
          key={s.name}
          status={s.name}
          statusCategory={s.category === 'To Do' ? 'new' : s.category === 'In Progress' ? 'indeterminate' : 'done'}
        />
      ))}
    </div>
  ),
};
