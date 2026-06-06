/**
 * Epic detail view — renders the ACTUAL CatalystViewEpic production component.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import CatalystViewEpic from '@/components/catalyst-detail-views/epic/CatalystViewEpic';
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

function Seed({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  useEffect(() => {
    qc.setQueryData(['cv-issue-detail', issueData.issue_key], issueData);
    qc.setQueryData(['cv-watchers', issueData.issue_key], []);
    qc.setQueryData(['cv-activity', issueData.issue_key], []);
    qc.setQueryData(['cv-comments', issueData.issue_key], []);
    qc.setQueryData(['subtasks', issueData.issue_key], []);
  }, [qc]);
  return <>{children}</>;
}

const meta: Meta = {
  title: 'Pages/Epic',
  parameters: { layout: 'fullscreen' },
};
export default meta;

export const PanelMode: StoryObj = {
  render: () => (
    <Seed>
      <div style={{ height: 700, position: 'relative' }}>
        <CatalystViewEpic
          isOpen={true} onClose={fn()}
          itemId={issueData.issue_key} projectKey="BAU" panelMode
        />
      </div>
    </Seed>
  ),
};

export const FullPage: StoryObj = {
  render: () => (
    <Seed>
      <div style={{ height: 700, position: 'relative' }}>
        <CatalystViewEpic
          isOpen={true} onClose={fn()}
          itemId={issueData.issue_key} projectKey="BAU" fullPageMode
        />
      </div>
    </Seed>
  ),
};
