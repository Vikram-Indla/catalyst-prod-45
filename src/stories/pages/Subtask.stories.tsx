import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import CatalystViewSubtask from '@/components/catalyst-detail-views/subtask/CatalystViewSubtask';
import { seedForIssue } from '../fixtures/storyQueryClient';

const issueData = {
  id: 'ph-sub-001', issue_key: 'BAU-5958', summary: 'Add client-side validation rule for price field',
  issue_type: 'Sub-task', status: 'In Progress', status_category: 'indeterminate',
  priority: 'Medium', assignee_display_name: 'Amadou Ndiaye', reporter_display_name: 'Ahmed Yousry',
  assignee_account_id: 'u-amadou', reporter_account_id: 'u-ahmed',
  parent_key: 'BAU-5957', parent_summary: 'Update product details survey – add price validation',
  labels: [] as string[], severity: null, due_date: null,
  project_key: 'BAU', description_adf: null, deleted_at: null, sprint_release: null,
  description_text: 'Implement the client-side validation rule that rejects negative or zero prices.',
  jira_created_at: '2026-04-18T10:00:00Z', jira_updated_at: '2026-06-01T14:00:00Z',
};

const meta: Meta = { title: 'Pages/Subtask', parameters: { layout: 'fullscreen' } };
export default meta;

export const PanelMode: StoryObj = {
  render: () => { seedForIssue(issueData.issue_key, issueData); return <div style={{ height: 700, position: 'relative' }}><CatalystViewSubtask isOpen={true} onClose={fn()} itemId={issueData.issue_key} projectKey="BAU" panelMode /></div>; },
};
