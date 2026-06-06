import type { Meta, StoryObj } from '@storybook/react';
import { CatalystKeyDetails } from '@/components/catalyst-detail-views/shared/sections/CatalystKeyDetails';

const MOCK_ISSUE = {
  issue_key: 'BAU-5757',
  summary: 'Implement user authentication flow',
  issue_type: 'Story',
  status: 'In Progress',
  status_category: 'indeterminate',
  priority: 'High',
  parent_key: 'BAU-4466',
  parent_summary: 'Authentication Epic',
  assignee_display_name: 'Vikram Indla',
  reporter_display_name: 'Syed Habib',
  severity: null,
};

const meta: Meta<typeof CatalystKeyDetails> = {
  title: 'Enterprise Components/Key Details',
  component: CatalystKeyDetails,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CatalystKeyDetails>;

export const StoryType: Story = { args: { issue: MOCK_ISSUE, itemType: 'story' } };
export const EpicType: Story = { args: { issue: { ...MOCK_ISSUE, issue_type: 'Epic' }, itemType: 'epic' } };
