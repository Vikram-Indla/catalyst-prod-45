import type { Meta, StoryObj } from '@storybook/react';
import { CatalystStatusPill } from '@/components/catalyst-detail-views/shared/sections/CatalystStatusPill';

const meta: Meta<typeof CatalystStatusPill> = {
  title: 'Components/Status Pill',
  component: CatalystStatusPill,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CatalystStatusPill>;

export const ToDo: Story = { args: { status: 'To Do', statusCategory: 'new' } };
export const InProgress: Story = { args: { status: 'In Progress', statusCategory: 'indeterminate' } };
export const Done: Story = { args: { status: 'Done', statusCategory: 'done' } };
export const ReadyForQA: Story = { args: { status: 'Ready for QA', statusCategory: 'indeterminate' } };
export const Blocked: Story = { args: { status: 'Blocked', statusCategory: 'new' } };

export const AllStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <CatalystStatusPill status="To Do" statusCategory="new" />
      <CatalystStatusPill status="In Progress" statusCategory="indeterminate" />
      <CatalystStatusPill status="In Review" statusCategory="indeterminate" />
      <CatalystStatusPill status="Ready for QA" statusCategory="indeterminate" />
      <CatalystStatusPill status="Done" statusCategory="done" />
      <CatalystStatusPill status="Blocked" statusCategory="new" />
    </div>
  ),
};
