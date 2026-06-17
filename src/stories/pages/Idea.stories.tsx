import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import React from 'react';
import { CatalystViewIdea } from '@/components/catalyst-detail-views/idea/CatalystViewIdea';
import { seedForIssue } from '../fixtures/storyQueryClient';

const issueData = {
  id: 'ph-idea-001', issue_key: 'IDEA-101', summary: 'AI-powered sprint planning assistant',
  issue_type: 'Idea', status: 'New', status_category: 'new',
  priority: 'Medium', assignee_display_name: 'Vikram Indla', reporter_display_name: 'Vikram Indla',
  assignee_account_id: 'u-vikram', reporter_account_id: 'u-vikram',
  parent_key: null, parent_summary: null,
  labels: ['ai', 'planner'], severity: null, due_date: null,
  project_key: 'BAU', description_adf: null, deleted_at: null, sprint_release: null,
  description_text: 'Use AI to analyze historical velocity and suggest optimal sprint commitments.',
  jira_created_at: '2026-06-01T10:00:00Z', jira_updated_at: '2026-06-01T10:00:00Z',
};

const meta: Meta = { title: 'Pages/Idea', parameters: { layout: 'fullscreen' } };
export default meta;

export const PanelMode: StoryObj = {
  render: () => { seedForIssue(issueData.issue_key, issueData); return <div style={{ height: 700, position: 'relative' }}><CatalystViewIdea isOpen={true} onClose={fn()} itemId={issueData.issue_key} projectKey="BAU" panelMode /></div>; },
};
