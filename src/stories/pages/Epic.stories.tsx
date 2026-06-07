/**
 * Epic detail view — renders the ACTUAL CatalystViewEpic.
 * Cache seeded SYNCHRONOUSLY before component mounts.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import CatalystViewEpic from '@/components/catalyst-detail-views/epic/CatalystViewEpic';
import { seedForIssue } from '../fixtures/storyQueryClient';
import { ISSUES } from '../fixtures/production-data';

const issueData = {
  ...ISSUES.epic,
  id: 'ph-epic-001',
  project_key: 'BAU',
  description_adf: null,
  deleted_at: null,
  sprint_release: null,
  assignee_account_id: 'u-nada',
  reporter_account_id: 'u-nada',
  due_date: '2026-09-30',
};

const meta: Meta = {
  title: 'Pages/Epic',
  parameters: { layout: 'fullscreen' },
};
export default meta;

export const PanelMode: StoryObj = {
  render: () => {
    seedForIssue(issueData.issue_key, issueData);
    return (
      <div style={{ height: 700, position: 'relative' }}>
        <CatalystViewEpic
          isOpen={true} onClose={fn()}
          itemId={issueData.issue_key} projectKey="BAU" panelMode
        />
      </div>
    );
  },
};

export const FullPage: StoryObj = {
  render: () => {
    seedForIssue(issueData.issue_key, issueData);
    return (
      <div style={{ height: 700, position: 'relative' }}>
        <CatalystViewEpic
          isOpen={true} onClose={fn()}
          itemId={issueData.issue_key} projectKey="BAU" fullPageMode
        />
      </div>
    );
  },
};
