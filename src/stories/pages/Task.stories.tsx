import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import React from 'react';
import { CatalystViewTask } from '@/components/catalyst-detail-views/task/CatalystViewTask';
import { seedForIssue } from '../fixtures/storyQueryClient';
import { ISSUES } from '../fixtures/production-data';

const issueData = {
  ...ISSUES.task,
  id: 'ph-task-001', project_key: 'IRP',
  description_adf: null, deleted_at: null, sprint_release: null,
  assignee_account_id: 'u-dreni', reporter_account_id: 'u-faisal',
};

const meta: Meta = { title: 'Pages/Task', parameters: { layout: 'fullscreen' } };
export default meta;

export const PanelMode: StoryObj = {
  render: () => { seedForIssue(issueData.issue_key, issueData); return <div style={{ height: 700, position: 'relative' }}><CatalystViewTask isOpen={true} onClose={fn()} itemId={issueData.issue_key} projectKey="IRP" panelMode /></div>; },
};
