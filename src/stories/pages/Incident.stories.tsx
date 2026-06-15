import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import React from 'react';
import { CatalystViewIncident } from '@/components/catalyst-detail-views/incident/CatalystViewIncident';
import { seedForIssue } from '../fixtures/storyQueryClient';
import { ISSUES } from '../fixtures/production-data';

const issueData = {
  ...ISSUES.incident,
  id: 'ph-incident-001', project_key: 'BAU',
  description_adf: null, deleted_at: null, sprint_release: null,
  assignee_account_id: 'u-waqas', reporter_account_id: 'u-abdulmjeed',
};

const meta: Meta = { title: 'Pages/Production Incident', parameters: { layout: 'fullscreen' } };
export default meta;

export const PanelMode: StoryObj = {
  render: () => { seedForIssue(issueData.issue_key, issueData); return <div style={{ height: 700, position: 'relative' }}><CatalystViewIncident isOpen={true} onClose={fn()} itemId={issueData.issue_key} projectKey="BAU" panelMode /></div>; },
};
