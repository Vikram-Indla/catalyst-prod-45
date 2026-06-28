import type { Meta, StoryObj } from '@storybook/react';
import { CatalystSidebarDetails } from '@/components/catalyst-detail-views/shared/sections/CatalystSidebarDetails';

const MOCK_ISSUE = {
  issue_key: 'BAU-5757',
  summary: 'Implement user authentication flow',
  issue_type: 'Story',
  status: 'In Progress',
  status_category: 'indeterminate',
  priority: 'High',
  assignee_account_id: 'user-1',
  assignee_display_name: 'Vikram Indla',
  reporter_display_name: 'Syed Habib',
  created: '2026-05-01T10:00:00Z',
  updated: '2026-06-01T14:30:00Z',
  labels: ['frontend', 'auth'],
  fix_versions: [{ name: 'Sprint 2.2' }],
};

const meta: Meta<typeof CatalystSidebarDetails> = {
  title: 'Enterprise Components/Sidebar Details',
  component: CatalystSidebarDetails,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div style={{ width: 320, border: '1px solid var(--ds-border)', borderRadius: 4, padding: 16 }}><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof CatalystSidebarDetails>;

export const StoryView: Story = { args: { issue: MOCK_ISSUE } };
