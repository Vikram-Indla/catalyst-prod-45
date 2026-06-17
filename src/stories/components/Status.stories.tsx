import type { Meta, StoryObj } from '@storybook/react';
import { CatalystStatusPill } from '@/components/catalyst-detail-views/shared/sections/CatalystStatusPill';
import { STATUSES } from '../fixtures/production-data';

const meta: Meta<typeof CatalystStatusPill> = {
  title: 'Components/Status',
  component: CatalystStatusPill,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CatalystStatusPill>;

export const ToDo: Story = { args: { status: 'ToDo', statusCategory: 'new' } };
export const InProgress: Story = { args: { status: 'In Progress', statusCategory: 'indeterminate' } };
export const Done: Story = { args: { status: 'Done', statusCategory: 'done' } };
export const OnHold: Story = { args: { status: 'On Hold', statusCategory: 'indeterminate' } };
export const BetaReady: Story = { args: { status: 'BETA READY', statusCategory: 'done' } };

export const AllProductionStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {STATUSES.map((s) => (
        <CatalystStatusPill
          key={s.name}
          status={s.name}
          statusCategory={s.category === 'To Do' ? 'new' : s.category === 'In Progress' ? 'indeterminate' : 'done'}
        />
      ))}
    </div>
  ),
};
