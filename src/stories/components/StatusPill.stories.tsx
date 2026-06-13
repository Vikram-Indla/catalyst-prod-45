import type { Meta, StoryObj } from '@storybook/react';
import { CatalystStatusPill } from '@/components/catalyst-detail-views/shared/sections/CatalystStatusPill';

/**
 * CANONICAL status pill component.
 *
 * Interactive header pill used across all 7 CatalystView* work-item types.
 * Spacing grid: 4/8/16/24/32px (ADS Foundations > Spacing > Grid).
 * Colors: Jira-probed medium-pastel hex — NOT ADS tokens (intentional, per
 * design review 2026-05-05 — ADS bold tokens are too dark vs actual Jira DOM).
 *
 * @see CatalystStatusPill.tsx for full architecture notes.
 * @deprecated_alternatives
 *   - Interactive header: use CatalystStatusPill (this component)
 *   - Table row display: use StatusPill from @/components/shared/JiraTable/cells
 *   - src/components/shared/StatusPill — DEPRECATED (hardcoded rgb, no callers)
 *   - src/modules/in-jira/components/StatusPill — DEPRECATED (Tailwind utilities)
 */
const meta: Meta<typeof CatalystStatusPill> = {
  title: 'Components/Status Pill',
  component: CatalystStatusPill,
  parameters: { layout: 'padded' },
  argTypes: {
    issueType: {
      control: 'select',
      options: ['Story', 'Epic', 'Feature', 'Task', 'QA Bug', 'Production Incident', 'Change Request', 'Business Gap'],
    },
  },
};
export default meta;
type Story = StoryObj<typeof CatalystStatusPill>;

export const Default: Story = {
  args: { status: 'In Progress', statusCategory: 'in_progress' },
};

export const Todo: Story = {
  args: { status: 'Backlog', statusCategory: 'new' },
};

export const Done: Story = {
  args: { status: 'Done', statusCategory: 'done' },
};

export const Moved: Story = {
  args: { status: 'On Hold', statusCategory: 'moved' },
};

export const Cancelled: Story = {
  args: { status: 'Cancelled', statusCategory: 'removed' },
};

export const AllCategories: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <CatalystStatusPill status="Backlog" statusCategory="new" />
      <CatalystStatusPill status="In Progress" statusCategory="in_progress" />
      <CatalystStatusPill status="In Review" statusCategory="in_progress" />
      <CatalystStatusPill status="Done" statusCategory="done" />
      <CatalystStatusPill status="On Hold" statusCategory="moved" />
      <CatalystStatusPill status="Cancelled" statusCategory="removed" />
    </div>
  ),
};

export const WithWorkflowType: Story = {
  args: { status: 'Ready for QA', statusCategory: 'in_progress', issueType: 'QA Bug' },
};
