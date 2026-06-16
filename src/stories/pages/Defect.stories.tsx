import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import React from 'react';
import { CatalystViewDefect } from '@/components/catalyst-detail-views/defect/CatalystViewDefect';
import { seedForIssue } from '../fixtures/storyQueryClient';
import { ISSUES } from '../fixtures/production-data';

const issueData = {
  ...ISSUES.qaBug,
  id: 'ph-defect-001', project_key: 'BAU',
  description_adf: null, deleted_at: null, sprint_release: null,
  assignee_account_id: 'u-yazeed', reporter_account_id: 'u-raghad',
};

const meta: Meta = { title: 'Pages/Defect (QA Bug)', parameters: { layout: 'fullscreen' } };
export default meta;

export const PanelMode: StoryObj = {
  render: () => { seedForIssue(issueData.issue_key, issueData); return <div style={{ height: 700, position: 'relative' }}><CatalystViewDefect isOpen={true} onClose={fn()} itemId={issueData.issue_key} projectKey="BAU" panelMode /></div>; },
};
