import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import React from 'react';
import CatalystViewFeature from '@/components/catalyst-detail-views/feature/CatalystViewFeature';
import { seedForIssue } from '../fixtures/storyQueryClient';

const issueData = {
  id: 'ph-feat-001', issue_key: 'BAU-5174', summary: 'Landing Page – DGA modification',
  issue_type: 'Feature', status: 'In Development', status_category: 'indeterminate',
  priority: 'High', assignee_display_name: 'Nada Alfassam', reporter_display_name: 'Hassan Raza Hasrat',
  assignee_account_id: 'u-nada', reporter_account_id: 'u-hassan',
  parent_key: 'BAU-4466', parent_summary: 'Senaei App – Revamp (UI)',
  labels: ['dga', 'landing-page'], severity: null, due_date: null,
  project_key: 'BAU', description_adf: null, deleted_at: null, sprint_release: null,
  description_text: 'Modify the public landing page to align with DGA guidelines.',
  jira_created_at: '2026-03-15T10:00:00Z', jira_updated_at: '2026-06-01T14:00:00Z',
};

const meta: Meta = { title: 'Pages/Feature', parameters: { layout: 'fullscreen' } };
export default meta;

export const PanelMode: StoryObj = {
  render: () => { seedForIssue(issueData.issue_key, issueData); return <div style={{ height: 700, position: 'relative' }}><CatalystViewFeature isOpen={true} onClose={fn()} itemId={issueData.issue_key} projectKey="BAU" panelMode /></div>; },
};
export const FullPage: StoryObj = {
  render: () => { seedForIssue(issueData.issue_key, issueData); return <div style={{ height: 700, position: 'relative' }}><CatalystViewFeature isOpen={true} onClose={fn()} itemId={issueData.issue_key} projectKey="BAU" fullPageMode /></div>; },
};
