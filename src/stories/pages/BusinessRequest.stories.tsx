import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import React from 'react';
import CatalystViewBusinessRequestV3 from '@/components/catalyst-detail-views/business-request/CatalystViewBusinessRequest.v3';
import { seedForIssue } from '../fixtures/storyQueryClient';
import { ISSUES } from '../fixtures/production-data';

const issueData = {
  ...ISSUES.businessRequest,
  id: 'br-001',
  request_key: ISSUES.businessRequest.issue_key,
  title: ISSUES.businessRequest.summary,
  product_id: 'prod-001', product_code: 'MDT', project_key: 'MDT',
  description: 'Enable investors to submit fast-track shipment requests.',
  description_adf: null, deleted_at: null, sprint_release: null,
  assignee_account_id: 'u-nada', reporter_account_id: null,
  process_step: 'On Hold',
};

const meta: Meta = { title: 'Pages/Business Request', parameters: { layout: 'fullscreen' } };
export default meta;

export const PanelMode: StoryObj = {
  render: () => {
    // BR view uses useProductHubBusinessRequest, different cache key
    seedForIssue(issueData.issue_key, issueData);
    return <div style={{ height: 700, position: 'relative' }}><CatalystViewBusinessRequestV3 isOpen={true} onClose={fn()} itemId={issueData.issue_key} projectKey="MDT" panelMode /></div>;
  },
};
export const FullPage: StoryObj = {
  render: () => {
    seedForIssue(issueData.issue_key, issueData);
    return <div style={{ height: 700, position: 'relative' }}><CatalystViewBusinessRequestV3 isOpen={true} onClose={fn()} itemId={issueData.issue_key} projectKey="MDT" fullPageMode /></div>;
  },
};
