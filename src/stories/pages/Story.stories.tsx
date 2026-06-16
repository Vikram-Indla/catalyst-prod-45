/**
 * Story detail view — renders the ACTUAL CatalystViewStory.
 * Cache seeded SYNCHRONOUSLY before component mounts.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import React from 'react';
import CatalystViewStory from '@/components/catalyst-detail-views/story/CatalystViewStory';
import { seedForIssue } from '../fixtures/storyQueryClient';
import { ConsumerCard } from '../fixtures/ConsumerCard';
import { ISSUES } from '../fixtures/production-data';

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
          { file: 'CatalystDetailRouter.tsx', surface: 'Universal detail router' },
          { file: 'BacklogPage.atlaskit.tsx', surface: 'Backlog list → Story panel' },
          { file: 'UWVTable.tsx', surface: 'AllWork list → Story panel' },
          { file: 'KanbanBoardPage.tsx', surface: 'Kanban card → Story modal' },
          { file: 'GlobalSearchPanel.tsx', surface: 'Search → Story detail' },
          { file: 'ForYouRow.tsx', surface: 'For You → Story detail' },
          { file: 'NotificationPanel.tsx', surface: 'Notification → Story detail' },
        ]}
        ads={{ package: 'CatalystViewBase (internal)', token: 'Composes all sections' }}
        risk="critical"
        notes="Core detail view — 8+ surfaces. Removing breaks issue viewing across the entire app."
      />
    </div>
  ),
};

export const PanelMode: StoryObj = {
  render: () => {
    seedForIssue(issueData.issue_key, issueData);
    return (
      <div style={{ height: 700, position: 'relative' }}>
        <CatalystViewStory
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
        <CatalystViewStory
          isOpen={true} onClose={fn()}
          itemId={issueData.issue_key} projectKey="BAU" fullPageMode
        />
      </div>
    );
  },
};
