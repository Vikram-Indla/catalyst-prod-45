/**
 * Story detail view — renders the ACTUAL CatalystViewStory production component.
 * Pre-seeds QueryClient cache so useCatalystIssue resolves without Supabase.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import CatalystViewStory from '@/components/catalyst-detail-views/story/CatalystViewStory';
import { ISSUES } from '../fixtures/production-data';
import { ConsumerCard } from '../fixtures/ConsumerCard';

const issueData = {
  ...ISSUES.story,
  id: 'ph-story-001',
  project_key: 'BAU',
  description_adf: null,
  deleted_at: null,
  sprint_release: null,
  assignee_account_id: 'u-habib',
  reporter_account_id: 'u-ali',
};

function Seed({ issueKey, children }: { issueKey: string; children: React.ReactNode }) {
  const qc = useQueryClient();
  useEffect(() => {
    qc.setQueryData(['cv-issue-detail', issueKey], issueData);
    qc.setQueryData(['cv-watchers', issueKey], []);
    qc.setQueryData(['cv-activity', issueKey], []);
    qc.setQueryData(['cv-comments', issueKey], []);
    qc.setQueryData(['subtasks', issueKey], []);
  }, [qc, issueKey]);
  return <>{children}</>;
}

const meta: Meta = {
  title: 'Pages/Story',
  parameters: { layout: 'fullscreen' },
};
export default meta;

export const Registry: StoryObj = {
  name: 'Component Registry',
  render: () => (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <ConsumerCard
        component="CatalystViewStory"
        source="src/components/catalyst-detail-views/story/CatalystViewStory.tsx"
        consumers={[
          { file: 'CatalystDetailRouter.tsx', surface: 'Universal detail router — opens Story when issue_type=Story' },
          { file: 'BacklogPage.atlaskit.tsx', surface: 'Backlog list → click row → Story panel' },
          { file: 'UWVTable.tsx', surface: 'AllWork list → click row → Story panel' },
          { file: 'KanbanBoardPage.tsx', surface: 'Kanban card click → Story modal' },
          { file: 'ProjectAllWorkView.tsx', surface: 'Project AllWork → click row → Story panel' },
          { file: 'GlobalSearchPanel.tsx', surface: 'Search result click → Story detail' },
          { file: 'ForYouRow.tsx', surface: 'For You feed → click row → Story detail' },
          { file: 'NotificationPanel.tsx', surface: 'Notification click → Story detail' },
        ]}
        ads={{ package: 'CatalystViewBase (internal)', token: 'Composes: CatalystKeyDetails + CatalystSidebarDetails + Description + SubtasksPanel + LinkedWorkItems + Attachments + Activity' }}
        risk="critical"
        notes="Core detail view component — mounted on every surface that opens a Story work item. Removing this breaks issue viewing across the entire app. Used by 8+ surfaces."
      />
    </div>
  ),
};

export const PanelMode: StoryObj = {
  render: () => (
    <Seed issueKey={issueData.issue_key}>
      <div style={{ height: 700, position: 'relative' }}>
        <CatalystViewStory
          isOpen={true}
          onClose={fn()}
          itemId={issueData.issue_key}
          projectKey="BAU"
          panelMode
        />
      </div>
    </Seed>
  ),
};

export const FullPage: StoryObj = {
  render: () => (
    <Seed issueKey={issueData.issue_key}>
      <div style={{ height: 700, position: 'relative' }}>
        <CatalystViewStory
          isOpen={true}
          onClose={fn()}
          itemId={issueData.issue_key}
          projectKey="BAU"
          fullPageMode
        />
      </div>
    </Seed>
  ),
};
